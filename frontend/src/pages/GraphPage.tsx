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
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

import PersonNode from '../components/graph/PersonNode';
import CompanyNode from '../components/graph/CompanyNode';
import { UploadCloud, Replace, Layers, Download, X } from 'lucide-react';
import { JsonData, DemoNodeData } from '../types/graph';
import { processJsonToSinglePersonNode } from '../utils/jsonProcessor';
import JsonDetailModal from '../components/modals/JsonDetailModal';
import RelationshipModal from '../components/modals/RelationshipModal';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import CustomConnectionLine from '../components/graph/CustomConnectionLine';

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
  const [detailsNode, setDetailsNode] = useState<Node<DemoNodeData> | null>(null);
  const [detailPanelWidth, setDetailsPanelWidth] = useState(400); // Default width for the details section
  const uploadPanelRef = useRef<HTMLDivElement>(null);
  const graphWrapperRef = useRef<HTMLDivElement>(null);
  const [uploadPanelActualHeight, setUploadPanelActualHeight] = useState(0);

  // Define the height for the details panel
  const detailPanelHeight = 300; // You can adjust this value as needed

  const [uploadedImageUrls, setUploadedImageUrls] = useState<Record<string, string>>({});

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

  // Function to handle image uploads for nodes
  const handleImageUploadForNode = useCallback((nodeId: string, file: File) => {
    console.log(`Uploading image for node ${nodeId}:`, file.name);
    
    // Revoke previous URL if it exists for this node
    if (uploadedImageUrls[nodeId]) {
      URL.revokeObjectURL(uploadedImageUrls[nodeId]);
    }

    const newImageUrl = URL.createObjectURL(file);
    setUploadedImageUrls(prev => ({ ...prev, [nodeId]: newImageUrl }));

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              imageUrl: newImageUrl,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes, uploadedImageUrls]);

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      Object.values(uploadedImageUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, [uploadedImageUrls]);

  // Cleanup object URLs when nodes are removed
  useEffect(() => {
    const currentNodeImageUrls = new Set(
      nodes.map(node => node.data.imageUrl).filter(Boolean) as string[]
    );
    const urlsToRevoke = Object.entries(uploadedImageUrls)
      .filter(([nodeId, url]) => !currentNodeImageUrls.has(url))
      .map(([nodeId, url]) => url);

    if (urlsToRevoke.length > 0) {
      urlsToRevoke.forEach(url => URL.revokeObjectURL(url));
      setUploadedImageUrls(prev => {
        const newState = { ...prev };
        Object.entries(newState).forEach(([nodeId, url]) => {
          if (urlsToRevoke.includes(url)) {
            delete newState[nodeId];
          }
        });
        return newState;
      });
    }
  }, [nodes, uploadedImageUrls]);

  const handleJsonUploaded = useCallback(
    (uploadedData: JsonData, uploadedFileName: string, mode: 'overwrite' | 'merge' = 'overwrite') => {
      setFileName(uploadedFileName);
      const { node: newSingleNode } = processJsonToSinglePersonNode(uploadedData, nodes);

      if (!newSingleNode) {
        alert("No se pudo identificar una persona en el JSON. No se creó ningún nodo.");
        return;
      }
      
      // Add the image upload callback to the node data
      const nodeWithUploadCallback = {
        ...newSingleNode,
        data: {
          ...newSingleNode.data,
          onImageUpload: handleImageUploadForNode,
        },
      };

      if (mode === 'overwrite') {
        // When overwriting, ensure all nodes have the upload callback
        const nodesToSet = [nodeWithUploadCallback].map(n => ({
          ...n,
          data: {
            ...n.data,
            onImageUpload: handleImageUploadForNode,
          }
        }));
        animateGraphLoad(nodesToSet, [], true);
      } else {
        // Merge mode
        const nodeWithAnimation = { 
          ...nodeWithUploadCallback, 
          className: `${nodeWithUploadCallback.className || ''} node-appear`.trim() 
        };
        
        setNodes((nds) => {
          // When adding nodes, ensure all person nodes have the upload callback
          const updatedNodes = [...nds, nodeWithAnimation];
          return updatedNodes.map(n => 
            n.type === 'person' ? { ...n, data: { ...n.data, onImageUpload: handleImageUploadForNode } } : n
          );
        });
        
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
    [nodes, animateGraphLoad, reactFlowInstance, setNodes, handleImageUploadForNode]
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
    console.log('Nodo clickeado para detalles:', node);
    if (node.data?.rawJsonData) {
      setDetailsNode(node); // Show in bottom panel instead of modal
      setIsDetailModalOpen(false); // Close modal if open
    } else {
      console.warn("El nodo clickeado no tiene rawJsonData:", node);
      setDetailsNode(null);
    }
  }, []);

  // Update upload panel height when content changes
  useEffect(() => {
    if (uploadPanelRef.current) {
      const height = uploadPanelRef.current.offsetHeight;
      console.log("Upload panel height:", height); // Debugging
      setUploadPanelActualHeight(height);
    }
  }, [selectedFileContent]);

  // Ensuring the graph container has valid dimensions
  const APP_HEADER_HEIGHT = 60; // Approximate height of the header
  const MARGINS_AND_GAPS = 16 * 2; // Margins and gaps around the graph

  const graphViewportHeight = `calc(100vh - ${APP_HEADER_HEIGHT}px - ${uploadPanelActualHeight}px - ${detailsNode ? detailPanelHeight : 0}px - ${MARGINS_AND_GAPS}px)`;

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

  // Remove vertical resize handler as we're using horizontal resize now

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
    console.log("handleCreateOrUpdateRelationship called with:", { label, isDirected, editingEdge, pendingConnection });
    
    if (editingEdge) {
      // Actualizar arista existente
      const updatedEdge: Edge = {
        ...editingEdge,
        label,
        markerEnd: isDirected ? { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' } : undefined,
        style: defaultEdgeStyle,
        className: 'edge-appear',
      };
      
      console.log("Updating existing edge:", updatedEdge);
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === editingEdge.id ? updatedEdge : edge
        )
      );
      
      // Animar la actualización
      setTimeout(() => {
        setEdges((eds) =>
          eds.map((e) =>
            e.id === updatedEdge.id
              ? { ...e, className: 'edge-appear-static' }
              : e
          )
        );
      }, 1000);
      
      setEditingEdge(null);
    } else if (pendingConnection) {
      // Crear nueva arista
      const newEdge: Edge = {
        id: `edge-${pendingConnection.source}-${pendingConnection.target}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
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

      console.log("Creating new edge:", newEdge);
      setEdges((eds) => {
        const updatedEdges = addEdge(newEdge, eds);
        console.log("Updated edges after adding:", updatedEdges);
        return updatedEdges;
      });

      // Animar la nueva arista
      setTimeout(() => {
        setEdges((eds) => {
          const finalEdges = eds.map((e) =>
            e.id === newEdge.id
              ? { ...e, className: 'edge-appear-static' }
              : e
          );
          console.log("Final edges after animation:", finalEdges);
          return finalEdges;
        });
      }, 1000);
    }

    setPendingConnection(null);
    setIsRelationshipModalOpen(false);
  }, [editingEdge, pendingConnection, setEdges]);

  // Añadir un efecto para depurar cambios en edges
  useEffect(() => {
    console.log("Edges state updated:", edges);
  }, [edges]);

  // Mejorar isValidConnection para ser más específico
  const isValidConnection = useCallback(
    (connection: Connection): boolean => {
      if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
        console.log("Invalid connection: missing required fields", connection);
        return false;
      }

      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (!sourceNode || !targetNode) {
        console.log("Invalid connection: source or target node not found", { sourceNode, targetNode });
        return false;
      }

      const isSourceHandleSourceType = connection.sourceHandle.startsWith('s-');
      const isTargetHandleTargetType = connection.targetHandle.startsWith('t-');

      const valid =
        sourceNode.type === 'person' &&
        targetNode.type === 'person' &&
        connection.source !== connection.target &&
        isSourceHandleSourceType &&
        isTargetHandleTargetType;

      console.log("Connection validation:", {
        sourceNode: sourceNode.id,
        targetNode: targetNode.id,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        isSourceHandleSourceType,
        isTargetHandleTargetType,
        valid
      });

      return valid;
    },
    [nodes]
  );

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setEditingEdge(edge);
    setPendingConnection(null);
    setIsRelationshipModalOpen(true);
  }, []);

  const onElementsRemove = useCallback((elementsToRemove: (Node | Edge)[]) => {
    const nodeIdsToRemove = new Set(elementsToRemove.filter(el => 'position' in el).map(el => el.id));
    const edgeIdsToRemove = new Set(elementsToRemove.filter(el => 'source' in el).map(el => el.id));

    if (nodeIdsToRemove.size > 0) {
      setNodes((nds) => nds.filter((node) => !nodeIdsToRemove.has(node.id)));
      // If a node is removed, also remove its details from the panel
      if (detailsNode && nodeIdsToRemove.has(detailsNode.id)) {
        setDetailsNode(null);
      }
    }
    if (edgeIdsToRemove.size > 0) {
      setEdges((eds) => eds.filter((edge) => !edgeIdsToRemove.has(edge.id)));
    }
  }, [setNodes, setEdges, detailsNode]);

  return (
    <div className="graph-page-container flex flex-col h-full w-full overflow-hidden">
      <div className="upload-panel" ref={uploadPanelRef} style={{ flexShrink: 0 }}>
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

      <PanelGroup direction="horizontal" className="flex-grow min-h-0 mt-4">
        <Panel defaultSize={detailsNode ? 70 : 100} minSize={30} className="flex flex-col">
            <div 
            ref={graphWrapperRef}
            className="graph-viewport-wrapper flex-grow relative bg-bg-primary rounded-md"
            style={{ minHeight: '300px' }}
            >
            <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
              <ReactFlow
              nodes={nodes.map(node => ({
                ...node,
                data: {
                ...node.data,
                onImageUpload: node.type === 'person' ? handleImageUploadForNode : undefined,
                }
              }))}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onNodesDelete={(nodesToDelete) => {
                const nodeIds = new Set(nodesToDelete.map(n => n.id));
                setNodes((nds) => nds.filter((node) => !nodeIds.has(node.id)));
                if (detailsNode && nodeIds.has(detailsNode.id)) {
                setDetailsNode(null);
                }
              }}
              onEdgesDelete={(edgesToDelete) => {
                const edgeIdsToRemove = new Set(edgesToDelete.map(e => e.id));
                setEdges((eds) => eds.filter((edge) => !edgeIdsToRemove.has(edge.id)));
              }}
              nodeTypes={memoizedNodeTypes}
              fitView={false}
              minZoom={0.1}
              maxZoom={2.5}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              proOptions={{ hideAttribution: true }}
              className="graph-viewport"
              connectionLineComponent={CustomConnectionLine}
              connectionLineStyle={{ stroke: 'var(--accent-cyan)', strokeWidth: 2.5 }}
              deleteKeyCode={['Backspace', 'Delete']}
              isValidConnection={isValidConnection}
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
            </div>
        </Panel>

        {detailsNode && (
          <>
            <PanelResizeHandle className="w-2 bg-input-border hover:bg-accent-cyan transition-colors flex items-center justify-center group">
              <div className="w-[3px] h-8 bg-bg-secondary rounded-full"></div>
            </PanelResizeHandle>
            <Panel defaultSize={30} minSize={20} maxSize={60} id="details-panel-resizable">
              <div className="bg-bg-secondary h-full flex flex-col overflow-hidden rounded-md border-l border-input-border">
                <div className="p-3 border-b border-input-border flex justify-between items-center flex-shrink-0">
                  <h3 className="text-base font-semibold text-accent-cyan truncate" title={detailsNode.data.name}>
                    Detalles: {detailsNode.data.name}
                  </h3>
                  <button 
                    onClick={() => setDetailsNode(null)} 
                    className="text-text-secondary hover:text-accent-red p-1 rounded-full hover:bg-accent-red/10 transition-colors"
                    aria-label="Cerrar panel de detalles"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-grow overflow-auto p-3">
                  <pre className="text-xs text-text-secondary whitespace-pre-wrap break-words scrollbar-thin scrollbar-thumb-accent-cyan-darker scrollbar-track-bg-input-bg bg-input-bg p-2 rounded-sm">
                    {JSON.stringify(detailsNode.data.rawJsonData, null, 2)}
                  </pre>
                </div>
              </div>
            </Panel>
          </>
        )}
      </PanelGroup>

      <RelationshipModal
        isOpen={isRelationshipModalOpen}
        onClose={() => {
          setIsRelationshipModalOpen(false);
          setPendingConnection(null);
          setEditingEdge(null);
        }}
        onSubmit={handleCreateOrUpdateRelationship}
        sourceNodeName={
          editingEdge
            ? nodes.find(n => n.id === editingEdge.source)?.data?.name ?? 'Source Node'
            : pendingConnection
              ? nodes.find(n => n.id === pendingConnection.source)?.data?.name ?? 'Source Node'
              : 'Source Node'
        }
        targetNodeName={
          editingEdge
            ? nodes.find(n => n.id === editingEdge.target)?.data?.name ?? 'Target Node'
            : pendingConnection
              ? nodes.find(n => n.id === pendingConnection.target)?.data?.name ?? 'Target Node'
              : 'Target Node'
        }
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
