import os
import json
from typing import Dict, Any, Tuple, List
import redis
from redisgraph import Graph, Node, Edge
from fastapi import HTTPException

# Configuration from environment variables
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
REDISGRAPH_GRAPH_NAME = os.getenv("REDISGRAPH_GRAPH_NAME", "sivg_graph")

redis_conn = None
redis_graph = None  # This will be a redisgraph.Graph object

async def init_db_connection():
    global redis_conn, redis_graph
    try:
        print(f"DEBUG: backend/app/crud.py - redis-py version: {redis.__version__}")
        redis_conn = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            password=REDIS_PASSWORD,
            decode_responses=True  # Changed to True for better compatibility
        )
        redis_conn.ping()
        print(f"Successfully connected to Redis at {REDIS_HOST}:{REDIS_PORT}")

        # Initialize RedisGraph using the redisgraph-py library
        redis_graph = Graph(REDISGRAPH_GRAPH_NAME, redis_conn)
        print(f"RedisGraph object initialized successfully for graph: {REDISGRAPH_GRAPH_NAME}")

    except redis.exceptions.ConnectionError as e:
        print(f"Failed to connect to Redis: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Could not connect to Redis: {e}"
        )
    except Exception as e:
        print(f"Failed to initialize RedisGraph object: {e}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(
            status_code=503,
            detail=f"Could not initialize RedisGraph: {e}"
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
        result = redis_graph.query(query)  # Removed await as redisgraph-py is synchronous
    except Exception as e:
        print(f"Error querying graph data: {e}")
        return [], []
        
    processed_nodes = {}
    processed_edges = []

    if result and result.result_set:
        for row in result.result_set:
            n, r, m = row
            
            # Process source node
            if n and n.id not in processed_nodes:
                node_props = {k: v for k, v in n.properties.items()}
                node_label = n.labels[0] if n.labels else "Unknown"
                processed_nodes[n.id] = {
                    "id": str(n.id),
                    "type": node_label,
                    "data": node_props
                }
            
            # Process target node
            if m and m.id not in processed_nodes:
                node_props = {k: v for k, v in m.properties.items()}
                node_label = m.labels[0] if m.labels else "Unknown"
                processed_nodes[m.id] = {
                    "id": str(m.id),
                    "type": node_label,
                    "data": node_props
                }
            
            # Process edge
            if r:
                edge = {
                    "id": f"edge_{r.source_node.id}_{r.dest_node.id}",
                    "source": str(r.source_node.id),
                    "target": str(r.dest_node.id),
                    "label": r.relation,
                    "data": r.properties,
                    "style": {
                        'stroke': 'var(--edge-default-color)',
                        'strokeWidth': 2
                    },
                    "markerEnd": {
                        'type': 'arrowclosed',
                        'color': 'var(--edge-default-color)'
                    }
                }
                if not any(e['id'] == edge['id'] for e in processed_edges):
                    processed_edges.append(edge)
    
    return list(processed_nodes.values()), processed_edges

async def get_node_properties(node_id: str) -> Dict:
    if not redis_graph:
        raise HTTPException(status_code=503, detail="Database not connected")

    query = "MATCH (n) WHERE id(n) = $id RETURN n"
    try:
        result = redis_graph.query(query, {'id': int(node_id)})  # Removed await
    except Exception as e:
        print(f"Error fetching node properties for {node_id}: {e}")
        return None

    if result and result.result_set and result.result_set[0]:
        node = result.result_set[0][0]
        return {
            "properties": node.properties,
            "labels": node.labels
        }
    return None
