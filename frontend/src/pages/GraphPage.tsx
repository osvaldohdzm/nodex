// frontend/src/pages/GraphPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import '../styles/globals.css';
import '../styles/GraphPage.css';

import PersonNode from '../components/graph/PersonNode';
import CompanyNode from '../components/graph/CompanyNode';
import { UploadCloud, Replace, Layers, Download } from 'lucide-react';
import { JsonData, DemoNodeData } from '../types/graph';
import { processJsonToSinglePersonNode } from '../utils/jsonProcessor';
import JsonDetailModal from '../components/modals/JsonDetailModal';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const nodeTypes = {
  person: PersonNode,
  company: CompanyNode, // Keep for future use
};

export const GraphPage: React.FC = () => {
  const reactFlowInstance = useReactFlow();
  const animationCleanupRef = useRef<{ cleanup: (() => void) } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [fileName, setFileName] = useState<string>('');
  const [selectedFileContent, setSelectedFileContent] = useState<JsonData | null>(null);
  const [selectedNodeForDetails, setSelectedNodeForDetails] = useState<Node<DemoNodeData> | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const [nodes, setNodes, onNodesChange] = useNodesState<DemoNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  const animateGraphLoad = useCallback(
    (initialNodes: Node<DemoNodeData>[], initialEdges: Edge[], isOverwrite: boolean = false) => {
      if (animationCleanupRef.current?.cleanup) {
        animationCleanupRef.current.cleanup();
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
            className: n.className?.replace('node-appear', 'node-appear-static').trim(),
          }))
        );
        setEdges((eds) =>
          eds.map((e) => ({
            ...e,
            className: e.className?.replace('edge-appear', 'edge-appear-static').trim(),
          }))
        );
        if (animationCleanupRef.current?.cleanup === (() => clearTimeout(timeoutId))) {
          animationCleanupRef.current = null;
        }
      }, 1000);

      animationCleanupRef.current = { cleanup: () => clearTimeout(timeoutId) };

      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 800 });
      }, 100);
    },
    [setNodes, setEdges, reactFlowInstance, nodes, edges]
  );

  const handleJsonUploaded = useCallback(
    (uploadedData: JsonData, uploadedFileName: string, mode: 'overwrite' | 'merge' = 'overwrite') => {
      setFileName(uploadedFileName);

      const { node: newSingleNode } = processJsonToSinglePersonNode(uploadedData, nodes);

      if (!newSingleNode) {
        alert("No se pudo identificar una persona en el JSON. No se creó ningún nodo.");
        return;
      }
      
      if (mode === 'overwrite') {
        animateGraphLoad([newSingleNode], [], true); 
      } else {
        const nodeWithAnimation = { 
          ...newSingleNode, 
          className: `${newSingleNode.className || ''} node-appear`.trim() 
        };
        
        setNodes((nds) => [...nds, nodeWithAnimation]);

        const animationDuration = 1000; 
        const addedNodeId = nodeWithAnimation.id;

        setTimeout(() => {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === addedNodeId
                ? { ...n, className: (n.className || '').replace('node-appear', 'node-appear-static').trim() }
                : n
            )
          );
        }, animationDuration);
        
        setTimeout(() => {
          reactFlowInstance.fitView({ padding: 0.2, duration: 800, nodes: [newSingleNode] });
        }, 150);
      }
    },
    [nodes, animateGraphLoad, reactFlowInstance, setNodes]
  );

  useEffect(() => {
    return () => { 
      if (animationCleanupRef.current?.cleanup) {
        animationCleanupRef.current.cleanup(); 
      }
    };
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
        alert("Fallo al parsear el archivo JSON. Asegúrate que sea un JSON válido.");
        setFileName(''); 
        setSelectedFileContent(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node<DemoNodeData>) => {
    console.log('Nodo clickeado:', node);
    if (node.data?.rawJsonData) {
      setSelectedNodeForDetails(node);
      setIsDetailModalOpen(true);
    } else {
      console.warn("El nodo clickeado no tiene rawJsonData:", node);
      setSelectedNodeForDetails(null);
      setIsDetailModalOpen(false);
    }
  }, []);

  const handleExportPDF = async () => {
    const currentGraphNodes = reactFlowInstance.getNodes();
    if (currentGraphNodes.length === 0) {
      alert("No hay contenido en el grafo para exportar.");
      return;
    }
    const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewportElement) {
      console.error('Elemento viewport de ReactFlow no encontrado.');
      alert('Error: Elemento viewport no encontrado para exportar.');
      return;
    }
    try {
      // Remove box shadows from nodes for cleaner export
      document.querySelectorAll('.react-flow__node').forEach(nodeEl => {
        (nodeEl as HTMLElement).style.boxShadow = 'none';
      });
      
      const canvas = await html2canvas(viewportElement, {
        logging: false, 
        useCORS: true,
        backgroundColor: window.getComputedStyle(document.documentElement).getPropertyValue('--graph-bg').trim() || '#001F3F',
        scale: 1.5,
      });
      
      // Restore box shadows
      document.querySelectorAll('.react-flow__node').forEach(nodeEl => {
        (nodeEl as HTMLElement).style.boxShadow = ''; 
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'l' : 'p',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      const pdfFileName = `${fileName.replace(/\.json$/i, '') || 'grafo'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(pdfFileName);
    } catch (error: any) {
      console.error('Error exportando grafo a PDF:', error);
      alert(`Fallo al exportar grafo a PDF. Error: ${error.message || String(error)}`);
      document.querySelectorAll('.react-flow__node').forEach(nodeEl => {
        (nodeEl as HTMLElement).style.boxShadow = '';
      });
    }
  };

  return (
    <div className="graph-page-container">
      <div className="upload-panel">
        <h2 className="panel-title">Cargar Archivo JSON de Persona</h2>
        <div 
          className="upload-area" 
          onClick={handleUploadAreaClick} 
          role="button" 
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleUploadAreaClick();
            }
          }}
          aria-label="Área para cargar archivos JSON. Arrastra y suelta o haz clic para seleccionar."
        >
          <input 
            type="file" 
            accept=".json" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileSelected} 
          />
          <UploadCloud size={48} className="mx-auto mb-2 text-gray-500" />
          <p className="text-text-secondary text-sm">
            Arrastra y suelta tu archivo JSON aquí, o <span className="text-accent-cyan font-semibold">haz clic para buscar</span>.
          </p>
        </div>
        {selectedFileContent && fileName && (
          <p className="file-name-display">Archivo listo: {fileName}</p>
        )}
        
        <div className="action-buttons-container mt-3">
          <button 
            className="graph-action-button overwrite-button"
            onClick={() => selectedFileContent && handleJsonUploaded(selectedFileContent, fileName, 'overwrite')}
            disabled={!selectedFileContent}
            title="Reemplaza el grafo actual con la persona del archivo JSON."
          >
            <Replace size={16} /> Sobrescribir
          </button>
          <button 
            className="graph-action-button merge-button"
            onClick={() => selectedFileContent && handleJsonUploaded(selectedFileContent, fileName, 'merge')}
            disabled={!selectedFileContent}
            title="Añade la persona del archivo JSON como un nuevo nodo al grafo."
          >
            <Layers size={16} /> Agregar y actualizar
          </button>
          <button
            className="graph-action-button"
            onClick={handleExportPDF}
            disabled={nodes.length === 0}
            title={nodes.length === 0 ? "Carga un grafo para exportar" : "Exportar vista actual como PDF"}
          >
            <Download size={16} /> Exportar PDF
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
          onNodeClick={onNodeClick}
          fitView={false}
          minZoom={0.1}
          maxZoom={2.5}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          proOptions={{ hideAttribution: true }}
          className="graph-viewport"
        >
          <Background />
          <Controls />
          {nodes.length === 0 && (
            <div className="placeholder-message">
              <UploadCloud size={64} className="mx-auto mb-6 text-gray-600" />
              <p className="mb-4">Carga un archivo JSON para visualizar a la persona en el grafo.</p>
              <p className="mb-2 text-sm">Utiliza el panel de carga de arriba.</p>
            </div>
          )}
        </ReactFlow>
      </div>
      
      <JsonDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedNodeForDetails(null);
        }}
        jsonData={selectedNodeForDetails?.data?.rawJsonData}
        title={`Detalles Completos de: ${selectedNodeForDetails?.data?.name || 'Nodo Seleccionado'}`}
      />
    </div>
  );
};

const GraphPageWithProvider: React.FC = () => (
  <ReactFlowProvider>
    <GraphPage />
  </ReactFlowProvider>
);

export default GraphPageWithProvider;
