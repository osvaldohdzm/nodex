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
            host=REDIS_HOST, # Usar la variable global del módulo
            port=REDIS_PORT,   # Usar la variable global del módulo
            password=REDIS_PASSWORD, # Usar la variable global del módulo
            decode_responses=True
        )
        redis_conn.ping()
        print(f"Successfully connected to Redis at {REDIS_HOST}:{REDIS_PORT}")

        redis_graph = Graph(REDISGRAPH_GRAPH_NAME, redis_conn) # Usar la variable global del módulo
        print(f"RedisGraph object initialized successfully for graph: {REDISGRAPH_GRAPH_NAME}")

    except redis.exceptions.ConnectionError as e:
        print(f"Failed to connect to Redis: {e}")
        print(f"Connection attempt params: Host={REDIS_HOST}, Port={REDIS_PORT}")
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

    print(f"process_and_store_json: mode={mode}, data keys={list(data.keys())}")

    if mode == "overwrite":
        try:
            redis_graph.query("MATCH (n) DETACH DELETE n")
            print("Graph cleared for overwrite.")
        except redis.exceptions.ResponseError as e:
            print(f"Note: Could not delete graph contents (may be empty): {e}")
    
    nodes_to_create = data.get("nodes", [])
    edges_to_create = data.get("edges", [])

    print(f"process_and_store_json: Found {len(nodes_to_create)} nodes and {len(edges_to_create)} edges in payload.")

    if isinstance(nodes_to_create, list):
        for node_data_from_frontend in nodes_to_create:
            node_frontend_id = node_data_from_frontend.get("id")
            label = node_data_from_frontend.get("type", "UnknownNode")
            if not label or not label.strip(): label = "UnknownNode"
            
            # El objeto 'position' del frontend no debe ir directamente a las propiedades del nodo en DB
            # Se usa para la visualización en React Flow. Si se quiere persistir, guardar x, y por separado.
            position_from_frontend = node_data_from_frontend.get("position", {}) 

            props_from_frontend_data_field = node_data_from_frontend.get("data", {})
            if not isinstance(props_from_frontend_data_field, dict):
                props_from_frontend_data_field = {}

            cypher_props = {'frontend_id': node_frontend_id}
            
            # Añadir x e y si existen en el objeto position del nodo del frontend
            if isinstance(position_from_frontend, dict):
                if 'x' in position_from_frontend and isinstance(position_from_frontend['x'], (int, float)):
                    cypher_props['x'] = position_from_frontend['x']
                if 'y' in position_from_frontend and isinstance(position_from_frontend['y'], (int, float)):
                    cypher_props['y'] = position_from_frontend['y']
            
            # Iterar sobre las propiedades de 'data' del nodo del frontend
            for key, value in props_from_frontend_data_field.items():
                if key == 'onImageUpload': # EXCLUIR FUNCIONES
                    continue
                
                # Skip null values and empty strings
                if value is None or (isinstance(value, str) and not value.strip()):
                    continue

                # Lista blanca de propiedades permitidas y cómo tratarlas
                if key in ['name', 'typeDetails', 'status', 'title', 'location', 'icon', 'imageUrl']:
                    if isinstance(value, (str, int, float, bool)):
                        # Convert empty strings to None to avoid RedisGraph issues
                        if isinstance(value, str) and not value.strip():
                            continue
                        cypher_props[key] = value
                elif key in ['rawJsonData', 'details']: # Estos se serializan a JSON
                    try:
                        # Skip if value is None or empty
                        if value is None or (isinstance(value, (dict, list)) and not value):
                            continue
                        # Ensure we're only storing simple types that can be JSON serialized
                        if isinstance(value, (str, int, float, bool, dict, list)):
                            cypher_props[key] = json.dumps(value)
                    except (TypeError, ValueError) as json_err:
                        print(f"Warning: Could not serialize property '{key}' for node {node_frontend_id}: {json_err}")
                        continue
                # Ignorar otras propiedades no listadas explícitamente
                else:
                    print(f"Warning: Property '{key}' for node {node_frontend_id} is not explicitly handled. Skipping.")


            query = f"CREATE (n:{label} $props)"
            try:
                print(f"Attempting to create node: {label} with props: {cypher_props}")
                redis_graph.query(query, {'props': cypher_props})
                print(f"Successfully created node: {node_frontend_id}")
            except Exception as e:
                print(f"CRITICAL ERROR creating node {node_frontend_id} ({label}): {e}\nProps sent: {cypher_props}\n{traceback.format_exc()}")

    # ... (Lógica de aristas sin cambios significativos, ya que suelen tener propiedades simples)
    if isinstance(edges_to_create, list):
        for edge_data in edges_to_create:
            source_frontend_id = edge_data.get("source")
            target_frontend_id = edge_data.get("target")
            relation_type = edge_data.get("label", "RELATED_TO")
            if not relation_type or not relation_type.strip(): relation_type = "RELATED_TO"
            
            sanitized_relation_type = "".join(c if c.isalnum() else "_" for c in str(relation_type)).upper()
            if not sanitized_relation_type or sanitized_relation_type[0].isdigit():
                sanitized_relation_type = f"REL_{sanitized_relation_type}"
            if not sanitized_relation_type: sanitized_relation_type = "RELATED_TO"

            edge_props_from_rf = edge_data.get("data", {})
            if not isinstance(edge_props_from_rf, dict): edge_props_from_rf = {}
            
            cypher_edge_props = {}
            for key, value in edge_props_from_rf.items():
                if isinstance(value, (str, int, float, bool)):
                    cypher_edge_props[key] = value
            
            query_params = {'source_id': source_frontend_id, 'target_id': target_frontend_id}
            props_cypher_string = ""
            if cypher_edge_props:
                props_list = []
                for k, v_prop in cypher_edge_props.items():
                    param_name = f"edge_prop_{k}"
                    props_list.append(f"{k}: ${param_name}")
                    query_params[param_name] = v_prop
                props_cypher_string = "{" + ", ".join(props_list) + "}"

            query = f"""
            MATCH (a {{frontend_id: $source_id}}), (b {{frontend_id: $target_id}})
            CREATE (a)-[r:{sanitized_relation_type} {props_cypher_string}]->(b)
            RETURN id(r)
            """
            try:
                print(f"Creating edge: {source_frontend_id} -[{sanitized_relation_type} {props_cypher_string}]-> {target_frontend_id} with params: {query_params}")
                redis_graph.query(query, query_params)
            except Exception as e:
                print(f"Error creating edge from {source_frontend_id} to {target_frontend_id}: {e}\n{traceback.format_exc()}")


