# backend/app/crud.py
import os
import json
from typing import Dict, Any, Tuple, List
import redis
from redisgraph import Graph
from fastapi import HTTPException
import traceback

# ... (configuración igual) ...

redis_conn = None
redis_graph = None

async def init_db_connection():
    global redis_conn, redis_graph
    try:
        print(f"DEBUG: backend/app/crud.py - redis-py version: {redis.__version__}")
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
            
            props_from_frontend_data_field = node_data_from_frontend.get("data", {})
            if not isinstance(props_from_frontend_data_field, dict):
                props_from_frontend_data_field = {}

            # Propiedades que SÍ queremos guardar en RedisGraph
            # Lista blanca de propiedades permitidas y su tipo esperado o cómo serializarlas
            allowed_props_map = {
                "name": str,
                "typeDetails": str,
                "status": str,
                "title": str,
                "location": str,
                "icon": str,
                "imageUrl": str,
                "rawJsonData": "json_string", # Indicador para serializar a JSON
                "details": "json_string",     # Indicador para serializar a JSON
                # Añade aquí otras propiedades de DemoNodeData que quieras guardar
                # y que sean serializables (string, int, float, bool, o serializables a JSON string)
            }

            cypher_props = {'frontend_id': node_frontend_id}
            
            for key, value in props_from_frontend_data_field.items():
                if key in allowed_props_map:
                    expected_type = allowed_props_map[key]
                    if expected_type == "json_string":
                        if value is not None:
                            try:
                                cypher_props[key] = json.dumps(value)
                            except (TypeError, ValueError) as json_err:
                                print(f"Warning: Could not serialize property '{key}' for node {node_frontend_id}: {json_err}")
                                cypher_props[key] = "{}" if isinstance(value, dict) else "[]" if isinstance(value, list) else "null"
                    elif isinstance(value, (str, int, float, bool)):
                        cypher_props[key] = value
                    # else: # Opcional: loguear si un valor no es de tipo primitivo y no es json_string
                        # print(f"Warning: Property '{key}' for node {node_frontend_id} has unhandled type {type(value)}. Skipping.")
                # else: # Opcional: loguear propiedades no esperadas
                    # print(f"Warning: Property '{key}' for node {node_frontend_id} is not in allowed_props_map. Skipping.")


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
            relation_type = edge_data.get("label", "RELATED_TO") # ReactFlow usa 'label' para el tipo de relación
            if not relation_type or not relation_type.strip(): relation_type = "RELATED_TO"
            
            sanitized_relation_type = "".join(c if c.isalnum() else "_" for c in str(relation_type)).upper()
            if not sanitized_relation_type or sanitized_relation_type[0].isdigit():
                sanitized_relation_type = f"REL_{sanitized_relation_type}"
            if not sanitized_relation_type: sanitized_relation_type = "RELATED_TO"

            edge_props_from_rf = edge_data.get("data", {}) # ReactFlow puede tener 'data' en aristas
            if not isinstance(edge_props_from_rf, dict): edge_props_from_rf = {}
            
            cypher_edge_props = {}
            for key, value in edge_props_from_rf.items():
                if isinstance(value, (str, int, float, bool)):
                    cypher_edge_props[key] = value
            
            query_params = {'source_id': source_frontend_id, 'target_id': target_frontend_id}
            props_cypher_string = ""
            if cypher_edge_props:
                props_list = []
                for k, v_prop in cypher_edge_props.items(): # Renombrar v a v_prop para evitar conflicto
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

# ... (get_all_graph_data y get_node_properties sin cambios respecto a la versión anterior que te di)
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
            for row_data in nodes_result.result_set: # Renombrar 'row' para evitar conflicto
                internal_id, labels, props = row_data
                
                parsed_props = {}
                for key, value in props.items():
                    if key == 'rawJsonData' or key == 'details': # Intentar deserializar estos campos
                        if isinstance(value, str):
                            try:
                                parsed_props[key] = json.loads(value)
                            except json.JSONDecodeError:
                                parsed_props[key] = value 
                        else:
                            parsed_props[key] = value 
                    elif isinstance(value, str):
                        try:
                            if (value.startswith('{') and value.endswith('}')) or \
                               (value.startswith('[') and value.endswith(']')):
                                parsed_props[key] = json.loads(value)
                            else:
                                parsed_props[key] = value
                        except json.JSONDecodeError:
                            parsed_props[key] = value
                    else:
                        parsed_props[key] = value
                
                # Extraer posición si existe, si no, usar valores por defecto o aleatorios
                position = {"x": parsed_props.pop("x", float(0)), "y": parsed_props.pop("y", float(0))}
                # Si 'x' o 'y' no son números después de pop, asignar un valor por defecto
                if not isinstance(position["x"], (int, float)):
                    position["x"] = float(0) # O un valor aleatorio
                if not isinstance(position["y"], (int, float)):
                    position["y"] = float(0) # O un valor aleatorio


                node_for_frontend = {
                    "id": props.get("frontend_id", str(internal_id)), 
                    "type": labels[0] if labels else "UnknownNode",
                    "position": position,
                    "data": parsed_props 
                }
                processed_nodes_dict[str(internal_id)] = node_for_frontend

        edges_result = redis_graph.query(edges_query)
        if edges_result and edges_result.result_set:
            for row_data in edges_result.result_set: # Renombrar 'row'
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
    # ... (sin cambios)
    if not redis_graph:
        raise HTTPException(status_code=503, detail="Database not connected")
    query = "MATCH (n) WHERE id(n) = $id RETURN n"
    try:
        result = redis_graph.query(query, {'id': int(node_id)}) 
    except Exception as e:
        print(f"Error fetching node properties for {node_id}: {e}")
        return None
    if result and result.result_set and result.result_set[0]:
        node = result.result_set[0][0]
        return {"properties": node.properties, "labels": node.labels}
    return None