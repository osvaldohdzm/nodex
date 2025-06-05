// frontend/src/pages/GraphPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
  addEdge,
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
import RelationshipModal from '../components/modals/RelationshipModal';

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
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState<DemoNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [height, setHeight] = useState(300); // Default height for the details section

  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  // Estilos para las aristas
  const defaultEdgeStyle = {
    stroke: 'var(--edge-default-color)',
    strokeWidth: 2,
    transition: 'all 0.2s ease',
  };

  const selectedEdgeStyle = {
    ...defaultEdgeStyle,
    stroke: 'var(--accent-cyan)',
    strokeWidth: 3,
    filter: 'drop-shadow(0 0 2px var(--accent-cyan))',
  };

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

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const startY = e.clientY;
    const startHeight = height;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newHeight = startHeight + (moveEvent.clientY - startY);
      setHeight(Math.max(newHeight, 150)); // Minimum height of 150px
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const onConnect = useCallback((params: Connection) => {
    console.log("--- onConnect START ---");
    console.log("Params received:", params);

    if (!params.source || !params.target) {
      console.error("onConnect Error: Source or target ID is missing.", params);
      return;
    }

    if (!params.sourceHandle || !params.targetHandle) {
      console.error("onConnect Error: Source or target HANDLE is missing.", params);
      return;
    }

    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);

    console.log("Source Node:", sourceNode);
    console.log("Target Node:", targetNode);

    if (sourceNode?.type === 'person' && targetNode?.type === 'person') {
      if (params.source === params.target) {
        console.warn("No se permiten conexiones al mismo nodo.");
        return;
      }

      // Verificar si ya existe una conexión entre estos nodos
      const existingEdge = edges.find(
        edge => 
          (edge.source === params.source && edge.target === params.target) ||
          (edge.source === params.target && edge.target === params.source)
      );

      if (existingEdge) {
        console.log("Ya existe una conexión entre estos nodos, editando...");
        setEditingEdge(existingEdge);
        setPendingConnection(null);
      } else {
        console.log("Creando nueva conexión...");
        setPendingConnection(params);
        setEditingEdge(null);
      }

      setIsRelationshipModalOpen(true);
    } else {
      console.warn("Solo se permiten conexiones entre nodos de tipo 'person'");
    }
  }, [nodes, edges]);

  const handleCreateOrUpdateRelationship = useCallback((label: string, isDirected: boolean) => {
    if (editingEdge) {
      // Actualizar arista existente
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === editingEdge.id
            ? {
                ...edge,
                label,
                markerEnd: isDirected ? { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' } : undefined,
                style: defaultEdgeStyle,
                className: 'edge-appear',
              }
            : edge
        )
      );
      setEditingEdge(null);
    } else if (pendingConnection) {
      // Crear nueva arista
      const newEdge: Edge = {
        id: `edge-${pendingConnection.source}-${pendingConnection.target}-${Date.now()}`,
        source: pendingConnection.source!,
        target: pendingConnection.target!,
        sourceHandle: pendingConnection.sourceHandle,
        targetHandle: pendingConnection.targetHandle,
        label,
        type: 'smoothstep',
        style: defaultEdgeStyle,
        markerEnd: isDirected ? { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' } : undefined,
        className: 'edge-appear',
      };

      setEdges((eds) => addEdge(newEdge, eds));

      // Animar la nueva arista
      setTimeout(() => {
        setEdges((eds) =>
          eds.map((e) =>
            e.id === newEdge.id
              ? { ...e, className: 'edge-appear-static' }
              : e
          )
        );
      }, 1000);
    }

    setPendingConnection(null);
    setIsRelationshipModalOpen(false);
  }, [editingEdge, pendingConnection, setEdges]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setEditingEdge(edge);
    setPendingConnection(null);
    setIsRelationshipModalOpen(true);
  }, []);

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
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={memoizedNodeTypes}
          fitView={false}
          minZoom={0.1}
          maxZoom={2.5}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          proOptions={{ hideAttribution: true }}
          className="graph-viewport"
          connectionLineStyle={{ stroke: 'var(--accent-cyan)', strokeWidth: 2.5 }}
          deleteKeyCode={['Backspace', 'Delete']}
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
      
      <div
        className="details-section overflow-auto"
        style={{ height: `${height}px` }}
      >
        <div className="resize-handle" onMouseDown={handleResizeMouseDown}></div>
        {/* Content of the details section */}
        <pre>{/* JSON data or other details */}</pre>
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
      <RelationshipModal
        isOpen={isRelationshipModalOpen}
        onClose={() => {
          setIsRelationshipModalOpen(false);
          setPendingConnection(null);
          setEditingEdge(null);
        }}
        onSubmit={handleCreateOrUpdateRelationship}
        sourceNodeName={editingEdge 
          ? nodes.find(n => n.id === editingEdge.source)?.data?.name 
          : pendingConnection 
            ? nodes.find(n => n.id === pendingConnection.source)?.data?.name 
            : 'Nodo Origen'}
        targetNodeName={editingEdge 
          ? nodes.find(n => n.id === editingEdge.target)?.data?.name 
          : pendingConnection 
            ? nodes.find(n => n.id === pendingConnection.target)?.data?.name 
            : 'Nodo Destino'}
        initialLabel={editingEdge?.label as string | undefined}
        initialIsDirected={editingEdge ? editingEdge.markerEnd !== undefined : true}
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
