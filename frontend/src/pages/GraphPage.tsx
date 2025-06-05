// frontend/src/pages/GraphPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  getNodesBounds, // Import for potential future use (full graph export)
  // getViewport, // Provided by useReactFlow instance
} from 'reactflow';
import 'reactflow/dist/style.css';
import '../styles/globals.css';
import '../styles/GraphPage.css';

import PersonNode from '../components/graph/PersonNode';
import CompanyNode from '../components/graph/CompanyNode';
import { UploadCloud, Replace, Layers, Download } from 'lucide-react'; // Added Download icon
import { JsonData } from '../types/graph';
import { defaultNodes as demoNodes, defaultEdges as demoEdges } from '../data/defaultGraphData';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const nodeTypes = {
  person: PersonNode,
  company: CompanyNode,
};

export const GraphPage: React.FC = () => {
  const reactFlowInstance = useReactFlow(); // Get the ReactFlow instance
  const demoLoadedRef = useRef(false);
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
    (initialNodes: Node[], initialEdges: Edge[], isOverwrite: boolean = false) => {
      if (animationCleanupRef.current) {
        animationCleanupRef.current();
        animationCleanupRef.current = null;
      }

      const nodesToSet = initialNodes.map((node) => ({
        ...node,
        className: `${node.className || ''} node-appear`.trim(),
      }));
      const edgesToSet = initialEdges.map((edge) => ({
        ...edge,
        className: `${edge.className || ''} edge-appear`.trim(),
      }));
      
      if (isOverwrite) {
        setNodes(nodesToSet);
        setEdges(edgesToSet);
      } else {
        const existingNodeIds = new Set(nodes.map(n => n.id));
        const newNodesToAdd = nodesToSet.filter(n => !existingNodeIds.has(n.id));
        
        const existingEdgeIds = new Set(edges.map(e => e.id));
        const newEdgesToAdd = edgesToSet.filter(e => !existingEdgeIds.has(e.id));

        setNodes((nds) => [...nds, ...newNodesToAdd]);
        setEdges((eds) => [...eds, ...newEdgesToAdd]);
      }

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
      }, 1000);

      animationCleanupRef.current = () => clearTimeout(timeoutId);

      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
      }, 100);
    },
    [setNodes, setEdges, reactFlowInstance, nodes, edges]
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

    const getNodeId = (path: string) => `jsonGraphNode-${nodeIdCounter++}-${path.replace(/[^a-zA-Z0-9_[\]]/g, '-').substring(0, 50)}`;
    
    function parseJsonRecursive(currentData: any, parentId: string | null, keyForParentOrRootName: string, currentPath: string, level: number) {
      const nodeId = getNodeId(currentPath || 'root');
      const x = BASE_X + level * X_INCREMENT;
      const y = levelYNext.get(level) || BASE_Y;
      levelYNext.set(level, y + Y_INCREMENT * (Array.isArray(currentData) ? 0.7 : 1));

      if (typeof currentData !== 'object' || currentData === null) {
        newNodes.push({
          id: nodeId, type: 'person', position: { x, y },
          data: { name: `${keyForParentOrRootName}: ${String(currentData).substring(0, 30)}${String(currentData).length > 30 ? '...' : ''}`, title: `Value @ ${currentPath}`, details: { type: 'primitive', value: String(currentData) } },
        });
        if (parentId) {
          newEdges.push({ id: `edge-${parentId}-${nodeId}`, source: parentId, target: nodeId, label: keyForParentOrRootName, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' } });
        }
        return;
      }

      const isArray = Array.isArray(currentData);
      const nodeDisplayName = (parentId === null) ? (data._id?.$oid ? `Processed: ${data._id.$oid.substring(0,10)}` : 'JSON Root') : keyForParentOrRootName;
      const numChildren = Object.keys(currentData).length;
      const nodeDisplayData: any = { name: nodeDisplayName, title: `Path: ${currentPath || '/'} (${isArray ? `Array[${numChildren}]` : 'Object'})`, details: {} };

      newNodes.push({ id: nodeId, type: 'company', position: { x, y }, data: nodeDisplayData });
      if (parentId) {
        newEdges.push({ id: `edge-${parentId}-${nodeId}`, source: parentId, target: nodeId, label: keyForParentOrRootName, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' } });
      }

      Object.keys(currentData).forEach((childKey) => {
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
      if (Object.keys(nodeDisplayData.details).length === 0) delete nodeDisplayData.details;
    }

    if (data && Array.isArray(data.nodes) && Array.isArray(data.edges)) {
      return { initialNodes: data.nodes, initialEdges: data.edges };
    }
    if (data && typeof data === 'object' && data !== null) {
      nodeIdCounter = 0;
      levelYNext.clear();
      parseJsonRecursive(data, null, '', '', 0);
    } else {
      newNodes.push({ id: 'error-json-node', type: 'company', position: { x: 100, y: 100 }, data: { name: 'Invalid Data', title: 'Cannot parse', details: { error: 'Uploaded data is not a valid JSON object or graph structure.'}}, className: 'node-alert-style' });
    }
    return { initialNodes: newNodes, initialEdges: newEdges };
  }, []);

  const handleJsonUploaded = useCallback(
    (uploadedData: JsonData, uploadedFileName: string, mode: 'overwrite' | 'merge' = 'overwrite') => {
      setJsonData(uploadedData);
      setFileName(uploadedFileName);
      setIsDemoDataVisible(false);
      const { initialNodes: newNodes, initialEdges: newEdges } = processJsonToGraph(uploadedData);
      animateGraphLoad(newNodes, newEdges, mode === 'overwrite');
    },
    [processJsonToGraph, animateGraphLoad]
  );

  useEffect(() => {
    if (isDemoDataVisible && !demoLoadedRef.current && !jsonData) {
      const demoNodesWithClass = demoNodes.map(n => ({...n, data: {...n.data}, className: 'node-appear-static' }));
      const demoEdgesWithClass = demoEdges.map(e => ({...e, className: 'edge-appear-static' }));
      animateGraphLoad(demoNodesWithClass, demoEdgesWithClass, true);
      demoLoadedRef.current = true;
    }
  }, [isDemoDataVisible, jsonData, animateGraphLoad]);

  useEffect(() => {
    return () => { if (animationCleanupRef.current) animationCleanupRef.current(); };
  }, []);

  const handleUploadAreaClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      try {
        const text = await file.text();
        const parsedJson = JSON.parse(text) as JsonData;
        setSelectedFileContent(parsedJson);
      } catch (error) {
        console.error("Error parsing JSON:", error);
        alert("Failed to parse JSON file. Please ensure it's valid JSON.");
        setFileName(''); setSelectedFileContent(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExportPDF = async () => {
    // Use getNodes from the instance to ensure current state
    const currentGraphNodes = reactFlowInstance.getNodes(); 

    if (currentGraphNodes.length === 0) {
      alert("No graph content to export.");
      return;
    }

    const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewportElement) {
      console.error('ReactFlow viewport element not found.');
      alert('Error: Viewport element not found for export.');
      return;
    }

    try {
      // Temporarily remove box-shadow from nodes during capture for cleaner PDF
      document.querySelectorAll('.react-flow__node').forEach(nodeEl => {
        (nodeEl as HTMLElement).style.boxShadow = 'none';
      });
      // Also remove transform from viewport for html2canvas if it causes issues
      // const originalTransform = viewportElement.style.transform;
      // viewportElement.style.transform = '';


      const canvas = await html2canvas(viewportElement, {
        logging: false,
        useCORS: true,
        backgroundColor: window.getComputedStyle(viewportElement).getPropertyValue('background-color') || 'var(--graph-bg)',
        scale: 1.5, // Increase scale for better quality in PDF
        // x: 0, y: 0, scrollX: 0, scrollY: 0, // Ensure capture from top-left
        // windowWidth: viewportElement.scrollWidth,
        // windowHeight: viewportElement.scrollHeight,
      });
      
      // Restore box-shadow
      document.querySelectorAll('.react-flow__node').forEach(nodeEl => {
        (nodeEl as HTMLElement).style.boxShadow = ''; // Revert to CSS defined shadow
      });
      // viewportElement.style.transform = originalTransform;


      const imgData = canvas.toDataURL('image/png', 1.0); // High quality PNG

      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'l' : 'p',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      
      const pdfFileName = `${fileName.replace(/\.json$/i, '') || 'graph'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(pdfFileName);

    } catch (error: any) {
      console.error('Error exporting graph to PDF:', error);
      alert(`Failed to export graph to PDF. See console for details. Error: ${error.message || String(error)}`);
      // Ensure styles are restored even on error
      document.querySelectorAll('.react-flow__node').forEach(nodeEl => {
        (nodeEl as HTMLElement).style.boxShadow = '';
      });
      // const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement;
      // if(viewportEl) viewportEl.style.transform = ''; // Restore if changed
    }
  };
  
  return (
    <div className="graph-page-center">
      <div className="graph-page-container">
        <div className="upload-panel">
          <h2 className="panel-title">Cargar Archivo JSON del Grafo</h2>
          <div className="upload-area" onClick={handleUploadAreaClick} role="button" tabIndex={0} 
               onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleUploadAreaClick();}}
               aria-label="Área para cargar archivos JSON. Arrastra y suelta o haz clic para seleccionar."
          >
            <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileSelected} />
            <UploadCloud size={48} className="mx-auto mb-4 text-gray-500" />
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
            <button
              className="graph-action-button" // Reuses existing button styling
              onClick={handleExportPDF}
              disabled={nodes.length === 0} // Disabled if no nodes from current state
              title={nodes.length === 0 ? "Carga un grafo para exportar" : "Exportar vista actual como PDF"}
            >
              <Download size={16} /> Exportar como PDF
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
            {nodes.length === 0 && !isDemoDataVisible && (
              <div className="placeholder-message">
                <UploadCloud size={64} className="mx-auto mb-6 text-gray-600" />
                <p className="mb-4">Arrastra o selecciona un archivo JSON para visualizar el grafo.</p>
                <p className="mb-2 text-sm">Utiliza el área de carga de arriba. Los datos de demostración se cargan por defecto.</p>
                {jsonData && (
                  <details className="json-details-viewer">
                    <summary className="json-details-summary">JSON cargado pero no se generaron nodos. Ver JSON.</summary>
                    <pre className="json-details-pre">{JSON.stringify(jsonData, null, 2)}</pre>
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