import os
import json
from typing import Dict, Any, Tuple, List
import redis
from fastapi import HTTPException

# Configuration from environment variables
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
REDISGRAPH_GRAPH_NAME = os.getenv("REDISGRAPH_GRAPH_NAME", "sivg_graph")

redis_conn = None
redis_graph = None  # This will be a redis.graph.Graph object

async def init_db_connection():
    global redis_conn, redis_graph
    try:
        print(f"DEBUG: backend/app/crud.py - redis-py version: {redis.__version__}")
        redis_conn = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            password=REDIS_PASSWORD,
            decode_responses=False  # Important for RedisGraph to work correctly with redis-py
        )
        redis_conn.ping()
        print(f"Successfully connected to Redis at {REDIS_HOST}:{REDIS_PORT}")

        if hasattr(redis_conn, 'graph'):
            redis_graph = redis_conn.graph(REDISGRAPH_GRAPH_NAME)
            print(f"RedisGraph object obtained successfully for graph: {REDISGRAPH_GRAPH_NAME}")
        else:
            print(f"ERROR: 'redis.Redis' object does NOT have attribute 'graph'. Available attributes: {dir(redis_conn)}")
            raise AttributeError(f"'Redis' object (version {redis.__version__}) has no attribute 'graph'")

    except redis.exceptions.ConnectionError as e:
        print(f"Failed to connect to Redis: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Could not connect to Redis: {e}"
        )
    except AttributeError as ae:
        print(f"AttributeError during RedisGraph client initialization: {ae}")
        raise HTTPException(
            status_code=503,
            detail=f"Could not initialize RedisGraph client (AttributeError): {ae}"
        )
    except Exception as e:
        print(f"Failed to initialize RedisGraph object (General Exception): {e}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=503,
            detail=f"Could not initialize RedisGraph (General Exception): {e}"
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
        # With redis-py, query result is a QueryResult object
        result = await redis_graph.query(query)
    except Exception as e:
        print(f"Error querying graph data: {e}")
        return [], []
        
    processed_nodes = {}
    processed_edges = []

    # result_set in redis-py is a list of lists
    if result and result.result_set:
        for row_data in result.result_set:
            # row_data is a list where each element is a node or relationship
            # Example: [redisgraph.Node, redisgraph.Edge, redisgraph.Node]
            # Or [redisgraph.Node, None, None] if no outgoing relationships
            
            n_rg_node, r_rg_rel, m_rg_node = None, None, None
            
            if len(row_data) > 0 and row_data[0] is not None:
                n_rg_node = row_data[0]  # This is a redisgraph.Node object
            if len(row_data) > 1 and row_data[1] is not None:
                r_rg_rel = row_data[1]  # This is a redisgraph.Edge object
            if len(row_data) > 2 and row_data[2] is not None:
                m_rg_node = row_data[2]  # This is a redisgraph.Node object

            nodes_in_row = []
            if n_rg_node: nodes_in_row.append(n_rg_node)
            if m_rg_node: nodes_in_row.append(m_rg_node)

            for rg_node_obj in nodes_in_row:
                # Properties in redis-py are already decoded if decode_responses=True in Redis()
                # but we keep it False for RedisGraph, so decode here
                node_frontend_id = rg_node_obj.properties.get(b'frontend_id', str(rg_node_obj.id).encode()).decode('utf-8')
                
                if node_frontend_id not in processed_nodes:
                    node_properties_decoded = {}
                    for k_bytes, v_val in rg_node_obj.properties.items():
                        k_str = k_bytes.decode('utf-8')
                        # v_val can be bytes, int, float, bool
                        if isinstance(v_val, bytes):
                            v_decoded = v_val.decode('utf-8')
                            if k_str == 'rawJsonData':
                                try:
                                    v_decoded = json.loads(v_decoded)
                                except json.JSONDecodeError:
                                    pass  # Keep as string if not valid JSON
                            node_properties_decoded[k_str] = v_decoded
                        else:
                            node_properties_decoded[k_str] = v_val
                    
                    rf_data_payload = {
                        k: v for k, v in node_properties_decoded.items()
                        if k != 'frontend_id' 
                    }
                    
                    # Labels in redis-py are a list of strings
                    node_label = rg_node_obj.labels[0] if rg_node_obj.labels else "Unknown"

                    processed_nodes[node_frontend_id] = {
                        "id": node_frontend_id,
                        "type": node_label,
                        "data": rf_data_payload,
                    }
            
            if r_rg_rel:
                # Get frontend_ids of source and target nodes from the relationship
                source_node_internal_id = r_rg_rel.source_id
                target_node_internal_id = r_rg_rel.dest_id

                source_frontend_id = None
                target_frontend_id = None

                # Look in already processed nodes (more efficient)
                for fid, node_info in processed_nodes.items():
                    # We can't directly compare internal ID with frontend_id
                    # We need a way to map internal ID to frontend_id if not in props
                    # For now, we assume source and target nodes are already in processed_nodes
                    # and their frontend_ids are known
                    pass

                # If not found, make a query (less efficient)
                if not source_frontend_id:
                    source_node_q_result = await redis_graph.query(f"MATCH (s) WHERE id(s) = {source_node_internal_id} RETURN s.frontend_id")
                    if source_node_q_result.result_set and source_node_q_result.result_set[0][0]:
                        source_frontend_id = source_node_q_result.result_set[0][0].decode('utf-8')
                
                if not target_frontend_id:
                    target_node_q_result = await redis_graph.query(f"MATCH (t) WHERE id(t) = {target_node_internal_id} RETURN t.frontend_id")
                    if target_node_q_result.result_set and target_node_q_result.result_set[0][0]:
                        target_frontend_id = target_node_q_result.result_set[0][0].decode('utf-8')

                if source_frontend_id and target_frontend_id:
                    edge_frontend_id_prop = r_rg_rel.properties.get(b'frontend_id')
                    edge_frontend_id = (
                        edge_frontend_id_prop.decode('utf-8')
                        if edge_frontend_id_prop
                        else f"edge_{source_frontend_id}_{target_frontend_id}_{r_rg_rel.id}"
                    )

                    edge_properties_decoded = {}
                    for k_bytes, v_val in r_rg_rel.properties.items():
                        k_str = k_bytes.decode('utf-8')
                        edge_properties_decoded[k_str] = (
                            v_val.decode('utf-8')
                            if isinstance(v_val, bytes)
                            else v_val
                        )
                    
                    rf_edge_data_payload = {
                        k: v for k, v in edge_properties_decoded.items()
                        if k != 'frontend_id'
                    }

                    edge_struct = {
                        "id": edge_frontend_id,
                        "source": source_frontend_id,
                        "target": target_frontend_id,
                        "label": r_rg_rel.relation,  # Already string with redis-py
                        "data": rf_edge_data_payload if rf_edge_data_payload else None,
                        "style": {
                            'stroke': 'var(--edge-default-color)',
                            'strokeWidth': 2
                        },
                        "markerEnd": {
                            'type': 'arrowclosed',  # React Flow uses 'arrowclosed'
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
        return None  # Return None instead of raising exception here

    if result and result.result_set and result.result_set[0] and result.result_set[0][0]:
        rg_node_obj = result.result_set[0][0]  # This is a redisgraph.Node object
        
        properties_decoded = {}
        for k_bytes, v_val in rg_node_obj.properties.items():
            k_str = k_bytes.decode('utf-8')
            v_decoded = v_val.decode('utf-8') if isinstance(v_val, bytes) else v_val
            if k_str == 'rawJsonData' and isinstance(v_decoded, str):
                try:
                    v_decoded = json.loads(v_decoded)
                except json.JSONDecodeError:
                    pass  # Keep as string if not valid JSON
            properties_decoded[k_str] = v_decoded
        
        return {
            "properties": properties_decoded,
            "labels": rg_node_obj.labels  # Already a list of strings with redis-py
        }
    return None
