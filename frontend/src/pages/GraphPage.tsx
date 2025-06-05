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
import TopMenuBar from '../components/layout/TopMenuBar';

const nodeTypes = {
  person: PersonNode,
  company: CompanyNode, // Keep for future use
};

export const GraphPage: React.FC = () => {
  const reactFlowInstance = useReactFlow();
  const animationCleanupRef = useRef<{ cleanup: (() => void) } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  
  const [fileName, setFileName] = useState<string>('');
  const [selectedFileContent, setSelectedFileContent] = useState<JsonData | null>(null);
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
  const [detailsNode, setDetailsNode] = useState<Node<DemoNodeData> | null>(null);
  const [isDetailPanelVisible, setIsDetailPanelVisible] = useState(false);
  const [topBarHeight, setTopBarHeight] = useState(60);
  
  const [nodes, setNodes, onNodesChange] = useNodesState<DemoNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
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

  const connectionLineStyle = { stroke: 'var(--accent-cyan)', strokeWidth: 2.5 };



  // Actualizar el estado de detailsNode y visibilidad del panel
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node<DemoNodeData>) => {
    if (node.data?.rawJsonData) {
      setDetailsNode(node);
      setIsDetailPanelVisible(true);
    } else {
      setDetailsNode(null);
      setIsDetailPanelVisible(false);
    }
  }, []);

  const handleCloseDetailPanel = useCallback(() => {
    setDetailsNode(null);
    setIsDetailPanelVisible(false);
  }, []);

  // Mejorar el manejo de conexiones
  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return;
    if (params.source === params.target) return;

    const newEdge: Edge = {
      id: `edge-${params.source}-${params.target}-${Date.now()}`,
      source: params.source,
      target: params.target,
      type: 'smoothstep',
      style: defaultEdgeStyle,
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' },
    };

    setEdges((eds) => addEdge(newEdge, eds));

    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);

    if (sourceNode?.type === 'person' && targetNode?.type === 'person') {
      setEditingEdge(newEdge);
      setIsRelationshipModalOpen(true);
    }
  }, [nodes, setEdges]);

  const handleCreateOrUpdateRelationship = useCallback((label: string, isDirected: boolean) => {
    console.log("Intentando crear/actualizar relación:", { label, isDirected, editingEdge, pendingConnection });
    
    let finalEdge: Edge | null = null;
    
    if (editingEdge) {
      finalEdge = { 
        ...editingEdge, 
        label, 
        markerEnd: isDirected ? { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' } : undefined,
        style: defaultEdgeStyle,
      };
      setEdges((eds) => eds.map((edge) => (edge.id === editingEdge.id ? finalEdge as Edge : edge)));
      setEditingEdge(null);
    } else if (pendingConnection) {
      finalEdge = {
        id: `edge-${pendingConnection.source}-${pendingConnection.target}-${Date.now()}`,
        source: pendingConnection.source!,
        target: pendingConnection.target!,
        sourceHandle: pendingConnection.sourceHandle,
        targetHandle: pendingConnection.targetHandle,
        label: label,
        type: 'smoothstep',
        style: defaultEdgeStyle,
        markerEnd: isDirected ? { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' } : undefined,
        className: 'edge-appear',
      };
      
      setEdges((eds) => {
        const newEdges = addEdge(finalEdge as Edge, eds);
        console.log("Nuevas aristas después de añadir:", newEdges);
        return newEdges;
      });
      setPendingConnection(null);
    }

    if (finalEdge) {
      const edgeToAnimateId = finalEdge.id;
      setTimeout(() => {
        setEdges((eds) =>
          eds.map((e) =>
            e.id === edgeToAnimateId 
              ? { ...e, className: (e.className || '').replace('edge-appear', 'edge-appear-static').trim() } 
              : e
          )
        );
      }, 400);
    }
    
    setIsRelationshipModalOpen(false);
  }, [editingEdge, pendingConnection, setEdges, defaultEdgeStyle]);

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

  const handleFileDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type === 'application/json') {
      setFileName(file.name);
      file.text().then(text => {
        try {
          const parsedJson = JSON.parse(text) as JsonData;
          setSelectedFileContent(parsedJson);
        } catch (error) {
          alert('El archivo no es un JSON válido.');
        }
      });
    } else {
      alert('Por favor, carga un archivo JSON válido.');
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragLeave = handleDragOver; // Assuming this was intended to be similar

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      try {
        const text = await file.text();
        const parsedJson = JSON.parse(text) as JsonData;
        setSelectedFileContent(parsedJson);
      } catch (error) {
        alert('El archivo no es un JSON válido.');
        setSelectedFileContent(null);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  
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

  const isValidConnection = (connection: Connection) => {
    return connection.source !== connection.target;
  };

  // Add missing zoom and fitView handlers
  const handleZoomIn = useCallback(() => {
    reactFlowInstance.zoomIn({ duration: 300 });
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance.zoomOut({ duration: 300 });
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.2, duration: 500 });
  }, [reactFlowInstance]);

  const sourceNodeForModal = editingEdge ? nodes.find(n => n.id === editingEdge.source) : null;
  const targetNodeForModal = editingEdge ? nodes.find(n => n.id === editingEdge.target) : null;
  
  const sourceNodeNameForModal = sourceNodeForModal?.data?.name || 'Nodo Origen';
  const targetNodeNameForModal = targetNodeForModal?.data?.name || 'Nodo Destino';



  return (
    <div className="graph-page-container flex flex-col h-full w-full overflow-hidden">
      <TopMenuBar
        onUploadClick={handleUploadAreaClick}
        onOverwrite={() => selectedFileContent && handleJsonUploaded(selectedFileContent, fileName, 'overwrite')}
        onMerge={() => selectedFileContent && handleJsonUploaded(selectedFileContent, fileName, 'merge')}
        onExportPDF={handleExportPDF}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        isFileLoaded={!!selectedFileContent}
        isGraphEmpty={nodes.length === 0}
        fileName={fileName}
      />
      
      <input 
        type="file" 
        accept=".json" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileSelected} 
      />

      {/* Contenedor principal con paneles redimensionables */}
      <PanelGroup direction="horizontal" className="flex-grow min-h-0">
        <Panel 
          defaultSize={isDetailPanelVisible ? 70 : 100} 
          minSize={30} 
          order={1}
          className="relative"
        >
          <div 
            className="graph-viewport-wrapper w-full h-full relative bg-graph-bg rounded-md"
            onDrop={handleFileDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
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
              onNodesDelete={onElementsRemove}
              onEdgesDelete={onElementsRemove}
              nodeTypes={memoizedNodeTypes}
              fitView={false}
              minZoom={0.1}
              maxZoom={2.5}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              proOptions={{ hideAttribution: true }}
              className="graph-viewport"
              connectionLineComponent={CustomConnectionLine}
              connectionLineStyle={connectionLineStyle}
              deleteKeyCode={['Backspace', 'Delete']}
              isValidConnection={isValidConnection}
            >
              <Background />
              <Controls />
              {nodes.length === 0 && (
                <div className="placeholder-message">
                  <UploadCloud size={64} className="mx-auto mb-6 text-text-secondary" />
                  <p className="mb-2">Arrastra y suelta un archivo JSON aquí</p>
                  <p className="mb-4 text-sm">o usa el botón "Cargar JSON" de arriba.</p>
                </div>
              )}
            </ReactFlow>
          </div>
        </Panel>
        
        {isDetailPanelVisible && detailsNode && (
          <>
            <PanelResizeHandle className="w-2 bg-input-border hover:bg-accent-cyan focus:outline-none focus:ring-2 focus:ring-accent-cyan transition-colors flex items-center justify-center group">
              <div className="w-[3px] h-10 bg-bg-primary rounded-full group-hover:bg-accent-cyan-darker transition-colors"></div>
            </PanelResizeHandle>
            <Panel 
              defaultSize={30} 
              minSize={20} 
              maxSize={50} 
              order={2} 
              id="details-panel-resizable"
            >
              <div className="bg-bg-secondary h-full flex flex-col overflow-hidden rounded-md border-l border-input-border shadow-lg">
                <div className="p-3 border-b border-input-border flex justify-between items-center flex-shrink-0">
                  <h3 className="text-md font-semibold text-accent-cyan truncate" title={detailsNode.data.name}>
                    Detalles: {detailsNode.data.name}
                  </h3>
                  <button 
                    onClick={handleCloseDetailPanel} 
                    className="text-text-secondary hover:text-accent-red p-1 rounded-full hover:bg-accent-red/10 transition-colors"
                    aria-label="Cerrar panel de detalles"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="flex-grow overflow-auto p-3">
                  <pre className="text-xs text-text-primary whitespace-pre-wrap break-words scrollbar-thin scrollbar-thumb-accent-cyan-darker scrollbar-track-bg-input-bg bg-input-bg p-2 rounded-sm">
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
        sourceNodeName={sourceNodeNameForModal}
        targetNodeName={targetNodeNameForModal}
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
