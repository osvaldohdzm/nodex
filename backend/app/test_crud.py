import asyncio
import unittest
from unittest.mock import MagicMock, patch, call
import os

# Set environment variables for RedisGraph name before importing crud
# This ensures that the global variable REDISGRAPH_GRAPH_NAME in crud.py is set when imported
os.environ["REDISGRAPH_GRAPH_NAME"] = "test_graph"

from backend.app.crud import (
    process_and_store_json,
    get_all_graph_data,
    init_db_connection, # We will mock its behavior, not call it directly for db
    close_db_connection, # Same as above
    # to_cypher_literal is also used by process_and_store_json
)

# Mock return values for redisgraph query results
class MockRedisGraphResult:
    def __init__(self, result_set=None, nodes_created=0, relationships_created=0, labels_added=0, properties_set=0, nodes_deleted=0, relationships_deleted=0):
        self.result_set = result_set if result_set is not None else []
        self.nodes_created = nodes_created
        self.relationships_created = relationships_created
        self.labels_added = labels_added
        self.properties_set = properties_set
        self.nodes_deleted = nodes_deleted
        self.relationships_deleted = relationships_deleted

class MockRedisGraphNode:
    def __init__(self, node_id, label, properties):
        self.id = node_id
        self.label = label
        self.properties = properties

