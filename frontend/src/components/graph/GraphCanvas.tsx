import React, { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Connection,
  MarkerType,
  NodeTypes,
  EdgeTypes,
  Position,
  XYPosition,
} from 'reactflow';
import 'reactflow/dist/style.css';
import '../../styles/react-flow-theme.css';
import { nanoid } from 'nanoid';

import PersonNode, { PersonNodeData } from './PersonNode';
import CompanyNode, { CompanyNodeData } from './CompanyNode';
import JsonUploadButton from './JsonUploadButton';

interface InputNode {
  id: string;
  type: 'person' | 'company';
  name: string;
  title?: string;
  location?: string;
  imageUrl?: string;
  logoUrl?: string;
  position?: XYPosition;
  connections?: Array<{ target: string; label: string; type?: string }>;
}

interface InputJson {
  nodes: InputNode[];
  edges?: Array<{ id?: string; source: string; target: string; label: string; type?: string }>;
}

const nodeTypes: NodeTypes = {
  person: PersonNode,
  company: CompanyNode,
};

const edgeTypes: EdgeTypes = {
  smoothstep: 'smoothstep',
  default: 'default',
};

const getEdgeColor = (type?: string): string => {
  switch (type?.toLowerCase()) {
    case 'employer': return 'var(--edge-employer)';
    case 'best friend': return 'var(--edge-bestfriend)';
    case 'board member': return 'var(--edge-boardmember)';
    default: return '#A0A0A0';
  }
};

const handleImageUpload = async (nodeId: string, file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('nodeId', nodeId);

  try {
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    const { imageUrl } = await response.json();
    return imageUrl;
  } catch (error) {
    console.error('Error uploading image:', error);

    // Demo fallback: create a local URL
    const localUrl = URL.createObjectURL(file);
    console.log('Mock upload successful, local URL:', localUrl);
    return localUrl;
  }
};

const sampleJsonData: InputJson = {
  nodes: [
    {
      id: '1',
      type: 'person',
      name: 'John Doe',
      title: 'Software Engineer',
      imageUrl: '',
      connections: [
        { target: '2', label: 'Best Friend', type: 'best friend' },
      ],
    },
    {
      id: '2',
      type: 'company',
      name: 'Tech Corp',
      location: 'San Francisco',
      logoUrl: '',
    },
  ],
  edges: [
    {
      source: '1',
      target: '2',
      label: 'Works At',
      type: 'employer',
    },
  ],
};

const GraphCanvas: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hasData, setHasData] = useState(false);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#888' },
          },
          eds
        )
      ),
    []
  );

  const processJsonData = useCallback((jsonData: InputJson) => {
    const reactFlowNodes: Node[] = [];
    const reactFlowEdges: Edge[] = [];
    const nodePositions: { [key: string]: XYPosition } = {};
    const existingNodeIds = new Set<string>();

    const getNodePosition = (index: number, totalNodes: number): XYPosition => {
      if (totalNodes <= 1) return { x: 250, y: 150 };
      const radius = Math.min(300, totalNodes * 60);
      const angle = (index / totalNodes) * 2 * Math.PI;
      return {
        x: Math.cos(angle) * radius + 400,
        y: Math.sin(angle) * radius + 300,
      };
    };

    jsonData.nodes.forEach((node, index) => {
      if (existingNodeIds.has(node.id)) {
        console.warn(`Duplicate node ID found: ${node.id}. Skipping.`);
        return;
      }
      existingNodeIds.add(node.id);

      const position = node.position || getNodePosition(index, jsonData.nodes.length);
      nodePositions[node.id] = position;

      let nodeData: PersonNodeData | CompanyNodeData;
      if (node.type === 'person') {
        nodeData = {
          name: node.name,
          title: node.title,
          imageUrl: node.imageUrl,
          onImageUpload: async (nodeId, file) => {
            try {
              const newImageUrl = await handleImageUpload(nodeId, file);
              setNodes((nds) =>
                nds.map((n) => {
                  if (n.id === nodeId) {
                    return { ...n, data: { ...n.data, imageUrl: newImageUrl } };
                  }
                  return n;
                })
              );
            } catch (error) {
              console.error('Error in onImageUpload callback:', error);
            }
          },
        };
      } else {
        nodeData = {
          name: node.name,
          location: node.location,
          logoUrl: node.logoUrl,
        };
      }

      reactFlowNodes.push({
        id: node.id,
        type: node.type,
        position: position,
        data: nodeData,
        sourcePosition: node.type === 'person' ? Position.Bottom : Position.Right,
        targetPosition: node.type === 'person' ? Position.Top : Position.Left,
      });

      if (node.connections) {
        node.connections.forEach((conn) => {
          reactFlowEdges.push({
            id: `e-${node.id}-${conn.target}-${nanoid(5)}`,
            source: node.id,
            target: conn.target,
            label: conn.label,
            type: 'smoothstep',
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed, color: getEdgeColor(conn.type) },
            style: { stroke: getEdgeColor(conn.type), strokeWidth: 2 },
            labelStyle: { fill: getEdgeColor(conn.type), fontWeight: 'bold' },
            labelBgPadding: [8, 4],
            labelBgBorderRadius: 4,
            labelBgStyle: { fill: 'var(--graph-bg)', fillOpacity: 0.7 },
          });
        });
      }
    });

    if (jsonData.edges) {
      jsonData.edges.forEach((edge) => {
        reactFlowEdges.push({
          id: edge.id || `e-${edge.source}-${edge.target}-${nanoid(5)}`,
          source: edge.source,
          target: edge.target,
          label: edge.label,
          type: 'smoothstep',
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed, color: getEdgeColor(edge.type) },
          style: { stroke: getEdgeColor(edge.type), strokeWidth: 2 },
          labelStyle: { fill: getEdgeColor(edge.type), fontWeight: 'bold' },
          labelBgPadding: [8, 4],
          labelBgBorderRadius: 4,
          labelBgStyle: { fill: 'var(--graph-bg)', fillOpacity: 0.7 },
        });
      });
    }

    setNodes(reactFlowNodes);
    setEdges(reactFlowEdges);
    setHasData(true);
  }, []);

  return (
    <div className="w-full h-screen flex flex-col bg-graph-bg">
      {!hasData && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-graph-bg/90">
          <div className="w-full max-w-lg p-4">
            <h1 className="text-3xl font-bold text-center mb-6 text-accent-cyan">Load Graph Data</h1>
            <JsonUploadButton onJsonUploaded={processJsonData} />
            <button
              onClick={() => processJsonData(sampleJsonData)}
              className="mt-4 w-full bg-accent-cyan/20 text-accent-cyan hover:bg-accent-cyan/30 p-3 rounded-lg transition-colors"
            >
              Load Sample Data
            </button>
          </div>
        </div>
      )}
      <div className="flex-grow" style={{ height: '100%', width: '100%' }}>
        {hasData && (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}
            className="bg-graph-bg"
            proOptions={{ hideAttribution: true }}
          >
            <Controls className="!text-accent-cyan !fill-accent-cyan" />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === 'person') return 'var(--node-person-border)';
                if (node.type === 'company') return 'var(--node-company-border)';
                return '#eee';
              }}
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="!bg-gray-800 !border-accent-cyan"
            />
            <Background color="#444" gap={24} size={1.5} variant="dots" />
          </ReactFlow>
        )}
      </div>
    </div>
  );
};

export default GraphCanvas;
