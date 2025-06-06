# backend/app/crud.py
import os
import json
from typing import Dict, Any, Tuple, List
import redis
from redisgraph import Graph
from fastapi import HTTPException
import traceback

# (Variables globales se mantienen igual)
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
REDISGRAPH_GRAPH_NAME = os.getenv("REDISGRAPH_GRAPH_NAME", "sivg_graph")

redis_conn = None
redis_graph = None

# (init_db_connection y close_db_connection se mantienen igual)
async def init_db_connection():
    global redis_conn, redis_graph
    try:
        print(f"DEBUG: backend/app/crud.py - redis-py version: {redis.__version__}")
        print(f"Attempting to connect to Redis: Host={REDIS_HOST}, Port={REDIS_PORT}")
        redis_conn = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, password=REDIS_PASSWORD, decode_responses=True)
        redis_conn.ping()
        print(f"Successfully connected to Redis at {REDIS_HOST}:{REDIS_PORT}")
        redis_graph = Graph(REDISGRAPH_GRAPH_NAME, redis_conn)
        print(f"RedisGraph object initialized successfully for graph: {REDISGRAPH_GRAPH_NAME}")
    except Exception as e:
        print(f"Failed to initialize Redis connection: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=503, detail=f"Could not initialize Redis: {e}")

async def close_db_connection():
    global redis_conn
    if redis_conn:
        redis_conn.close()
        print("Redis connection closed.")

async def create_indices_if_needed():
    if not redis_graph: return
    for label in ["person", "company", "UnknownNode"]:
        try:
            redis_graph.query(f"CREATE INDEX FOR (n:{label}) ON (n.frontend_id)")
            print(f"Ensured index exists for :{label}(frontend_id)")
        except redis.exceptions.ResponseError as e:
            if "already created" in str(e).lower() or "already exists" in str(e).lower():
                print(f"Index on :{label}(frontend_id) already exists.")
            else: raise e

# --- NUEVA FUNCIÓN CLAVE: Convertir a un literal de Cypher ---
def to_cypher_literal(value: Any) -> str:
    """Convierte un valor de Python a un literal de string para una consulta Cypher."""
    if value is None:
        return 'null'
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, (int, float)):
        return str(value)
    
    # Para todo lo demás (incluyendo dicts y lists), serializar a JSON y luego escapar para Cypher.
    if isinstance(value, (dict, list)):
        json_str = json.dumps(value)
    else:
        json_str = str(value)

    # Escapar comillas dobles y backslashes
    escaped_str = json_str.replace('\\', '\\\\').replace('"', '\\"')
    return f'"{escaped_str}"'


# --- FUNCIÓN DE ALMACENAMIENTO TOTALMENTE REESCRITA ---
async def process_and_store_json(data: Dict[str, Any], mode: str = "overwrite"):
    if not redis_graph:
        raise HTTPException(status_code=503, detail="Database not connected")

    print(f"--- Iniciando process_and_store_json | Modo: {mode} ---")

    if mode == "overwrite":
        try:
            redis_graph.delete()
            print("INFO: Grafo anterior borrado para modo 'overwrite'.")
            await create_indices_if_needed()
        except redis.exceptions.ResponseError as e:
            print(f"AVISO: No se pudo borrar el grafo (probablemente estaba vacío): {e}")

    nodes_to_create = data.get("nodes", [])
    print(f"INFO: Se procesarán {len(nodes_to_create)} nodos.")

    for node_data in nodes_to_create:
        try:
            frontend_id = node_data.get("id")
            label = node_data.get("type", "UnknownNode")
            position = node_data.get("position", {})
            props_data = node_data.get("data", {})

            if not all([frontend_id, label, isinstance(props_data, dict)]):
                print(f"ERROR: Saltando nodo inválido: {node_data}")
                continue

            # Construir la lista de propiedades como strings de Cypher
            prop_strings = [f'frontend_id: {to_cypher_literal(frontend_id)}']
            if isinstance(position, dict):
                prop_strings.append(f'x: {to_cypher_literal(position.get("x", 0.0))}')
                prop_strings.append(f'y: {to_cypher_literal(position.get("y", 0.0))}')
            
            for key, value in props_data.items():
                if value is None or (isinstance(value, str) and not value.strip()):
                    continue
                # Asegurarse que la clave es válida para Cypher
                sanitized_key = "".join(c for c in key if c.isalnum() or c == '_')
                if sanitized_key:
                    prop_strings.append(f'{sanitized_key}: {to_cypher_literal(value)}')
            
            # Unir todas las propiedades en un solo string
            props_cypher_string = ", ".join(prop_strings)
            
            # Construir la consulta final como un f-string
            query = f"CREATE (n:{label} {{{props_cypher_string}}})"
            
            print(f" -> Creando nodo: Label='{label}', ID='{frontend_id}'")
            # Ejecutar la consulta sin parámetros, ya que todo está "hardcodeado" en el string
            redis_graph.query(query)
        
        except Exception as e:
            print(f"ERROR CRÍTICO irrecuperable al procesar el nodo {node_data.get('id')}: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Error al escribir en la base de datos para el nodo {node_data.get('id')}: {e}")

    print("--- Finalizado process_and_store_json ---")


