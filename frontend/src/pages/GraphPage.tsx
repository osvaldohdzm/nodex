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
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type NodeProps,
  type NodeTypes,
  applyNodeChanges,
  applyEdgeChanges,
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
import TopMenuBar, {
  type FileMenuActionType,
  type EditMenuActionType,
  type ViewMenuActionType,
  FileMenuAction,
  EditMenuAction,
  ViewMenuAction
} from '../components/layout/TopMenuBar';

import { JsonData, DemoNodeData } from '../types/graph';
import { processJsonToSinglePersonNode } from '../utils/jsonProcessor';
import { deepSearchInObject, flattenObject, formatKeyForDisplay, normalizeValueToSentenceCase } from '../utils/dataUtils';
import { resizeAndCropImage } from '../utils/imageUtils';
import config from '../config';

const nodeTypesDefinition: NodeTypes = {
  person: PersonNodeComponent as ComponentType<NodeProps<DemoNodeData>>,
  company: CompanyNodeComponent as ComponentType<NodeProps<DemoNodeData>>,
};

export const GraphPage: React.FC = () => {
  const reactFlowInstance = useReactFlow<DemoNodeData>(); // Genérico para el tipo de DATOS del nodo
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // CORRECCIÓN IMPORTANTE: El genérico para useNodesState es el TIPO DE DATOS del nodo.
  const [nodes, setNodes, onNodesChangeReactFlow] = useNodesState<DemoNodeData>([]);
  const [edges, setEdges, onEdgesChangeReactFlow] = useEdgesState<Edge[]>([]);

  const [fileName, setFileName] = useState<string>('');
  const [jsonLoadConfig, setJsonLoadConfig] = useState<{ mode: 'merge' | 'overwrite'; trigger: 'brujes' } | null>(null);

  const [isRelationshipModalOpen, setIsRelationshipModalOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [editingEdge, setEditingEdge] = useState<Edge | null>(null);

  const [detailsNode, setDetailsNode] = useState<Node<DemoNodeData> | null>(null); // Node<DemoNodeData> es correcto aquí
  const [isDetailPanelVisible, setIsDetailPanelVisible] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<Record<string, string>>({});

  const memoizedNodeTypes = useMemo(() => nodeTypesDefinition, []);
  const defaultEdgeStyle = useMemo(() => ({ stroke: 'var(--edge-default-color)', strokeWidth: 1.5, transition: 'all 0.2s ease' }), []);
  const connectionLineStyle = useMemo(() => ({ stroke: 'var(--accent-main)', strokeWidth: 2 }), []);

  // CORRECCIÓN: NodeMouseHandler SÍ es genérico y toma el tipo de DATOS del nodo.
  const onNodeClick = useCallback<NodeMouseHandler>(
    (_event: ReactMouseEvent, node: Node<DemoNodeData>) => {
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
      onNodesChangeReactFlow(changes); // Usar el handler de useNodesState
    },
    [uploadedImageUrls, detailsNode, onNodesChangeReactFlow]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => onEdgesChangeReactFlow(changes), // Usar el handler de useEdgesState
    [onEdgesChangeReactFlow]
  );

  const handleCloseDetailPanel = useCallback(() => {
    setDetailsNode(null); setIsDetailPanelVisible(false);
  }, []);

  const onConnect: OnConnect = useCallback((params) => {
    if (!params.source || !params.target || params.source === params.target) return;
    const newEdge: Edge = {
      id: `edge-${params.source}-${params.target}-${Date.now()}`,
      source: params.source, target: params.target, type: 'smoothstep', style: defaultEdgeStyle,
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' },
    };
    setEdges(eds => addEdge(newEdge, eds));

    // nodes aquí es Node<DemoNodeData>[]
    const sourceNodeInstance = nodes.find(n => n.id === params.source);
    const targetNodeInstance = nodes.find(n => n.id === params.target);
    if (sourceNodeInstance?.type === 'person' && targetNodeInstance?.type === 'person') {
      setEditingEdge(newEdge); setIsRelationshipModalOpen(true);
    }
  }, [nodes, setEdges, defaultEdgeStyle]);

  const handleCreateOrUpdateRelationship = useCallback((label: string, isDirected: boolean) => {
    if (editingEdge) {
      const finalEdge: Edge = {
        ...editingEdge, label,
        markerEnd: isDirected ? { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' } : undefined,
        style: defaultEdgeStyle,
      };
      setEdges(eds => eds.map(edge => (edge.id === editingEdge.id ? finalEdge : edge)));
    }
    setEditingEdge(null); setIsRelationshipModalOpen(false);
  }, [editingEdge, setEdges, defaultEdgeStyle]);

  const handleImageUploadForNode = useCallback(async (nodeId: string, file: File) => {
    if (uploadedImageUrls[nodeId]) URL.revokeObjectURL(uploadedImageUrls[nodeId]);
    try {
      const resizedBlob = await resizeAndCropImage(file, { maxWidth: 128, maxHeight: 128, quality: 0.85 });
      const resizedFile = new File([resizedBlob], file.name, { type: file.type });
      const newImageUrl = URL.createObjectURL(resizedFile);
      setUploadedImageUrls(prev => ({ ...prev, [nodeId]: newImageUrl }));
      // Cuando actualizas nodos, asegúrate que el formato sea Node<DemoNodeData>
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
    console.log("loadInitialGraph: Iniciando carga...");
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.warn("loadInitialGraph: No hay token, saltando carga.");
        setIsLoading(false); setNodes([]); setEdges([]); return;
      }
      const response = await fetch(config.api.endpoints.graphData, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) {
        console.error(`loadInitialGraph: Error en respuesta del API - ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch graph data: ${response.statusText}`);
      }
      
      const apiData = await response.json() as JsonData; // data.nodes debería ser Node<DemoNodeData>[] del backend
      console.log("loadInitialGraph: Datos recibidos del API:", apiData);
      
      if (apiData.nodes && Array.isArray(apiData.nodes) && apiData.edges && Array.isArray(apiData.edges)) {
        // Mapeo cuidadoso para asegurar que cada nodo se ajuste a Node<DemoNodeData>
        const initialNodes: Node<DemoNodeData>[] = apiData.nodes.map((nFromApi: any) => {
          // Validar y construir el objeto 'data' (DemoNodeData)
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
            id: String(nFromApi.id),
            type: nFromApi.type,
            position: nFromApi.position || { x: Math.random() * 400, y: Math.random() * 400 }, // Fallback position
            data: nodeData,
            className: 'node-appear-static',
            // ...otras propiedades de Node si el backend las envía (width, height, selected, etc.)
          };
        });

        const initialEdges: Edge[] = apiData.edges.map((e: any) => ({
          id: String(e.id),
          source: String(e.source),
          target: String(e.target),
          label: e.label,
          type: e.type || 'smoothstep',
          className: 'edge-appear-static',
          markerEnd: e.markerEnd || { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' },
          style: e.style || defaultEdgeStyle,
        }));
        
        console.log("loadInitialGraph: Nodos procesados para setNodes:", initialNodes);
        console.log("loadInitialGraph: Aristas procesadas para setEdges:", initialEdges);

        setNodes(initialNodes);
        setEdges(initialEdges);

        if (showFitView && initialNodes.length > 0) {
          setTimeout(() => {
            console.log("loadInitialGraph: Ejecutando fitView");
            reactFlowInstance.fitView({ padding: 0.2, duration: 0 });
          }, 100); // Aumentar un poco el delay para asegurar que el DOM esté listo
        } else if (initialNodes.length === 0) {
            console.log("loadInitialGraph: No hay nodos para fitView.");
        }
      } else {
        console.warn("loadInitialGraph: Datos del API no tienen la estructura esperada (nodes/edges arrays).", apiData);
        setNodes([]); setEdges([]);
      }
    } catch (error) {
      console.error("loadInitialGraph: Error cargando datos iniciales del grafo:", error);
      setNodes([]); setEdges([]); // Limpiar en caso de error
    }
    finally { setIsLoading(false); console.log("loadInitialGraph: Carga finalizada."); }
  }, [reactFlowInstance, setNodes, setEdges, handleImageUploadForNode, defaultEdgeStyle]); // defaultEdgeStyle es dependencia

  useEffect(() => { loadInitialGraph(); }, [loadInitialGraph]); // Cargar al montar

  const uploadJsonToBackend = async (graphData: JsonData, mode: 'overwrite' | 'merge', originalFileName: string) => {
    console.log(`uploadJsonToBackend: Subiendo ${originalFileName}, modo: ${mode}`);
    const token = localStorage.getItem('access_token');
    if (!token) { alert("Error de autenticación."); return; }
    setIsLoading(true);
    try {
      const response = await fetch(config.api.endpoints.loadJson, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ jsonData: graphData, mode }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Error desconocido del servidor' }));
        throw new Error(`Fallo al enviar JSON al backend: ${errorData.detail || response.statusText}`);
      }
      alert(`Archivo "${originalFileName}" procesado por el backend (${mode}). El grafo se refrescará.`);
      await loadInitialGraph(true); // Refrescar el grafo
      setFileName('');
    } catch (error: any) {
      console.error(`uploadJsonToBackend: Error en modo ${mode}:`, error);
      alert(`Fallo al ${mode} datos JSON en backend: ${error.message}`);
    }
    finally { setIsLoading(false); }
  };

  const handleFileDrop = useCallback(async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file && file.type === 'application/json') {
      const currentFileName = file.name; setFileName(currentFileName);
      try {
        const text = await file.text(); const parsedJson = JSON.parse(text) as any;
        const userChoiceIsMerge = window.confirm(`"${currentFileName}" detectado.\nOK para AGREGAR, Cancelar para SOBRESCRIBIR.`);
        const mode = userChoiceIsMerge ? 'merge' : 'overwrite';
        
        // processJsonToSinglePersonNode espera Node<DemoNodeData>[] para existingNodes
        const { node: newNode } = processJsonToSinglePersonNode(parsedJson, nodes);
        if (newNode) {
          // newNode ya es Node<DemoNodeData> | null
          await uploadJsonToBackend({ nodes: [newNode], edges: [] }, mode, currentFileName);
        } else { alert("No se pudo procesar el JSON para crear un nodo de persona."); setFileName(''); }
      } catch (error) { alert('JSON inválido o error al procesar.'); setFileName(''); }
    } else alert('Arrastra un archivo JSON válido.');
  }, [nodes, uploadJsonToBackend]); // 'nodes' es dependencia

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => { event.preventDefault(); event.stopPropagation(); }, []);

  const handleLoadBrujesJson = useCallback(() => {
    const userChoiceIsMerge = window.confirm("Modo de carga (Brujes JSON):\nOK para AGREGAR, Cancelar para SOBRESCRIBIR.");
    const mode = userChoiceIsMerge ? 'merge' : 'overwrite';
    setJsonLoadConfig({ mode, trigger: 'brujes' });
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (file) {
      const currentFileName = file.name; setFileName(currentFileName);
      try {
        const text = await file.text(); const parsedJson = JSON.parse(text) as any;
        if (jsonLoadConfig?.trigger === 'brujes') {
          const { node: newNodeFromProcessor } = processJsonToSinglePersonNode(parsedJson, nodes);
          if (newNodeFromProcessor) {
            // newNodeFromProcessor ya es Node<DemoNodeData> | null
            // Asegurar que onImageUpload se añade si es un nodo de persona
            const nodeWithUploadData: Node<DemoNodeData> = {
              ...newNodeFromProcessor,
              data: {
                ...newNodeFromProcessor.data,
                onImageUpload: newNodeFromProcessor.type === 'person' ? handleImageUploadForNode : undefined,
              }
            };
            await uploadJsonToBackend({ nodes: [nodeWithUploadData], edges: [] }, jsonLoadConfig.mode, currentFileName);
          } else { alert("No se pudo procesar el JSON para crear un nodo."); setFileName(''); }
          setJsonLoadConfig(null);
        }
      } catch (error) { alert('JSON inválido o error.'); setFileName(''); if (jsonLoadConfig) setJsonLoadConfig(null); }
    } else if (jsonLoadConfig) setJsonLoadConfig(null);
  };

  const onEdgeClick: EdgeMouseHandler = useCallback((_event, edge) => {
    setEditingEdge(edge); setPendingConnection(null); setIsRelationshipModalOpen(true);
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

  // CORRECCIÓN: Acceder a .data.name para el nombre del nodo
  const sourceNodeForModal = editingEdge ? nodes.find(n => n.id === editingEdge.source) : null;
  const targetNodeForModal = editingEdge ? nodes.find(n => n.id === editingEdge.target) : null;
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

  if (isLoading && nodes.length === 0 && !localStorage.getItem('access_token')) {
    return <div className="flex items-center justify-center h-screen w-full text-text-secondary">Inicia sesión para cargar el grafo.</div>;
  }
  if (isLoading && nodes.length === 0 && localStorage.getItem('access_token')) {
    return <div className="flex items-center justify-center h-screen w-full text-text-secondary">Cargando datos del grafo...</div>;
  }

  return (
    <div className="graph-page-container">
      <TopMenuBar
        onFileMenuSelect={handleFileMenuAction}
        onEditMenuSelect={handleEditMenuAction}
        onViewMenuSelect={handleViewMenuAction}
        isGraphEmpty={nodes.length === 0}
      />
      <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleFileSelected} />
      <PanelGroup direction="horizontal" className="flex-grow min-h-0 p-2 gap-2">
        <Panel defaultSize={isDetailPanelVisible ? 70 : 100} minSize={30} order={1} className="relative rounded-md overflow-hidden">
          <div className="graph-viewport-wrapper" onDrop={handleFileDrop} onDragOver={handleDragOver}>
            <ReactFlow
              nodes={nodes} // 'nodes' ya es Node<DemoNodeData>[]
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
              {nodes.length === 0 && !isLoading && (
                <div className="placeholder-message">
                  <UploadCloud size={64} className="mx-auto mb-6 text-text-secondary" />
                  <p className="mb-2">Arrastra JSON (Formato Brujes) o usa &quot;Archivo&quot; &rarr; &quot;Cargar JSON&quot;.</p>
                  {fileName && <p className="text-accent-main mt-2">Procesando: {fileName}</p>}
                </div>
              )}
            </ReactFlow>
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
                  {Object.entries(detailsNode.data.rawJsonData || {}).map(([sectionKey, sectionValue]) => {
                    if (!sectionValue || typeof sectionValue !== 'object' || Object.keys(sectionValue).length === 0) return null;
                    const flatSection = flattenObject(sectionValue);
                    if (Object.keys(flatSection).length === 0) return null;
                    return (
                      <details key={sectionKey} className="group" open>
                        <summary className="cursor-pointer list-none flex items-center gap-2 text-accent-main hover:brightness-125 transition-all mb-1">
                          <span className="text-accent-warn">$</span>
                          <span className="uppercase font-bold tracking-widest">{formatKeyForDisplay(sectionKey)}</span>
                          <div className="flex-grow border-b border-dashed border-border-secondary/50"></div>
                        </summary>
                        <div className="pl-4 pt-2 space-y-1.5">
                          {Object.entries(flatSection).map(([key, value]) => {
                            if (value === null || value === undefined || String(value).trim() === '') return null;
                            return (
                              <div key={key} className="grid grid-cols-3 gap-2 items-start">
                                <span className="text-text-secondary truncate pr-1 col-span-1">{formatKeyForDisplay(key)}:</span>
                                <span className="text-text-primary col-span-2 break-words">{normalizeValueToSentenceCase(String(value))}</span>
                              </div>
                            );
                          }).filter(Boolean)}
                        </div>
                      </details>
                    );
                  })}
                </div>
              </div>
            </Panel>
          </>
        )}
      </PanelGroup>
      <RelationshipModal
        isOpen={isRelationshipModalOpen}
        onClose={() => { setIsRelationshipModalOpen(false); setPendingConnection(null); setEditingEdge(null); }}
        onSubmit={handleCreateOrUpdateRelationship}
        sourceNodeName={sourceNodeNameForModal} targetNodeName={targetNodeNameForModal}
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