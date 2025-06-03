from neo4j import AsyncGraphDatabase
import os
from typing import Dict, Any, Tuple, List

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

driver = None

def init_db_connection():
    global driver
    driver = AsyncGraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def close_db_connection():
    if driver:
        driver.close()

async def process_and_store_json(data: Dict[str, Any]):
    async with driver.session() as session:
        # Implementar lógica para procesar y almacenar datos JSON en Neo4j
        pass

async def get_all_graph_data() -> Tuple[List[Dict], List[Dict]]:
    async with driver.session() as session:
        result = await session.run("""
            MATCH (n)
            OPTIONAL MATCH (n)-[r]->(m)
            RETURN n, r, m
        """)
        
        nodes_dict = {}
        relationships_list = []

        async for record in result:
            node_n = record["n"]
            if node_n:
                node_id = node_n.element_id
                if node_id not in nodes_dict:
                    props = dict(node_n.items())
                    label = list(node_n.labels)[0] if node_n.labels else "Unknown"
                    nodes_dict[node_id] = {
                        "id": node_id,
                        "label": props.get("nombreCompleto", node_id),
                        "group": label,
                        "properties": props
                    }

            rel = record["r"]
            if rel:
                relationships_list.append({
                    "id": rel.element_id,
                    "from": rel.start_node.element_id,
                    "to": rel.end_node.element_id,
                    "label": rel.type,
                    "properties": dict(rel.items())
                })
        
        return list(nodes_dict.values()), relationships_list

async def get_node_properties(node_element_id: str) -> Dict:
    async with driver.session() as session:
        query = """
        MATCH (n) WHERE elementId(n) = $node_element_id
        RETURN properties(n) as props, labels(n) as labels
        """
        result = await session.run(query, node_element_id=node_element_id)
        record = await result.single()
        if record:
            return {"properties": record["props"], "labels": record["labels"]}
        return None
