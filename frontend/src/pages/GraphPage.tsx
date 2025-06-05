// frontend/src/pages/GraphPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  BackgroundVariant,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import '../styles/globals.css';
import '../styles/GraphPage.css'; // Import the specific CSS

import JsonUploadButton from '../components/graph/JsonUploadButton';
import PersonNode from '../components/graph/PersonNode';
import CompanyNode from '../components/graph/CompanyNode';
import { UploadCloud, Replace, Layers } from 'lucide-react';
import { JsonData, NodeData } from '../types/graph';
import { defaultNodes as demoNodes, defaultEdges as demoEdges } from '../data/defaultGraphData'; // Import default data

const nodeTypes = {
  person: PersonNode,
  company: CompanyNode,
};

export const GraphPage: React.FC = () => {
  const { fitView, getNodes, getEdges } = useReactFlow();
  const demoLoadedRef = useRef(false); // Tracks if demo data has been loaded in the current session/state
  const animationCleanupRef = useRef<(() => void) | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<JsonData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [jsonData, setJsonData] = useState<JsonData | null>(null);
  const [isDemoDataVisible, setIsDemoDataVisible] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  const animateGraphLoad = useCallback(
    (initialNodes: Node<NodeData>[], initialEdges: Edge[], isOverwrite: boolean = false) => {
      // Clear any existing animation cleanup
      if (animationCleanupRef.current) {
        animationCleanupRef.current();
        animationCleanupRef.current = null;
      }

      // If overwriting, clear existing nodes/edges first
      if (isOverwrite) {
        setNodes([]);
        setEdges([]);
      }

      // Start with empty arrays if overwriting, otherwise use current state
      const startNodes = isOverwrite ? [] : [...nodes];
      const startEdges = isOverwrite ? [] : [...edges];

      // Add new nodes/edges with animation classes
      const newNodes = initialNodes.map((node) => ({
        ...node,
        className: `${node.className || ''} node-appear`.trim(),
      }));
      const newEdges = initialEdges.map((edge) => ({
        ...edge,
        className: `${edge.className || ''} edge-appear`.trim(),
      }));

      // Set the new state
      setNodes([...startNodes, ...newNodes]);
      setEdges([...startEdges, ...newEdges]);

      // Schedule a cleanup to remove animation classes
      const timeoutId = setTimeout(() => {
        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            className: n.className?.replace('node-appear', 'node-appear-static'),
          }))
        );
        setEdges((eds) =>
          eds.map((e) => ({
            ...e,
            className: e.className?.replace('edge-appear', 'edge-appear-static'),
          }))
        );
        animationCleanupRef.current = null;
      }, 1000); // Match this with CSS animation duration

      animationCleanupRef.current = () => clearTimeout(timeoutId);

      // Fit view after a short delay to allow nodes to be positioned
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 800 });
      }, 100);
    },
    [setNodes, setEdges, fitView, nodes, edges]
  );

  const processJsonToGraph = useCallback((data: any): { initialNodes: Node<NodeData>[]; initialEdges: Edge[] } => {
    const newNodes: Node<NodeData>[] = [];
    const newEdges: Edge[] = [];
    const nodeIds = new Set<string>();
    let edgeIdCounter = Date.now(); 

    // Handle pre-formatted graph data {nodes: [], edges: []}
    if (data && Array.isArray(data.nodes) && Array.isArray(data.edges)) {
      console.log("[processJsonToGraph] Processing pre-formatted graph JSON.");
      const processedNodes = data.nodes.map((n: any, index: number) => ({
        ...n,
        id: String(n.id || `node-${index}-${Date.now()}`),
        position: n.position || { x: Math.random() * 800 + 50, y: Math.random() * 500 + 50 },
        className: `${n.className || ''} node-appear`.trim(),
      }));
      const processedEdges = data.edges.map((e: any, index: number) => ({
        ...e,
        id: String(e.id || `edge-${index}-${Date.now()}`),
        type: e.type || 'smoothstep',
        markerEnd: e.markerEnd || { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' },
        className: `${e.className || ''} edge-appear`.trim(),
      }));
      return { initialNodes: processedNodes, initialEdges: processedEdges };
    }

    const addNodeSafely = (node: Node<NodeData>) => {
      const uniqueNodeId = `user-node-${node.id}`; 
      if (!nodeIds.has(uniqueNodeId)) {
        nodeIds.add(uniqueNodeId);
        newNodes.push({ ...node, id: uniqueNodeId, className: 'node-appear' });
      }
      return uniqueNodeId;
    };

    const addEdgeInternal = (source: string, target: string, label?: string) => {
      const edgeId = `user-edge-${edgeIdCounter++}`;
      newEdges.push({
        id: edgeId,
        source,
        target,
        label,
        type: 'smoothstep',
        animated: false,
        className: 'edge-appear',
        markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' },
      });
    };
    
    if (data && Object.keys(data).length > 0) {
      console.log("[processJsonToGraph] Processing complex/custom JSON structure.");
      const baseId = data._id?.$oid || 'parsedData'; 
      addNodeSafely({ 
        id: `${baseId}-main`, 
        type: 'company',
        position: { x: 400, y: 200 },
        data: { 
          name: `Processed: ${baseId.substring(0,10)}`, 
          title: 'Main Entity',
          typeDetails: 'Processed JSON Data',
          status: 'normal',
          details: { fullJson: data }
        },
        className: 'node-appear'
      });

      // ... rest of the complex JSON parsing logic ...
    }

    return { initialNodes: newNodes, initialEdges: newEdges };
  }, []);

  const handleJsonUploaded = useCallback(
    (uploadedData: JsonData, uploadedFileName: string, mode: 'overwrite' | 'merge' = 'overwrite') => {
      setJsonData(uploadedData);
      setFileName(uploadedFileName);
      setIsDemoDataVisible(false);

      const { initialNodes, initialEdges } = processJsonToGraph(uploadedData);
      animateGraphLoad(initialNodes, initialEdges, mode === 'overwrite');
    },
    [processJsonToGraph, animateGraphLoad]
  );

  // Load demo data on initial mount if no JSON data is present
  useEffect(() => {
    if (isDemoDataVisible && !demoLoadedRef.current && !jsonData) {
      console.log("Loading default demo data (useEffect).");
      animateGraphLoad(
        demoNodes.map((n: Node<NodeData>) => ({...n, data: {...n.data}})), // Use imported demo data
        demoEdges.map((e: Edge) => ({...e})), // Use imported demo data
        true // Overwrite existing graph with demo data
      );
      demoLoadedRef.current = true; // Mark demo as loaded
    }
  }, [isDemoDataVisible, jsonData, animateGraphLoad]);

  // Cleanup animation timeouts on unmount
  useEffect(() => {
    return () => {
      if (animationCleanupRef.current) {
        animationCleanupRef.current();
      }
    };
  }, []);

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name); // Update file name display immediately
      try {
        const text = await file.text();
        const jsonDataParsed = JSON.parse(text) as JsonData;
        setSelectedFileContent(jsonDataParsed);
        setJsonData(null); // Clear any previous full jsonData to ensure buttons act on new file
      } catch (error) {
        console.error("Error parsing JSON:", error);
        alert("Failed to parse JSON file. Please ensure it's valid JSON.");
        setFileName('');
        setSelectedFileContent(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
    }
  };

  return (
    <div className="graph-page-center">
      <div className="graph-page-container">
        <div className="upload-panel">
          <h2 className="panel-title">Cargar Archivo JSON del Grafo</h2>
          <div className="upload-area" onClick={handleUploadAreaClick} role="button" tabIndex={0}>
            <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileSelected} />
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-upload-cloud mx-auto mb-4 text-gray-500">
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
              <path d="M12 12v9"></path>
              <path d="m16 16-4-4-4 4"></path>
            </svg>
            <p className="text-text-secondary">Drag & drop your JSON file here, or <span className="text-accent-cyan font-semibold">click to browse</span>.</p>
          </div>
          {fileName && <p className="file-name-display">Archivo cargado: {fileName}</p>}
          <div className="action-buttons-container">
            <button 
              className="graph-action-button overwrite-button"
              onClick={() => { if (selectedFileContent) handleJsonUploaded(selectedFileContent, fileName, 'overwrite'); }}
              disabled={!selectedFileContent}
            >
              <Replace size={16} /> Sobrescribir resultados
            </button>
            <button 
              className="graph-action-button merge-button"
              onClick={() => { if (selectedFileContent) handleJsonUploaded(selectedFileContent, fileName, 'merge'); }}
              disabled={!selectedFileContent}
            >
              <Layers size={16} /> Agregar y actualizar
            </button>
          </div>
        </div>
        <div className="graph-viewport-container">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={memoizedNodeTypes}
            fitView={false}
            minZoom={0.1}
            maxZoom={2}
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            proOptions={{ hideAttribution: true }}
            className="graph-viewport"
          >
            <Background />
            <Controls />
            {nodes.length === 0 && (
              <div className="placeholder-message">
                <UploadCloud size={64} className="mx-auto mb-6 text-gray-600" />
                <p className="mb-4">Arrastra o selecciona un archivo JSON para visualizar el grafo.</p>
                <p className="mb-2 text-sm">Utiliza el área de carga de arriba. Los datos de demostración se cargan por defecto.</p>
                {jsonData && nodes.length === 0 && ( // If JSON was loaded but resulted in no nodes
                  <details className="json-details-viewer">
                    <summary className="json-details-summary">JSON cargado pero no se generaron nodos. Ver JSON.</summary>
                    <pre className="json-details-content">{JSON.stringify(jsonData, null, 2)}</pre>
                  </details>
                )}
              </div>
            )}
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

const GraphPageWithProvider: React.FC = () => (
  <ReactFlowProvider>
    <GraphPage />
  </ReactFlowProvider>
);

export default GraphPageWithProvider;