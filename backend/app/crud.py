# backend/app/crud.py
import os
import json
from typing import Dict, Any, Tuple, List
import redis
from redisgraph import Graph
from fastapi import HTTPException
import traceback

# NO definas REDIS_HOST, etc., aquí a nivel de módulo si vas a leerlas dentro de la función.
# Si las dejas aquí, asegúrate de que el problema de scope no exista en tu entorno de ejecución.
# Para mayor seguridad, las leeremos dentro de init_db_connection.

redis_conn = None
redis_graph = None

async def init_db_connection():
    global redis_conn, redis_graph
    try:
        # LEER VARIABLES DE ENTORNO AQUÍ
        REDIS_HOST_VAL = os.getenv("REDIS_HOST", "localhost")
        REDIS_PORT_VAL = int(os.getenv("REDIS_PORT", 6379))
        REDIS_PASSWORD_VAL = os.getenv("REDIS_PASSWORD", None) # Puede ser None si no hay contraseña
        REDISGRAPH_GRAPH_NAME_VAL = os.getenv("REDISGRAPH_GRAPH_NAME", "sivg_graph")

        print(f"DEBUG: backend/app/crud.py - redis-py version: {redis.__version__}")
        print(f"Attempting to connect to Redis: Host={REDIS_HOST_VAL}, Port={REDIS_PORT_VAL}")

        redis_conn = redis.Redis(
            host=REDIS_HOST_VAL,
            port=REDIS_PORT_VAL,
            password=REDIS_PASSWORD_VAL, # Pasa None si no hay contraseña
            decode_responses=True
        )
        redis_conn.ping()
        print(f"Successfully connected to Redis at {REDIS_HOST_VAL}:{REDIS_PORT_VAL}")

        redis_graph = Graph(REDISGRAPH_GRAPH_NAME_VAL, redis_conn)
        print(f"RedisGraph object initialized successfully for graph: {REDISGRAPH_GRAPH_NAME_VAL}")

    except redis.exceptions.ConnectionError as e:
        print(f"Failed to connect to Redis: {e}")
        # Imprime las variables que se intentaron usar para la conexión para depuración
        print(f"Connection attempt params: Host={os.getenv('REDIS_HOST')}, Port={os.getenv('REDIS_PORT')}")
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
    expected_labels = ["person", "company", "UnknownNode"] # Asegúrate que coincidan con tus tipos de nodo
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

    ALLOWED_NODE_PROPERTIES_SERIALIZE_AS_JSON = ['rawJsonData', 'details']

    if isinstance(nodes_to_create, list):
        for node_data_from_frontend in nodes_to_create:
            node_frontend_id = node_data_from_frontend.get("id")
            label = node_data_from_frontend.get("type", "UnknownNode")
            if not label or not label.strip(): label = "UnknownNode"
            
            props_from_frontend_data_field = node_data_from_frontend.get("data", {})
            if not isinstance(props_from_frontend_data_field, dict):
                props_from_frontend_data_field = {}

            cypher_props = {'frontend_id': node_frontend_id}
            
            for key, value in props_from_frontend_data_field.items():
                if key == 'onImageUpload': # Excluir funciones
                    continue
                
                if value is None: # No guardar propiedades None
                    continue

                if isinstance(value, (str, int, float, bool)):
                    cypher_props[key] = value
                elif key in ALLOWED_NODE_PROPERTIES_SERIALIZE_AS_JSON:
                    try:
                        cypher_props[key] = json.dumps(value)
                    except (TypeError, ValueError) as json_err:
                        print(f"Warning: Could not serialize property '{key}' for node {node_frontend_id}: {json_err}")
                elif isinstance(value, (dict, list)): # Otros objetos/listas se serializan
                    try:
                        cypher_props[key] = json.dumps(value)
                    except (TypeError, ValueError):
                        print(f"Warning: Could not serialize complex property '{key}' for node {node_frontend_id}")
                # else: # Opcional: loguear tipos no manejados
                    # print(f"Warning: Property '{key}' for node {node_frontend_id} has unhandled type {type(value)}. Skipping.")

            query = f"CREATE (n:{label} $props)"
            try:
                print(f"Attempting to create node: {label} with props: {cypher_props}")
                redis_graph.query(query, {'props': cypher_props})
                print(f"Successfully created node: {node_frontend_id}")
            except Exception as e:
                print(f"CRITICAL ERROR creating node {node_frontend_id} ({label}): {e}\nProps sent: {cypher_props}\n{traceback.format_exc()}")

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
                    param_name = f"edge_prop_{k}" # Crear un nombre de parámetro único
                    props_list.append(f"{k}: ${param_name}")
                    query_params[param_name] = v_prop # Añadir al diccionario de parámetros
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
                internal_id, labels, props = row_data
                
                parsed_data_props = {}
                node_position = {"x": 0.0, "y": 0.0} # Posición por defecto

                for key, value in props.items():
                    if key == 'position' and isinstance(value, str): # 'position' podría venir serializada
                        try:
                            pos_dict = json.loads(value)
                            node_position["x"] = float(pos_dict.get("x", 0))
                            node_position["y"] = float(pos_dict.get("y", 0))
                        except (json.JSONDecodeError, TypeError, ValueError):
                            print(f"Warning: Could not parse position for node {props.get('frontend_id')}")
                    elif key in ['rawJsonData', 'details'] and isinstance(value, str):
                        try:
                            parsed_data_props[key] = json.loads(value)
                        except json.JSONDecodeError:
                            parsed_data_props[key] = value 
                    elif isinstance(value, str): # Otros strings que podrían ser JSON
                        try:
                            if (value.startswith('{') and value.endswith('}')) or \
                               (value.startswith('[') and value.endswith(']')):
                                parsed_data_props[key] = json.loads(value)
                            else:
                                parsed_data_props[key] = value
                        except json.JSONDecodeError:
                            parsed_data_props[key] = value
                    else:
                        parsed_data_props[key] = value
                
                # Asegurar que las propiedades base de DemoNodeData estén presentes
                final_data_props: DemoNodeData = {
                    "name": parsed_data_props.get("name", "Sin Nombre"),
                    "typeDetails": parsed_data_props.get("typeDetails", "Sin Detalles"),
                    "status": parsed_data_props.get("status", "normal"),
                    "rawJsonData": parsed_data_props.get("rawJsonData", {}),
                    "title": parsed_data_props.get("title"),
                    "icon": parsed_data_props.get("icon"),
                    "details": parsed_data_props.get("details"),
                    "location": parsed_data_props.get("location"),
                    "imageUrl": parsed_data_props.get("imageUrl"),
                    # onImageUpload no se guarda ni se recupera del backend
                }


                node_for_frontend = {
                    "id": props.get("frontend_id", str(internal_id)), 
                    "type": labels[0] if labels else "UnknownNode",
                    "position": node_position,
                    "data": final_data_props 
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
    # Asumimos que node_id es frontend_id
    query = "MATCH (n {frontend_id: $node_id}) RETURN properties(n) as props, labels(n) as labels"
    try:
        result = redis_graph.query(query, {'node_id': node_id}) 
    except Exception as e:
        print(f"Error fetching node properties for frontend_id {node_id}: {e}")
        return None # Devolver None en lugar de generar una excepción aquí
    
    record = result.result_set[0] if result and result.result_set else None
    if record:
        props, labels = record
        # Deserializar rawJsonData y details si es necesario
        if 'rawJsonData' in props and isinstance(props['rawJsonData'], str):
            try: props['rawJsonData'] = json.loads(props['rawJsonData'])
            except: pass # Mantener como string si falla
        if 'details' in props and isinstance(props['details'], str):
            try: props['details'] = json.loads(props['details'])
            except: pass # Mantener como string si falla
        return {"properties": props, "labels": labels}
    return None