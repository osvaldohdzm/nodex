import ELK, { ElkNode, ElkExtendedEdge, LayoutOptions } from 'elkjs/lib/elk.bundled.js';
import { Node, Edge } from 'reactflow';
import { DemoNodeData } from '../types/graph';

const NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  person: { width: 160, height: 180 },
  company: { width: 192, height: 220 },
  jsonPrimitive: { width: 180, height: 70 },
  jsonObjectArray: { width: 192, height: 120 },
};
const DEFAULT_NODE_WIDTH = 180;
const DEFAULT_NODE_HEIGHT = 100;

const elk = new ELK();

const elkLayoutOptions: LayoutOptions = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.layered.spacing.nodeNode': '80',
  'elk.layered.spacing.edgeNodeBetweenLayers': '80',
  'elk.layered.cycleBreaking.strategy': 'GREEDY',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.padding': '[top=50,left=50,bottom=50,right=50]',
  'elk.zoomToFit': 'true',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.separateConnectedComponents': 'false',
};

const getNodeDimensions = (node: Node<DemoNodeData>): { width: number; height: number } => {
  if (node.type && NODE_DIMENSIONS[node.type]) {
    return NODE_DIMENSIONS[node.type];
  }
  if (node.id.startsWith('jsonGraphNode-')) {
    if (node.type === 'person') return NODE_DIMENSIONS.jsonPrimitive || { width: DEFAULT_NODE_WIDTH, height: 70 };
    if (node.type === 'company') return NODE_DIMENSIONS.jsonObjectArray || { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };
  }
  return { width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT };
};

export const getLayoutedElements = async (
  nodes: Node<DemoNodeData>[],
  edges: Edge[],
  options: LayoutOptions = elkLayoutOptions
): Promise<{ nodes: Node<DemoNodeData>[]; edges: Edge[] }> => {
  if (!nodes || nodes.length === 0) {
    return { nodes, edges };
  }

  const elkNodes: ElkNode[] = nodes.map((node) => {
    const dimensions = getNodeDimensions(node);
    return {
      id: node.id,
      width: dimensions.width,
      height: dimensions.height,
    };
  });

  const elkEdges: ElkExtendedEdge[] = edges.map((edge) => ({
    id: edge.id,
    sources: [edge.source],
    targets: [edge.target],
  }));

  const graphToLayout: ElkNode = {
    id: 'root',
    layoutOptions: options,
    children: elkNodes,
    edges: elkEdges,
  };

  try {
    const layoutedGraph = await elk.layout(graphToLayout);
    const newNodes = nodes.map((node) => {
      const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
      if (elkNode && typeof elkNode.x === 'number' && typeof elkNode.y === 'number') {
        return {
          ...node,
          position: { x: elkNode.x, y: elkNode.y },
        };
      }
      return node;
    });
    const newEdges = edges.map(edge => {
      // ELK puede proveer puntos de ruteo para las aristas, pero por ahora devolvemos la arista original
      return edge;
    });
    return { nodes: newNodes, edges: newEdges };
  } catch (e) {
    console.error('Error during ELK layout:', e);
    return { nodes, edges };
  }
}; 