# --- FUNCIÓN DE LECTURA (MODIFICADA PARA SER MÁS ROBUSTA) ---
def from_redis_value(value: str) -> Any:
    """Intenta convertir un string de Redis de vuelta a su tipo original."""
    if not isinstance(value, str):
        return value # Si ya es un número o bool, devolverlo
    
    # 1. Intentar deserializar JSON (lo más común para datos complejos)
    if value.startswith(('{', '[')):
        try: return json.loads(value)
        except json.JSONDecodeError: pass
    
    # 2. Intentar convertir a booleano
    if value.lower() == 'true': return True
    if value.lower() == 'false': return False
    
    # 3. Intentar convertir a número (primero a int, luego a float si falla)
    try: return int(value)
    except (ValueError, TypeError): pass
    try: return float(value)
    except (ValueError, TypeError): pass

    # 4. Si todo falla, devolver el string original
    return value

async def get_all_graph_data() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    if not redis_graph: return [], []

    try:
        nodes_result = redis_graph.query("MATCH (n) RETURN n")
        edges_result = redis_graph.query("MATCH (s)-[r]->(t) RETURN s.frontend_id AS source, t.frontend_id AS target, type(r) AS label, id(r) as rel_id")

        frontend_nodes = []
        if nodes_result:
            for record in nodes_result.result_set:
                node = record[0]
                # Aplicar la conversión a cada propiedad
                props = {k: from_redis_value(v) for k, v in node.properties.items()}

                if 'frontend_id' not in props: continue

                data_for_frontend = {k: v for k, v in props.items() if k not in ['x', 'y', 'frontend_id']}
                
                frontend_nodes.append({
                    "id": props['frontend_id'],
                    "type": node.label,
                    "position": {"x": props.get('x', 0.0), "y": props.get('y', 0.0)},
                    "data": data_for_frontend
                })

        frontend_edges = []
        if edges_result:
            for source, target, label, rel_id in edges_result.result_set:
                frontend_edges.append({
                    "id": f"edge-{rel_id}", "source": source, "target": target, "label": label,
                    "type": "smoothstep", "markerEnd": {"type": "arrowclosed"}
                })
        
        print(f"get_all_graph_data: Devolviendo {len(frontend_nodes)} nodos y {len(frontend_edges)} aristas.")
        return frontend_nodes, frontend_edges

    except Exception as e:
        print(f"ERROR CRÍTICO al consultar datos del grafo: {e}")
        traceback.print_exc()
        return [], []

# --- NUEVA FUNCIÓN PARA ELIMINAR UN NODO ---
async def delete_node_by_id(node_id: str):
    """Elimina un nodo y sus relaciones por su frontend_id."""
    if not redis_graph:
        raise HTTPException(status_code=503, detail="Database not connected")
    
    try:
        # Usar DETACH DELETE para eliminar el nodo y todas las relaciones asociadas
        query = "MATCH (n {frontend_id: $node_id}) DETACH DELETE n"
        result = redis_graph.query(query, {'node_id': node_id})
        
        nodes_deleted = result.nodes_deleted
        print(f"INFO: delete_node_by_id('{node_id}') -> {nodes_deleted} nodo(s) eliminado(s).")
        
        if nodes_deleted == 0:
            # Esto no es necesariamente un error, podría haber sido eliminado por otro proceso.
            # Devolvemos False para indicar que no se encontró nada que borrar.
            return False
        return True
        
    except Exception as e:
        print(f"ERROR CRÍTICO al eliminar el nodo {node_id}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al eliminar el nodo de la base de datos: {e}")