@patch('backend.app.crud.REDISGRAPH_GRAPH_NAME', 'test_graph') # Ensure graph name is consistent
@patch('backend.app.crud.redis_conn', new_callable=MagicMock) # Mock redis_conn
@patch('backend.app.crud.redis_graph', new_callable=MagicMock) # Mock redis_graph globally for all tests in this class
class TestCrudOperations(unittest.TestCase):

    def setUp(self):
        # Mocks are injected by decorators directly into test methods.
        # self.mock_redis_graph and self.mock_redis_conn will be the MagicMock instances passed to the test methods.
        pass

    async def test_process_and_store_json_with_relations(self, mock_redis_graph, mock_redis_conn, mock_graph_name_unused):
        """
        Tests process_and_store_json with nodes and edges, ensuring correct Cypher queries are generated.
        """
        # Default behavior for query, can be overridden with side_effect in specific tests
        mock_redis_graph.query.return_value = MockRedisGraphResult()

        sample_data = {
            "nodes": [
                {"id": "node1", "type": "Person", "position": {"x":10, "y":20}, "data": {"name": "Alice", "age": 30}},
                {"id": "node2", "type": "Company", "position": {"x":30, "y":40}, "data": {"name": "AcmeCorp"}}
            ],
            "edges": [
                {"source": "node1", "target": "node2", "label": "WORKS_AT"}
            ]
        }

        await process_and_store_json(sample_data, mode="overwrite")

        # Expected calls:
        # 1. redis_graph.delete() (due to mode="overwrite")
        # 2. CREATE INDEX for person (frontend_id)
        # 3. CREATE INDEX for company (frontend_id)
        # 4. CREATE INDEX for UnknownNode (frontend_id)
        # 5. CREATE node1 (Person)
        # 6. CREATE node2 (Company)
        # 7. CREATE edge (node1)-[:WORKS_AT]->(node2)

        mock_redis_graph.delete.assert_called_once()

        expected_query_calls = [
            call("CREATE INDEX FOR (n:person) ON (n.frontend_id)"),
            call("CREATE INDEX FOR (n:company) ON (n.frontend_id)"),
            call("CREATE INDEX FOR (n:UnknownNode) ON (n.frontend_id)"),
            # Node creation queries are f-string based, check essential parts.
            # Order of properties in f-string might vary, so we check call by call or use more flexible matching.
            # For simplicity, we'll check the calls sequentially as they are implemented.
            call('CREATE (n:Person {frontend_id: "node1", x: 10, y: 20, name: "Alice", age: 30})'),
            call('CREATE (n:Company {frontend_id: "node2", x: 30, y: 40, name: "AcmeCorp"})'),
            # Edge creation query is parameterized
            call(
                "MATCH (a {frontend_id: $source_id}), (b {frontend_id: $target_id}) CREATE (a)-[r:WORKS_AT]->(b)",
                {'source_id': 'node1', 'target_id': 'node2'}
            )
        ]

        # Check if all expected calls are present, regardless of order for index calls initially
        # For node and edge calls, the order should be preserved relative to each other.

        # Get actual calls made to the mock
        actual_calls = mock_redis_graph.query.mock_calls

        # Check for index creation calls (order might vary or some might be skipped if "already exists")
        # For this test, we assume they are always attempted.
        self.assertIn(expected_query_calls[0], actual_calls)
        self.assertIn(expected_query_calls[1], actual_calls)
        self.assertIn(expected_query_calls[2], actual_calls)

        # Check for node and edge creation calls in specific order
        # Find the first node creation call
        first_node_call_index = -1
        for i, actual_call in enumerate(actual_calls):
            if actual_call == expected_query_calls[3]:
                first_node_call_index = i
                break
        self.assertNotEqual(first_node_call_index, -1, "First node creation call not found")

        self.assertEqual(actual_calls[first_node_call_index], expected_query_calls[3])
        self.assertEqual(actual_calls[first_node_call_index+1], expected_query_calls[4])
        self.assertEqual(actual_calls[first_node_call_index+2], expected_query_calls[5])


    async def test_get_all_graph_data_retrieves_edges(self, mock_redis_graph, mock_redis_conn, mock_graph_name_unused):
        """
        Tests get_all_graph_data to ensure it correctly processes and returns nodes and edges
        based on mocked RedisGraph query results.
        """
        # --- Mocking query results ---
        mock_node1_props = {"frontend_id": "node1", "name": "Alice", "age": "30", "x": "10.5", "y": "20.0"}
        mock_node2_props = {"frontend_id": "node2", "name": "Bob", "x": "5.0", "y": "15.5"} # age is missing, type Company

        mock_nodes_query_result = MockRedisGraphResult(result_set=[
            [MockRedisGraphNode(node_id=1, label="Person", properties=mock_node1_props)],
            [MockRedisGraphNode(node_id=2, label="Company", properties=mock_node2_props)],
        ])

        mock_edges_query_result = MockRedisGraphResult(result_set=[
            ("node1", "node2", "FRIENDS_WITH", 101) # source, target, label, rel_id
        ])

        # Configure side_effect for redis_graph.query
        def query_side_effect(query_string, params=None):
            if "MATCH (n) RETURN n" in query_string:
                return mock_nodes_query_result
            elif "MATCH (s)-[r]->(t) RETURN" in query_string:
                return mock_edges_query_result
            return MockRedisGraphResult() # Default for other queries like index creation

        mock_redis_graph.query.side_effect = query_side_effect

        # --- Call the function ---
        nodes, edges = await get_all_graph_data()

        # --- Assertions ---
        self.assertEqual(len(nodes), 2)
        self.assertEqual(len(edges), 1)

        # Node 1 assertions
        self.assertEqual(nodes[0]["id"], "node1")
        self.assertEqual(nodes[0]["type"], "Person")
        self.assertEqual(nodes[0]["position"], {"x": 10.5, "y": 20.0}) # Note: from_redis_value converts string numbers
        self.assertEqual(nodes[0]["data"], {"name": "Alice", "age": 30}) # Note: from_redis_value converts string "30" to int

        # Node 2 assertions
        self.assertEqual(nodes[1]["id"], "node2")
        self.assertEqual(nodes[1]["type"], "Company")
        self.assertEqual(nodes[1]["position"], {"x": 5.0, "y": 15.5})
        self.assertEqual(nodes[1]["data"], {"name": "Bob"}) # No age, so not present

        # Edge 1 assertions
        self.assertEqual(edges[0]["id"], "edge-101")
        self.assertEqual(edges[0]["source"], "node1")
        self.assertEqual(edges[0]["target"], "node2")
        self.assertEqual(edges[0]["label"], "FRIENDS_WITH")
        self.assertEqual(edges[0]["type"], "smoothstep") # Default from crud.py
        self.assertIn("markerEnd", edges[0])

        # Verify query calls
        expected_node_query = call("MATCH (n) RETURN n")
        expected_edge_query = call("MATCH (s)-[r]->(t) RETURN s.frontend_id AS source, t.frontend_id AS target, type(r) AS label, id(r) as rel_id")

        mock_redis_graph.query.assert_any_call("MATCH (n) RETURN n")
        mock_redis_graph.query.assert_any_call("MATCH (s)-[r]->(t) RETURN s.frontend_id AS source, t.frontend_id AS target, type(r) AS label, id(r) as rel_id")


if __name__ == '__main__':
    # This allows running the tests directly with `python backend/app/test_crud.py`
    # In Python 3.8+ unittest TestLoader can discover and run async tests.
    unittest.main()
