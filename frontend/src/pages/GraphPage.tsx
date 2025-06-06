// frontend/src/pages/GraphPage.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type DragEvent,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
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
  type NodeChange,
  type EdgeChange,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type EdgeMouseHandler,
  type NodeProps,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import '../styles/globals.css';
import '../styles/GraphPage.css';

import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { UploadCloud, X } from 'lucide-react';

import PersonNodeComponent from '../components/graph/PersonNode';
import CompanyNodeComponent from '../components/graph/CompanyNode';
import CustomConnectionLine from '../components/graph/CustomConnectionLine';
import RelationshipModal from '../components/modals/RelationshipModal';
import UploadConfirmModal from '../components/modals/UploadConfirmModal';
import TopMenuBar, {
  FileMenuAction,
  EditMenuAction,
  ViewMenuAction,
  type FileMenuActionType,
  type EditMenuActionType,
  type ViewMenuActionType
} from '../components/layout/TopMenuBar';

import { JsonData, DemoNodeData } from '../types/graph';
import { processJsonToSinglePersonNode } from '../utils/jsonProcessor';
import { flattenObject, formatKeyForDisplay, normalizeValueToSentenceCase } from '../utils/dataUtils';
import { resizeAndCropImage } from '../utils/imageUtils';
import config from '../config';

const nodeTypesDefinition: NodeTypes = {
  person: PersonNodeComponent as ComponentType<NodeProps<DemoNodeData>>,
  company: CompanyNodeComponent as ComponentType<NodeProps<DemoNodeData>>,
};

