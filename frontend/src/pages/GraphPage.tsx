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

  const processJsonToGraph = useCallback((data: any): { initialNodes: Node[]; initialEdges: Edge[] } => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    let nodeIdCounter = 0;

    const levelYNext: Map<number, number> = new Map();
    const X_INCREMENT = 300;
    const Y_INCREMENT = 120;
    const BASE_X = 50;
    const BASE_Y = 50;

    const getNodeId = (path: string) => {
      return `jsonGraphNode-${nodeIdCounter++}-${path.replace(/[^a-zA-Z0-9_\[\]]/g, '-').substring(0, 50)}`;
    };

    function parseJsonRecursive(
      currentData: any,
      parentId: string | null,
      keyForParentOrRootName: string,
      currentPath: string,
      level: number
    ) {
      const nodeId = getNodeId(currentPath || 'root');
      const x = BASE_X + level * X_INCREMENT;
      const y = levelYNext.get(level) || BASE_Y;
      levelYNext.set(level, y + Y_INCREMENT * (Array.isArray(currentData) ? 0.7 : 1));

      if (typeof currentData !== 'object' || currentData === null) {
        newNodes.push({
          id: nodeId,
          type: 'person',
          position: { x, y },
          data: {
            name: `${keyForParentOrRootName}: ${String(currentData).substring(0, 30)}${String(currentData).length > 30 ? '...' : ''}`,
            title: `Value @ ${currentPath}`,
            details: { type: 'primitive', value: String(currentData) }
          },
        });
        if (parentId) {
          newEdges.push({
            id: `edge-${parentId}-${nodeId}`,
            source: parentId,
            target: nodeId,
            label: keyForParentOrRootName,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' },
          });
        }
        return;
      }

      const isArray = Array.isArray(currentData);
      const nodeDisplayName = (parentId === null) ? 
        (data._id?.$oid ? `Processed: ${data._id.$oid.substring(0,10)}` : 'JSON Root') :
        keyForParentOrRootName;
      const numChildren = Object.keys(currentData).length;
      const nodeDisplayData: any = {
        name: nodeDisplayName,
        title: `Path: ${currentPath || '/'} (${isArray ? `Array[${numChildren}]` : 'Object'})`,
        details: {}
      };
      newNodes.push({
        id: nodeId,
        type: 'company',
        position: { x, y },
        data: nodeDisplayData,
      });
      if (parentId) {
        newEdges.push({
          id: `edge-${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          label: keyForParentOrRootName,
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' },
        });
      }
      const childKeys = Object.keys(currentData);
      childKeys.forEach((childKey) => {
        const value = currentData[childKey];
        let childPathSegment = isArray ? `[${childKey}]` : `.${childKey}`;
        if (currentPath === '' && !isArray) childPathSegment = childKey;
        else if (currentPath === '' && isArray) childPathSegment = `[${childKey}]`;
        const fullChildPath = (currentPath === '' && !isArray && !parentId) ? childKey : currentPath + childPathSegment;
        if (typeof value === 'object' && value !== null) {
          parseJsonRecursive(value, nodeId, childKey, fullChildPath, level + 1);
        } else {
          nodeDisplayData.details[childKey] = String(value).substring(0, 100);
        }
      });
      if (Object.keys(nodeDisplayData.details).length === 0) {
        delete nodeDisplayData.details;
      }
    }

    if (data && Array.isArray(data.nodes) && Array.isArray(data.edges)) {
      console.log("[processJsonToGraph] Processing pre-formatted graph JSON.");
      return { initialNodes: data.nodes, initialEdges: data.edges };
    }
    if (data && typeof data === 'object' && data !== null) {
      console.log("[processJsonToGraph] Processing generic JSON to graph structure.");
      nodeIdCounter = 0;
      levelYNext.clear();
      parseJsonRecursive(data, null, '', '', 0);
    } else {
      console.warn("[processJsonToGraph] Data is not a processable object or pre-formatted graph.");
      newNodes.push({
        id: 'error-json-node', type: 'company', position: { x: 100, y: 100 },
        data: { name: 'Invalid Data', title: 'Cannot parse', details: { error: 'Uploaded data is not a valid JSON object or graph structure.'}},
        className: 'node-alert-style'
      });
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