async def get_all_graph_data() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    if not redis_graph:
        print("Warning: get_all_graph_data called but DB not connected. Returning empty.")
        return [], []

    nodes_query = "MATCH (n) RETURN id(n) AS internal_id, labels(n) AS labels, properties(n) AS props"
    edges_query = "MATCH (n)-[r]->(m) RETURN id(n) AS source_internal_id, id(m) AS target_internal_id, type(r) AS type, properties(r) AS props, id(r) as rel_id"
    
    processed_nodes_dict: Dict[str, Dict[str, Any]] = {} 
    frontend_nodes: List[Dict[str, Any]] = []
    frontend_edges: List[Dict[str, Any]] = []

    try:
        nodes_result = redis_graph.query(nodes_query)
        if nodes_result and nodes_result.result_set:
            for row_data in nodes_result.result_set:
                internal_id, labels, props_from_db = row_data # Renombrar props
                
                # Copiar props para no modificar el original directamente
                current_node_data_props = dict(props_from_db)

                # Extraer y eliminar 'x' e 'y' para el objeto 'position'
                pos_x = current_node_data_props.pop("x", 0.0) # Valor por defecto si no existe
                pos_y = current_node_data_props.pop("y", 0.0) # Valor por defecto si no existe
                
                # Asegurar que x e y sean flotantes
                try:
                    pos_x = float(pos_x)
                except (ValueError, TypeError):
                    pos_x = 0.0
                try:
                    pos_y = float(pos_y)
                except (ValueError, TypeError):
                    pos_y = 0.0

                node_position = {"x": pos_x, "y": pos_y}

                # Deserializar campos JSON si existen y son strings
                for json_key in ['rawJsonData', 'details']:
                    if json_key in current_node_data_props and isinstance(current_node_data_props[json_key], str):
                        try:
                            current_node_data_props[json_key] = json.loads(current_node_data_props[json_key])
                        except json.JSONDecodeError:
                            print(f"Warning: Could not parse JSON for key '{json_key}' in node {props_from_db.get('frontend_id')}")
                            # Mantener como string si falla el parseo, o asignar {} o None según prefieras
                
                node_for_frontend = {
                    "id": props_from_db.get("frontend_id", str(internal_id)), 
                    "type": labels[0] if labels else "UnknownNode",
                    "position": node_position,
                    "data": current_node_data_props # El resto de las propiedades van a data
                }
                processed_nodes_dict[str(internal_id)] = node_for_frontend

        edges_result = redis_graph.query(edges_query)
        if edges_result and edges_result.result_set:
            for row_data in edges_result.result_set:
                source_internal_id, target_internal_id, rel_type, props, rel_id = row_data
                
                source_node_info = processed_nodes_dict.get(str(source_internal_id))
                target_node_info = processed_nodes_dict.get(str(target_internal_id))

                if source_node_info and target_node_info:
                    frontend_edges.append({
                        "id": f"edge_{rel_id}_{source_node_info['id']}_{target_node_info['id']}",
                        "source": source_node_info["id"], 
                        "target": target_node_info["id"], 
                        "label": rel_type,
                        "data": props,
                        "style": {'stroke': 'var(--edge-default-color)', 'strokeWidth': 1.5},
                        "markerEnd": {'type': 'arrowclosed', 'color': 'var(--edge-default-color)'}
                    })
        
        frontend_nodes = list(processed_nodes_dict.values())
        print(f"get_all_graph_data: Devolviendo {len(frontend_nodes)} nodos y {len(frontend_edges)} aristas.")

    except Exception as e:
        print(f"Error querying graph data: {e}\n{traceback.format_exc()}")
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