export const GraphPage: React.FC = () => {
  const reactFlowInstance = useReactFlow<DemoNodeData>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isLoadingBackendOp = useRef(false);

  const [nodes, setNodes, onNodesChangeReactFlow] = useNodesState<DemoNodeData>([]);
  const [edges, setEdges, onEdgesChangeReactFlow] = useEdgesState<Edge[]>([]);

  const [fileName, setFileName] = useState<string>('');
  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; trigger: 'brujes' | 'dragdrop' } | null>(null);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [editingEdge, setEditingEdge] = useState<Edge | null>(null);

  const [detailsNode, setDetailsNode] = useState<Node<DemoNodeData> | null>(null);
  const [isDetailPanelVisible, setIsDetailPanelVisible] = useState(false);
  
  const [isLoading, setIsLoadingState] = useState(true);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<Record<string, string>>({});
  
  const setIsLoading = useCallback((loading: boolean) => {
    isLoadingBackendOp.current = loading;
    setIsLoadingState(loading);
  }, []);

  const memoizedNodeTypes = useMemo(() => nodeTypesDefinition, []);
  const defaultEdgeStyle = useMemo(() => ({ stroke: 'var(--edge-default-color)', strokeWidth: 1.5, transition: 'all 0.2s ease' }), []);
  const connectionLineStyle = useMemo(() => ({ stroke: 'var(--accent-main)', strokeWidth: 2 }), []);

  // --- HANDLERS UNIFICADOS Y CORREGIDOS ---

  const handleCreateOrUpdateRelationship = useCallback((label: string, isDirected: boolean) => {
    if (editingEdge) {
      // Actualizar arista existente
      setEdges(eds =>
        eds.map(edge =>
          edge.id === editingEdge.id
            ? {
                ...edge,
                label,
                markerEnd: isDirected ? { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' } : undefined,
              }
            : edge
        )
      );
    } else if (pendingConnection) {
      // **CORRECCIÓN DE TIPO**: Asegurarse de que source y target no son null
      if (!pendingConnection.source || !pendingConnection.target) return;
      
      // Crear nueva arista
      const newEdge: Edge = {
        id: `edge-${pendingConnection.source}-${pendingConnection.target}-${Date.now()}`,
        source: pendingConnection.source,
        target: pendingConnection.target,
        label,
        type: 'smoothstep',
        markerEnd: isDirected ? { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' } : undefined,
      };
      setEdges(eds => addEdge(newEdge, eds));
    }
    // Cerrar y limpiar estados
    setPendingConnection(null);
    setEditingEdge(null);
    setIsRelationshipModalOpen(false);
  }, [editingEdge, pendingConnection, setEdges]);
  
  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges(eds => eds.filter(e => e.id !== edgeId));
    setIsRelationshipModalOpen(false);
    setEditingEdge(null);
  }, [setEdges]);

  // --- RESTO DE LOS HOOKS Y FUNCIONES ---

  const onNodeClick = useCallback(
    (event: ReactMouseEvent, node: Node<DemoNodeData>) => {
      if (node.data?.rawJsonData) {
        setDetailsNode(node);
        setIsDetailPanelVisible(true);
      } else {
        setDetailsNode(null);
        setIsDetailPanelVisible(false);
      }
    },
    []
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach(change => {
        if (change.type === 'remove') {
          const nodeIdToRemove = change.id;
          if (uploadedImageUrls[nodeIdToRemove]) {
            URL.revokeObjectURL(uploadedImageUrls[nodeIdToRemove]);
            setUploadedImageUrls(prev => { const newState = { ...prev }; delete newState[nodeIdToRemove]; return newState; });
          }
          if (detailsNode?.id === nodeIdToRemove) {
            setDetailsNode(null); setIsDetailPanelVisible(false);
          }
        }
      });
      onNodesChangeReactFlow(changes);
    },
    [uploadedImageUrls, detailsNode, onNodesChangeReactFlow]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => onEdgesChangeReactFlow(changes),
    [onEdgesChangeReactFlow]
  );
  
  const handleCloseDetailPanel = useCallback(() => {
    setDetailsNode(null); setIsDetailPanelVisible(false);
  }, []);

  const onConnect: OnConnect = useCallback((params) => {
    // Cuando se completa una conexión, no creamos la arista inmediatamente.
    // Guardamos la conexión pendiente y abrimos el modal.
    setPendingConnection(params);
    setEditingEdge(null); // Aseguramos que no estamos editando
    setIsRelationshipModalOpen(true);
  }, []);

  const handleImageUploadForNode = useCallback(async (nodeId: string, file: File) => {
    if (uploadedImageUrls[nodeId]) URL.revokeObjectURL(uploadedImageUrls[nodeId]);
    try {
      const resizedBlob = await resizeAndCropImage(file, { maxWidth: 128, maxHeight: 128, quality: 0.85 });
      const resizedFile = new File([resizedBlob], file.name, { type: file.type });
      const newImageUrl = URL.createObjectURL(resizedFile);
      setUploadedImageUrls(prev => ({ ...prev, [nodeId]: newImageUrl }));
      setNodes(nds => nds.map(node => node.id === nodeId ? { ...node, data: { ...node.data, imageUrl: newImageUrl } } : node));
    } catch (error) {
      console.error("Error resizing image:", error);
      const newImageUrl = URL.createObjectURL(file);
      setUploadedImageUrls(prev => ({ ...prev, [nodeId]: newImageUrl }));
      setNodes(nds => nds.map(node => node.id === nodeId ? { ...node, data: { ...node.data, imageUrl: newImageUrl } } : node));
    }
  }, [setNodes, uploadedImageUrls]);

  useEffect(() => () => Object.values(uploadedImageUrls).forEach(URL.revokeObjectURL), [uploadedImageUrls]);

  const loadInitialGraph = useCallback(async (showFitView = true) => {
    if (isLoadingBackendOp.current) {
      console.log("loadInitialGraph: Operación de backend en progreso, ignorando carga inicial.");
      return;
    }
    setIsLoading(true);
    console.log("loadInitialGraph: Iniciando carga...");

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.warn("loadInitialGraph: No hay token.");
         setNodes([]); setEdges([]); 
         setIsLoading(false);
         return;
      }
      const response = await fetch(config.api.endpoints.graphData, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) {
        if (response.status === 401) {
          console.error("loadInitialGraph: Token inválido/expirado. Redirigiendo a login.");
          localStorage.removeItem('access_token');
          window.location.href = '/login';
          return;
        }
        throw new Error(`Error API (${response.status}): ${response.statusText}`);
      }
      const apiData = await response.json() as JsonData;
      console.log("loadInitialGraph: Datos API:", apiData);
      
      if (apiData && Array.isArray(apiData.nodes) && Array.isArray(apiData.edges)) {
        const initialNodes: Node<DemoNodeData>[] = apiData.nodes.map((nFromApi: any): Node<DemoNodeData> => {
          const nodeData: DemoNodeData = {
            name: nFromApi.data?.name || "Sin Nombre",
            typeDetails: nFromApi.data?.typeDetails || "Sin Detalles",
            status: nFromApi.data?.status || "normal",
            rawJsonData: nFromApi.data?.rawJsonData || {},
            imageUrl: nFromApi.data?.imageUrl,
            title: nFromApi.data?.title,
            icon: nFromApi.data?.icon,
            details: nFromApi.data?.details,
            location: nFromApi.data?.location,
            onImageUpload: nFromApi.type === 'person' ? handleImageUploadForNode : undefined,
          };
          return {
            id: String(nFromApi.id || Math.random().toString(36).substr(2, 9)),
            type: nFromApi.type || 'UnknownNode',
            position: nFromApi.position || { x: Math.random() * 400, y: Math.random() * 400 },
            data: nodeData,
            className: 'node-appear-static',
          };
        });
        const initialEdges: Edge[] = apiData.edges.map((e: any): Edge => ({
          id: String(e.id || `edge-${e.source}-${e.target}-${Date.now()}`),
          source: String(e.source), target: String(e.target), label: e.label || '',
          type: e.type || 'smoothstep', className: 'edge-appear-static',
          markerEnd: e.markerEnd || { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' },
          style: e.style || defaultEdgeStyle,
        }));
        
        console.log("loadInitialGraph: Nodos procesados:", initialNodes.length);
        setNodes(initialNodes);
        setEdges(initialEdges);

        if (showFitView && initialNodes.length > 0) {
          requestAnimationFrame(() => { reactFlowInstance.fitView({ padding: 0.2, duration: 0 }); });
        }
      } else {
        console.warn("loadInitialGraph: Datos del API no tienen la estructura esperada.");
        setNodes([]); setEdges([]);
      }
    } catch (error) {
      console.error("loadInitialGraph: Error:", error);
      setNodes([]); setEdges([]);
    } finally {
      setIsLoading(false);
    }
  }, [reactFlowInstance, setNodes, setEdges, handleImageUploadForNode, defaultEdgeStyle, setIsLoading]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token && !isLoadingBackendOp.current) {
        loadInitialGraph();
    } else if (!token) {
        setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadJsonToBackend = async (graphData: JsonData, mode: 'overwrite' | 'merge', originalFileName: string) => {
    console.log(`uploadJsonToBackend: Subiendo ${originalFileName}, modo: ${mode}`);
    if (isLoadingBackendOp.current) {
      console.log("uploadJsonToBackend: Operación de backend en progreso, ignorando.");
      return;
    }
    const token = localStorage.getItem('access_token');
    if (!token) { alert("Error de autenticación."); return; }
    
    setIsLoading(true);

    try {
      const response = await fetch(config.api.endpoints.loadJson, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ jsonData: graphData, mode }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
        throw new Error(`Fallo al enviar JSON (${response.status}): ${errorData.detail || response.statusText}`);
      }
      alert(`Archivo "${originalFileName}" procesado (${mode}).`);
      await loadInitialGraph(true);
      setFileName('');
    } catch (error: any) { console.error(`uploadJsonToBackend: Error ${mode}:`, error); alert(`Fallo al ${mode} datos: ${error.message}`); }
    finally { 
      setIsLoading(false);
    }
  };

  const handleFileDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type === 'application/json') {
      setPendingFile({ file, trigger: 'dragdrop' });
    } else if (file) {
      alert('Por favor, arrastra un archivo JSON válido.');
    }
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => { event.preventDefault(); event.stopPropagation(); }, []);

  const handleLoadBrujesJson = useCallback(() => {
    console.log("handleLoadBrujesJson: Abriendo diálogo de archivo...");
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (file) {
      setPendingFile({ file, trigger: 'brujes' });
    }
  }; 

  const handleUploadConfirm = async (mode: 'merge' | 'overwrite') => {
    if (!pendingFile) return;

    const { file, trigger } = pendingFile;
    const currentFileName = file.name;
    setFileName(currentFileName);
    setPendingFile(null);

    try {
      const text = await file.text();
      const parsedJson = JSON.parse(text) as any;

      if (trigger === 'brujes' || trigger === 'dragdrop') {
        console.log(`Procesando archivo: ${currentFileName}, modo: ${mode}`);
        
        // <-- FIX: Pasar la función de callback al procesador de nodos.
        const { node: newNodeFromProcessor } = processJsonToSinglePersonNode(
            parsedJson, 
            nodes, 
            handleImageUploadForNode
        );

        if (newNodeFromProcessor) {
          const nodeToSend = JSON.parse(JSON.stringify(newNodeFromProcessor));
          if (nodeToSend.data.onImageUpload) delete nodeToSend.data.onImageUpload;
          
          console.log("Nodo limpio para enviar a backend:", nodeToSend);
          await uploadJsonToBackend({ nodes: [nodeToSend], edges: [] }, mode, currentFileName);
        } else { 
          throw new Error("No se pudo procesar el JSON para crear un nodo de persona.");
        }
      }
    } catch (error) {
      console.error("Error al procesar el archivo seleccionado:", error);
      alert(error instanceof Error ? error.message : 'Error al procesar el archivo');
      setFileName('');
    }
  }; 

  const onEdgeClick: EdgeMouseHandler = useCallback((_event, edge) => {
    setEditingEdge(edge); 
    setPendingConnection(null); 
    setIsRelationshipModalOpen(true);
  }, []);

  const handleExportPDF = async () => {
    if (nodes.length === 0) { alert("No hay contenido para exportar."); return; }
    const viewportElement = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewportElement) { alert('Error: Viewport no encontrado.'); return; }
    setIsLoading(true);
    try {
      document.querySelectorAll<HTMLElement>('.react-flow__node').forEach(el => el.style.boxShadow = 'none');
      const canvas = await html2canvas(viewportElement, { logging: false, useCORS: true, backgroundColor: window.getComputedStyle(document.documentElement).getPropertyValue('--graph-bg').trim() || '#010409', scale: 1.5 });
      document.querySelectorAll<HTMLElement>('.react-flow__node').forEach(el => el.style.boxShadow = '');
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? 'l' : 'p', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${fileName.replace(/\.json$/i, '') || 'grafo'}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error: any) { console.error('Error PDF:', error); alert(`Fallo PDF: ${error.message || error}`); document.querySelectorAll<HTMLElement>('.react-flow__node').forEach(el => el.style.boxShadow = ''); }
    finally { setIsLoading(false); }
  };

  const isValidConnection = (connection: Connection) => connection.source !== connection.target;
  const handleZoomIn = useCallback(() => reactFlowInstance.zoomIn({ duration: 300 }), [reactFlowInstance]);
  const handleZoomOut = useCallback(() => reactFlowInstance.zoomOut({ duration: 300 }), [reactFlowInstance]);
  const handleFitView = useCallback(() => reactFlowInstance.fitView({ padding: 0.2, duration: 500 }), [reactFlowInstance]);

  const sourceNodeForModal = editingEdge ? nodes.find(n => n.id === editingEdge.source) : pendingConnection ? nodes.find(n => n.id === pendingConnection.source) : null;
  const targetNodeForModal = editingEdge ? nodes.find(n => n.id === editingEdge.target) : pendingConnection ? nodes.find(n => n.id === pendingConnection.target) : null;
  const sourceNodeNameForModal = sourceNodeForModal?.data?.name || 'Nodo Origen';
  const targetNodeNameForModal = targetNodeForModal?.data?.name || 'Nodo Destino';

  const handleFileMenuAction = useCallback((action: FileMenuActionType) => {
    if (action === FileMenuAction.LOAD_BRUJES_JSON) handleLoadBrujesJson();
    else if (action === FileMenuAction.EXPORT_PDF) handleExportPDF();
    else console.log("Acción Archivo no implementada:", action);
  }, [handleLoadBrujesJson, handleExportPDF]);

  const handleEditMenuAction = useCallback((action: EditMenuActionType) => {
    console.log("Acción Edición no implementada:", action);
    if (action === EditMenuAction.SELECT_ALL) {
      setNodes(nds => nds.map(n => ({ ...n, selected: true })));
      setEdges(eds => eds.map(e => ({ ...e, selected: true })));
    }
  }, [setNodes, setEdges]);

  const handleViewMenuAction = useCallback((action: ViewMenuActionType) => {
    if (action === ViewMenuAction.ZOOM_IN) handleZoomIn();
    else if (action === ViewMenuAction.ZOOM_OUT) handleZoomOut();
    else if (action === ViewMenuAction.FIT_VIEW) handleFitView();
    else console.log("Acción Vista no implementada:", action);
  }, [handleZoomIn, handleZoomOut, handleFitView]);

  let mainContent;
  if (isLoading) {
    mainContent = <div className="flex items-center justify-center h-full w-full text-text-secondary">Cargando datos del grafo...</div>;
  } else if (nodes.length === 0) {
    mainContent = (
      <div className="placeholder-message">
        <UploadCloud size={64} className="mx-auto mb-6 text-text-secondary" />
        <p className="mb-2">Arrastra JSON (Formato Brujes) o usa "Archivo" → "Cargar JSON".</p>
        {fileName && <p className="text-accent-main mt-2">Procesando: {fileName}</p>}
      </div>
    );
  } else {
    mainContent = (
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={memoizedNodeTypes}
        fitView={false} minZoom={0.1} maxZoom={3}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
        className="graph-viewport"
        connectionLineComponent={CustomConnectionLine}
        connectionLineStyle={connectionLineStyle}
        deleteKeyCode={['Backspace', 'Delete']}
        isValidConnection={isValidConnection}
      >
        <Background />
        <Controls className="!left-auto !right-4 !bottom-4 !m-0 transform-none" />
      </ReactFlow>
    );
  }

  const detailsPanelContent = useMemo(() => {
    if (!detailsNode?.data?.rawJsonData) return null;

    const renderedKeys = new Set<string>();

    return Object.entries(detailsNode.data.rawJsonData).map(([sectionKey, sectionValue]) => {
      if (!sectionValue || typeof sectionValue !== 'object' || Object.keys(sectionValue).length === 0) return null;

      const flatSection = flattenObject(sectionValue);
      if (Object.keys(flatSection).length === 0) return null;

      const sectionItems = Object.entries(flatSection).map(([key, value]) => {
        if (value === null || value === undefined || String(value).trim() === '') return null;

        const displayKey = formatKeyForDisplay(key);

        if (renderedKeys.has(displayKey)) {
          return null;
        }
        renderedKeys.add(displayKey);

        return (
          <div key={key} className="grid grid-cols-3 gap-2 items-start">
            <span className="text-text-secondary truncate pr-1 col-span-1" title={key}>
              {displayKey}:
            </span>
            <span className="text-text-primary col-span-2 break-words">
              {normalizeValueToSentenceCase(String(value))}
            </span>
          </div>
        );
      }).filter(Boolean);

      if (sectionItems.length === 0) {
        return null;
      }

      return (
        <details key={sectionKey} className="group" open>
          <summary className="cursor-pointer list-none flex items-center gap-2 text-accent-main hover:brightness-125 transition-all mb-1">
            <span className="text-accent-warn">$</span>
            <span className="uppercase font-bold tracking-widest">{formatKeyForDisplay(sectionKey)}</span>
            <div className="flex-grow border-b border-dashed border-border-secondary/50"></div>
          </summary>
          <div className="pl-4 pt-2 space-y-1.5">
            {sectionItems}
          </div>
        </details>
      );
    }).filter(Boolean);
  }, [detailsNode]);

  return (
    <div className="graph-page-container">
      <header className="h-11 w-full bg-bg-secondary border-b border-border-primary flex-shrink-0 z-50">
        <TopMenuBar
          onFileMenuSelect={handleFileMenuAction}
          onEditMenuSelect={handleEditMenuAction}
          onViewMenuSelect={handleViewMenuAction}
          isGraphEmpty={nodes.length === 0 && !isLoading}
        />
      </header>
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileSelected} />
        <PanelGroup direction="horizontal" className="flex-grow min-h-0 p-2 gap-2">
          <Panel defaultSize={isDetailPanelVisible ? 70 : 100} minSize={30} order={1} className="relative rounded-md overflow-hidden">
            <div className="graph-viewport-wrapper" onDrop={handleFileDrop} onDragOver={handleDragOver}>
              {mainContent}
            </div>
          </Panel>
          {isDetailPanelVisible && detailsNode && (
            <>
              <PanelResizeHandle className="w-2 bg-border-primary hover:bg-accent-main focus:outline-none focus:ring-1 focus:ring-accent-main transition-colors flex items-center justify-center group">
                <div className="w-[2px] h-10 bg-bg-tertiary rounded-full group-hover:bg-accent-main transition-colors"></div>
              </PanelResizeHandle>
              <Panel defaultSize={30} minSize={20} maxSize={50} order={2} id="details-panel-resizable" className="rounded-md overflow-hidden">
                <div className="bg-bg-secondary h-full flex flex-col border-l-2 border-accent-main">
                  <div className="p-4 border-b-2 border-border-primary flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-bold text-text-primary font-mono tracking-wider truncate" title={detailsNode.data.name}>
                      // DATA LOG: {detailsNode.data.name}
                    </h3>
                    <button onClick={handleCloseDetailPanel} className="text-text-secondary hover:text-accent-danger transition-colors p-1 rounded-sm hover:bg-bg-tertiary" aria-label="Cerrar panel">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="flex-grow overflow-auto p-4 font-mono text-xs space-y-3 scrollbar-thin scrollbar-thumb-border-secondary scrollbar-track-bg-tertiary">
                    {detailsPanelContent}
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
            setEditingEdge(null);
            setPendingConnection(null);
          }}
          sourceNodeName={sourceNodeNameForModal}
          targetNodeName={targetNodeNameForModal}
          initialLabel={(editingEdge?.label as string) || ''}
          initialIsDirected={editingEdge ? editingEdge.markerEnd !== undefined : true}
          onSubmit={handleCreateOrUpdateRelationship}
          onDelete={editingEdge ? handleDeleteEdge.bind(null, editingEdge.id) : undefined}
        />
        
        <UploadConfirmModal
          isOpen={!!pendingFile}
          fileName={pendingFile?.file.name || ''}
          onConfirm={handleUploadConfirm}
          onCancel={() => setPendingFile(null)}
        />
      </main>
    </div>
  );
};

const GraphPageWithProvider: React.FC = () => (
  <ReactFlowProvider>
    <GraphPage />
  </ReactFlowProvider>
);

export default GraphPageWithProvider;