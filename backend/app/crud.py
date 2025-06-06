import os
import json
from typing import Dict, Any, Tuple, List
import redis
from redisgraph import Graph, Node as RGNode, Edge as RGEdge
from fastapi import HTTPException

# Configuration from environment variables
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)  # Add if your Redis needs auth
REDISGRAPH_GRAPH_NAME = os.getenv("REDISGRAPH_GRAPH_NAME", "sivg_graph")

redis_conn = None
redis_graph = None

async def init_db_connection():
    global redis_conn, redis_graph
    try:
        redis_conn = redis.Redis(
            host=REDIS_HOST, 
            port=REDIS_PORT, 
            password=REDIS_PASSWORD, 
            decode_responses=False
        )
        redis_conn.ping()  # Verify connection
        print(f"Successfully connected to Redis at {REDIS_HOST}:{REDIS_PORT}")
        redis_graph = Graph(REDISGRAPH_GRAPH_NAME, redis_conn)
    except redis.exceptions.ConnectionError as e:
        print(f"Failed to connect to Redis: {e}")
        raise HTTPException(
            status_code=503, 
            detail=f"Could not connect to Redis: {e}"
        )

async def close_db_connection():
    global redis_conn
    if redis_conn:
        redis_conn.close()
        print("Redis connection closed.")

async def create_indices_if_needed():
    if not redis_graph:
        print("RedisGraph not initialized. Skipping index creation.")
        return

    expected_labels = ["person", "company", "UnknownNode"]  # From ReactFlow node types
    for label in expected_labels:
        if not label or not label.strip():
            continue
        try:
            # Index creation is idempotent in recent RedisGraph versions
            await redis_graph.query(f"CREATE INDEX FOR (n:{label}) ON (n.frontend_id)")
            print(f"Ensured index exists for :{label}(frontend_id)")
        except redis.exceptions.ResponseError as e:
            if any(msg in str(e).lower() for msg in ["already created", "already exists", "index already exists"]):
                print(f"Index on :{label}(frontend_id) already exists.")
            else:
                print(f"Could not create or verify index for :{label}(frontend_id). Error: {e}")
        except Exception as e:
            print(f"Unexpected error creating index for :{label}(frontend_id): {e}")

async def process_and_store_json(data: Dict[str, Any], mode: str = "overwrite"):
    if not redis_graph:
        raise HTTPException(status_code=503, detail="Database not connected")

    if mode == "overwrite":
        try:
            await redis_graph.query("MATCH (n) DETACH DELETE n")
            print("Graph cleared for overwrite.")
        except redis.exceptions.ResponseError as e:
            print(f"Note: Could not delete graph contents (may be empty): {e}")
    
    # Process nodes
    if "nodes" in data and isinstance(data["nodes"], list):
        for node_data in data["nodes"]:
            node_frontend_id = node_data.get("id")
            label = node_data.get("type", "UnknownNode")
            if not label or not label.strip():
                label = "UnknownNode"

            props_from_rf = node_data.get("data", {})
            
            cypher_props = {'frontend_id': node_frontend_id}
            if isinstance(props_from_rf, dict):
                for key, value in props_from_rf.items():
                    if isinstance(value, (str, int, float, bool)):
                        cypher_props[key] = value
                    elif key == 'rawJsonData' and value is not None:
                        try:
                            cypher_props['rawJsonData'] = json.dumps(value)
                        except (TypeError, ValueError):
                            cypher_props['rawJsonData'] = "{}"
            
            query = f"CREATE (n:{label} $props)"
            try:
                await redis_graph.query(query, {'props': cypher_props})
            except Exception as e:
                print(f"Error creating node {node_frontend_id} ({label}): {e}")

    # Process edges
    if "edges" in data and isinstance(data["edges"], list):
        for edge_data in data["edges"]:
            source_frontend_id = edge_data.get("source")
            target_frontend_id = edge_data.get("target")
            relation_type = edge_data.get("label", "RELATED_TO")
            if not relation_type or not relation_type.strip():
                relation_type = "RELATED_TO"
            
            # Sanitize relation_type for Cypher
            sanitized_relation_type = "".join(c if c.isalnum() else "_" for c in str(relation_type))
            if not sanitized_relation_type or sanitized_relation_type[0].isdigit():
                sanitized_relation_type = f"REL_{sanitized_relation_type}"
            if not sanitized_relation_type:
                sanitized_relation_type = "RELATED_TO"

            # Edge properties
            edge_props_from_rf = edge_data.get("data", {})
            cypher_edge_props = {}
            if isinstance(edge_props_from_rf, dict):
                for key, value in edge_props_from_rf.items():
                    if isinstance(value, (str, int, float, bool)):
                        cypher_edge_props[key] = value
            
            if cypher_edge_props:
                query = f"""
                MATCH (a {{frontend_id: $source_id}}), (b {{frontend_id: $target_id}})
                CREATE (a)-[r:{sanitized_relation_type} $props]->(b)
                """
                params = {
                    'source_id': source_frontend_id,
                    'target_id': target_frontend_id,
                    'props': cypher_edge_props
                }
            else:
                query = f"""
                MATCH (a {{frontend_id: $source_id}}), (b {{frontend_id: $target_id}})
                CREATE (a)-[:{sanitized_relation_type}]->(b)
                """
                params = {
                    'source_id': source_frontend_id,
                    'target_id': target_frontend_id
                }
            
            try:
                await redis_graph.query(query, params)
            except Exception as e:
                print(f"Error creating edge from {source_frontend_id} to {target_frontend_id}: {e}")

