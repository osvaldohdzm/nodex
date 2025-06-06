# backend/app/crud.py
import os
import json
from typing import Dict, Any, Tuple, List
import redis
from redisgraph import Graph
from fastapi import HTTPException
import traceback

# Variables de entorno leídas al inicio del módulo
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
REDISGRAPH_GRAPH_NAME = os.getenv("REDISGRAPH_GRAPH_NAME", "sivg_graph")

redis_conn = None
redis_graph = None

async def init_db_connection():
    global redis_conn, redis_graph
    try:
        print(f"DEBUG: backend/app/crud.py - redis-py version: {redis.__version__}")
        print(f"Attempting to connect to Redis: Host={REDIS_HOST}, Port={REDIS_PORT}")

        redis_conn = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            password=REDIS_PASSWORD,
            decode_responses=True
        )
        redis_conn.ping()
        print(f"Successfully connected to Redis at {REDIS_HOST}:{REDIS_PORT}")

        redis_graph = Graph(REDISGRAPH_GRAPH_NAME, redis_conn)
        print(f"RedisGraph object initialized successfully for graph: {REDISGRAPH_GRAPH_NAME}")

    except redis.exceptions.ConnectionError as e:
        print(f"Failed to connect to Redis: {e}")
        print(f"Connection attempt params: Host={REDIS_HOST}, Port={REDIS_PORT}") # Loguear variables usadas
        raise HTTPException(status_code=503, detail=f"Could not connect to Redis: {e}")
    except Exception as e:
        print(f"Failed to initialize RedisGraph object: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=503, detail=f"Could not initialize RedisGraph: {e}")

async def close_db_connection():
    global redis_conn
    if redis_conn:
        redis_conn.close()
        print("Redis connection closed.")

async def create_indices_if_needed():
    if not redis_graph:
        print("RedisGraph not initialized. Skipping index creation.")
        return
    expected_labels = ["person", "company", "UnknownNode"]
    for label in expected_labels:
        if not label or not label.strip(): continue
        try:
            redis_graph.query(f"CREATE INDEX FOR (n:{label}) ON (n.frontend_id)")
            print(f"Ensured index exists for :{label}(frontend_id)")
        except redis.exceptions.ResponseError as e:
            if any(msg in str(e).lower() for msg in ["already created", "already exists", "index already exists"]):
                print(f"Index on :{label}(frontend_id) already exists.")
            else:
                print(f"Could not create/verify index for :{label}(frontend_id). Error: {e}")
        except Exception as e:
            print(f"Unexpected error creating index for :{label}(frontend_id): {e}")

async def process_and_store_json(data: Dict[str, Any], mode: str = "overwrite"):
    if not redis_graph:
        raise HTTPException(status_code=503, detail="Database not connected")

    print(f"--- Iniciando process_and_store_json | Modo: {mode} ---")

    if mode == "overwrite":
        try:
            # Usamos DEL para borrar el grafo, es más efectivo que DELETE n
            redis_graph.delete()
            print("INFO: Grafo anterior borrado para modo 'overwrite'.")
            # Volvemos a crear los índices ya que el grafo fue borrado
            await create_indices_if_needed()
        except redis.exceptions.ResponseError as e:
            print(f"AVISO: No se pudo borrar el grafo (probablemente estaba vacío): {e}")

    nodes_to_create = data.get("nodes", [])
    edges_to_create = data.get("edges", [])

    print(f"INFO: Se procesarán {len(nodes_to_create)} nodos y {len(edges_to_create)} aristas.")

    # --- LÓGICA DE NODOS MEJORADA ---
    for node_data in nodes_to_create:
        frontend_id = node_data.get("id")
        label = node_data.get("type", "UnknownNode")
        if not label or not isinstance(label, str) or not label.strip():
            label = "UnknownNode"
        
        position = node_data.get("position", {})
        props_data = node_data.get("data", {})

        if not frontend_id or not isinstance(props_data, dict):
            print(f"ERROR: Saltando nodo inválido (sin ID o 'data' no es un dict): {node_data}")
            continue

        # Construir propiedades para Cypher de forma segura
        cypher_props = {'frontend_id': frontend_id}

        # Manejar posición
        if isinstance(position, dict):
            cypher_props['x'] = position.get('x', 0.0)
            cypher_props['y'] = position.get('y', 0.0)

        # Iterar sobre las propiedades del campo 'data' del frontend
        for key, value in props_data.items():
            if value is None:
                continue

            # Serializar objetos/listas a string JSON
            if isinstance(value, (dict, list)):
                try:
                    # No guardar objetos/listas vacías
                    if not value: continue
                    cypher_props[key] = json.dumps(value)
                except (TypeError, ValueError) as e:
                    print(f"AVISO: No se pudo serializar la propiedad '{key}' para el nodo {frontend_id}. Error: {e}. Saltando propiedad.")
            # Guardar tipos primitivos directamente
            elif isinstance(value, (str, int, float, bool)):
                 # No guardar strings vacíos
                if isinstance(value, str) and not value.strip(): continue
                cypher_props[key] = value

        query = f"CREATE (n:{label} $props)"
        try:
            print(f" -> Creando nodo: Label='{label}', ID='{frontend_id}'")
            redis_graph.query(query, {'props': cypher_props})
        except Exception as e:
            print(f"ERROR CRÍTICO al crear el nodo {frontend_id} ({label}): {e}")
            print(f"    Props problemáticas: {cypher_props}")
            # traceback.print_exc() # Descomentar para un debug más profundo

    # --- LÓGICA DE ARISTAS (sin cambios mayores, pero con mejor logging) ---
    for edge_data in edges_to_create:
        source_id = edge_data.get("source")
        target_id = edge_data.get("target")
        label = edge_data.get("label") or "RELATED_TO"
        
        # Sanitizar label para Cypher
        sanitized_label = "".join(c for c in label if c.isalnum() or c == '_').upper()
        if not sanitized_label or sanitized_label[0].isdigit():
            sanitized_label = f"REL_{sanitized_label}"

        if not source_id or not target_id:
            print(f"ERROR: Saltando arista inválida (source/target ID faltante): {edge_data}")
            continue

        query = """
        MATCH (a {frontend_id: $source_id}), (b {frontend_id: $target_id})
        CREATE (a)-[r:%s]->(b)
        """ % sanitized_label  # Usamos % para el label que no puede ser un parámetro

        try:
            print(f" -> Creando arista: ({source_id})-[{sanitized_label}]->({target_id})")
            redis_graph.query(query, {'source_id': source_id, 'target_id': target_id})
        except Exception as e:
            print(f"ERROR CRÍTICO al crear la arista de {source_id} a {target_id}: {e}")

    print("--- Finalizado process_and_store_json ---")


async def get_all_graph_data() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    if not redis_graph:
        print("AVISO: get_all_graph_data llamado pero la BD no está conectada. Devolviendo vacío.")
        return [], []

    nodes_query = "MATCH (n) RETURN n"
    edges_query = "MATCH (s)-[r]->(t) RETURN s.frontend_id AS source, t.frontend_id AS target, type(r) AS label, id(r) as rel_id"

    try:
        nodes_result = redis_graph.query(nodes_query)
        edges_result = redis_graph.query(edges_query)

        frontend_nodes = []
        if nodes_result and nodes_result.result_set:
            for row in nodes_result.result_set:
                node = row[0] # El objeto nodo completo
                props = node.properties

                if 'frontend_id' not in props:
                    continue

                # Prepara el objeto 'data' para el frontend
                data_for_frontend = {}
                for key, value in props.items():
                    if key in ['x', 'y', 'frontend_id']:
                        continue
                    # Intenta deserializar strings que parecen JSON
                    if isinstance(value, str) and value.startswith(('[', '{')):
                        try:
                            data_for_frontend[key] = json.loads(value)
                        except json.JSONDecodeError:
                            data_for_frontend[key] = value # Si falla, déjalo como string
                    else:
                        data_for_frontend[key] = value
                
                frontend_nodes.append({
                    "id": props['frontend_id'],
                    "type": node.label,
                    "position": {"x": float(props.get('x', 0)), "y": float(props.get('y', 0))},
                    "data": data_for_frontend
                })

        frontend_edges = []
        if edges_result and edges_result.result_set:
            for source_id, target_id, label, rel_id in edges_result.result_set:
                frontend_edges.append({
                    "id": f"edge-{rel_id}",
                    "source": source_id,
                    "target": target_id,
                    "label": label,
                    "type": "smoothstep",
                    "markerEnd": {"type": "arrowclosed", "color": "var(--edge-default-color)"},
                })
        
        print(f"get_all_graph_data: Devolviendo {len(frontend_nodes)} nodos y {len(frontend_edges)} aristas.")
        return frontend_nodes, frontend_edges

    except Exception as e:
        print(f"ERROR CRÍTICO al consultar datos del grafo: {e}")
        traceback.print_exc()
        return [], []
        
    return frontend_nodes, frontend_edges


async def get_node_properties(node_id: str) -> Dict:
    if not redis_graph:
        raise HTTPException(status_code=503, detail="Database not connected")
    query = "MATCH (n {frontend_id: $node_id}) RETURN properties(n) as props, labels(n) as labels"
    try:
        result = redis_graph.query(query, {'node_id': node_id}) 
    except Exception as e:
        print(f"Error fetching node properties for frontend_id {node_id}: {e}")
        return None
    
    record = result.result_set[0] if result and result.result_set else None
    if record:
        props, labels = record
        if 'rawJsonData' in props and isinstance(props['rawJsonData'], str):
            try: props['rawJsonData'] = json.loads(props['rawJsonData'])
            except: pass
        if 'details' in props and isinstance(props['details'], str):
            try: props['details'] = json.loads(props['details'])
            except: pass
        return {"properties": props, "labels": labels}
    return None