async def get_all_graph_data() -> Tuple[List[Dict], List[Dict]]:
    if not redis_graph:
        print("Warning: get_all_graph_data called but DB not connected. Returning empty.")
        return [], []

    query = "MATCH (n) OPTIONAL MATCH (n)-[r]->(m) RETURN n, r, m"
    try:
        result = await redis_graph.query(query)
    except Exception as e:
        print(f"Error querying graph data: {e}")
        return [], []
        
    processed_nodes = {}
    processed_edges = []

    if result and result.result_set:
        for row in result.result_set:
            n_rg_node, r_rg_rel, m_rg_node = None, None, None
            
            if len(row) > 0 and row[0] is not None:
                n_rg_node = row[0]
            if len(row) > 1 and row[1] is not None:
                r_rg_rel = row[1]
            if len(row) > 2 and row[2] is not None:
                m_rg_node = row[2]

            nodes_in_row = []
            if n_rg_node:
                nodes_in_row.append(n_rg_node)
            if m_rg_node:
                nodes_in_row.append(m_rg_node)

            for rg_node_obj in nodes_in_row:
                node_frontend_id = rg_node_obj.properties.get(
                    b'frontend_id',
                    str(rg_node_obj.id).encode()
                ).decode('utf-8')
                
                if node_frontend_id not in processed_nodes:
                    node_properties_decoded = {}
                    for k_bytes, v_bytes in rg_node_obj.properties.items():
                        k_str = k_bytes.decode('utf-8')
                        if isinstance(v_bytes, bytes):
                            v_str = v_bytes.decode('utf-8')
                            if k_str == 'rawJsonData':
                                try:
                                    v_str = json.loads(v_str)
                                except json.JSONDecodeError:
                                    pass
                            node_properties_decoded[k_str] = v_str
                        else:
                            node_properties_decoded[k_str] = v_bytes
                    
                    rf_data_payload = {
                        k: v for k, v in node_properties_decoded.items()
                        if k != 'frontend_id'
                    }

                    processed_nodes[node_frontend_id] = {
                        "id": node_frontend_id,
                        "type": rg_node_obj.label.decode('utf-8') if rg_node_obj.label else "Unknown",
                        "data": rf_data_payload,
                    }
            
            if r_rg_rel:
                source_node_query = await redis_graph.query(
                    f"MATCH (s) WHERE id(s) = {r_rg_rel.source_id} RETURN s.frontend_id"
                )
                target_node_query = await redis_graph.query(
                    f"MATCH (t) WHERE id(t) = {r_rg_rel.dest_id} RETURN t.frontend_id"
                )

                source_frontend_id = None
                if source_node_query.result_set and source_node_query.result_set[0][0]:
                    source_frontend_id = source_node_query.result_set[0][0].decode('utf-8')
                
                target_frontend_id = None
                if target_node_query.result_set and target_node_query.result_set[0][0]:
                    target_frontend_id = target_node_query.result_set[0][0].decode('utf-8')

                if source_frontend_id and target_frontend_id:
                    edge_frontend_id_prop = r_rg_rel.properties.get(b'frontend_id')
                    edge_frontend_id = (
                        edge_frontend_id_prop.decode('utf-8')
                        if edge_frontend_id_prop
                        else f"edge_{source_frontend_id}_{target_frontend_id}_{r_rg_rel.id}"
                    )

                    edge_properties_decoded = {}
                    for k_bytes, v_bytes in r_rg_rel.properties.items():
                        k_str = k_bytes.decode('utf-8')
                        edge_properties_decoded[k_str] = (
                            v_bytes.decode('utf-8')
                            if isinstance(v_bytes, bytes)
                            else v_bytes
                        )
                    
                    rf_edge_data_payload = {
                        k: v for k, v in edge_properties_decoded.items()
                        if k != 'frontend_id'
                    }

                    edge_struct = {
                        "id": edge_frontend_id,
                        "source": source_frontend_id,
                        "target": target_frontend_id,
                        "label": r_rg_rel.relation.decode('utf-8'),
                        "data": rf_edge_data_payload if rf_edge_data_payload else None,
                        "style": {
                            'stroke': 'var(--edge-default-color)',
                            'strokeWidth': 2
                        },
                        "markerEnd": {
                            'type': 'arrowclosed',
                            'color': 'var(--edge-default-color)'
                        }
                    }
                    if not any(e['id'] == edge_frontend_id for e in processed_edges):
                        processed_edges.append(edge_struct)
    
    return list(processed_nodes.values()), processed_edges

async def get_node_properties(node_frontend_id: str) -> Dict:
    if not redis_graph:
        raise HTTPException(status_code=503, detail="Database not connected")

    query = "MATCH (n {frontend_id: $fid}) RETURN n"
    try:
        result = await redis_graph.query(query, {'fid': node_frontend_id})
    except Exception as e:
        print(f"Error fetching node properties for {node_frontend_id}: {e}")
        return None

    if result and result.result_set and result.result_set[0] and result.result_set[0][0]:
        rg_node_obj = result.result_set[0][0]
        
        properties_decoded = {}
        for k_bytes, v_bytes in rg_node_obj.properties.items():
            k_str = k_bytes.decode('utf-8')
            v_val = v_bytes.decode('utf-8') if isinstance(v_bytes, bytes) else v_bytes
            if k_str == 'rawJsonData' and isinstance(v_val, str):
                try:
                    v_val = json.loads(v_val)
                except json.JSONDecodeError:
                    pass
            properties_decoded[k_str] = v_val
        
        return {
            "properties": properties_decoded,
            "labels": [rg_node_obj.label.decode('utf-8') if rg_node_obj.label else "Unknown"]
        }
    return None
