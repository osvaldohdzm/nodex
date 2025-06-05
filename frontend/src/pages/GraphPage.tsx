// frontend/src/pages/GraphPage.tsx
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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

const nodeTypes = {
  person: PersonNode,
  company: CompanyNode,
};

// --- (JsonData and OnlineProfile interfaces remain the same) ---
interface JsonData {
  _id?: { $oid: string };
  curp_online?: { data?: { registros?: Array<any> } };
  ine1?: { data?: Array<any> };
  buro1?: { data?: Array<{ comercios?: Array<any>; domicilios?: Array<any> }> };
  buro2?: { data?: Array<{ comercios2?: Array<any>; domicilios?: Array<any> }> };
  pasaportes2022?: { data?: Array<any> };
  pasaportes2023?: { data?: Array<any> };
  internet1?: { data?: { ResultadosGoogle?: { resultados?: Array<any> }; ResultadosBing?: { [key: string]: any } } };
  internet2?: { data?: Array<any> };
  socios_empresas?: { data?: { datos_subconsulta?: Array<any>; socios?: Array<any> } };
  [key: string]: any;
}

interface OnlineProfile {
  link: string;
  title: string;
  snippet?: string;
  source: string;
}
// --- (defaultNodes and defaultEdges remain the same) ---
const defaultNodes: Node[] = [
  { id: 'center-hub', type: 'company', position: { x: 400, y: 200 }, data: { name: 'Nodex Central Hub', location: 'Cyber Espacio', details: { info: 'Punto de partida de la demostración.'} }, className: 'node-appear' },
  { id: 'analyst-1', type: 'person', position: { x: 150, y: 50 }, data: { name: 'Analista Alpha', title: 'IA de Datos', details: { skill: 'Análisis Predictivo'} }, className: 'node-appear' },
  { id: 'data-stream-A', type: 'company', position: { x: 100, y: 350 }, data: { name: 'Flujo de Datos A', location: 'Sector Gamma', details: { type: 'Información encriptada'} }, className: 'node-appear' },
  { id: 'analyst-2', type: 'person', position: { x: 650, y: 50 }, data: { name: 'Operador Beta', title: 'Vigilancia de Red', details: { skill: 'Seguridad de Redes'} }, className: 'node-appear' },
  { id: 'data-stream-B', type: 'company', position: { x: 700, y: 350 }, data: { name: 'Flujo de Datos B', location: 'Sector Delta', details: { type: 'Comunicaciones Seguras'} }, className: 'node-appear' },
];

const defaultEdges: Edge[] = [
  { id: 'e-hub-analyst1', source: 'center-hub', target: 'analyst-1', label: 'Asigna Tarea', type: 'smoothstep', animated: true, className: 'edge-appear', style: { stroke: 'var(--accent-green)', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-green)' } },
  { id: 'e-hub-datastreamA', source: 'center-hub', target: 'data-stream-A', label: 'Monitorea', type: 'smoothstep', className: 'edge-appear', style: { stroke: 'var(--accent-purple)' }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-purple)' } },
  { id: 'e-analyst1-datastreamA', source: 'analyst-1', target: 'data-stream-A', label: 'Analiza', type: 'smoothstep', className: 'edge-appear' },
  { id: 'e-hub-analyst2', source: 'center-hub', target: 'analyst-2', label: 'Coordina con', type: 'smoothstep', animated: true, className: 'edge-appear', style: { stroke: 'var(--accent-green)', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-green)' } },
  { id: 'e-hub-datastreamB', source: 'center-hub', target: 'data-stream-B', label: 'Supervisa', type: 'smoothstep', className: 'edge-appear', style: { stroke: 'var(--accent-purple)' }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-purple)' } },
  { id: 'e-analyst2-datastreamB', source: 'analyst-2', target: 'data-stream-B', label: 'Protege', type: 'smoothstep', className: 'edge-appear' },
  { id: 'e-analyst1-analyst2', source: 'analyst-1', target: 'analyst-2', label: 'Colabora', type: 'smoothstep', className: 'edge-appear', style: { stroke: 'var(--accent-orange)', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-orange)' } },
];

export const GraphPage: React.FC = () => {
  const firstLoadFitViewDone = useRef(false);
  const [jsonData, setJsonData] = useState<JsonData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState([]);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState([]);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [isDemoDataVisible, setIsDemoDataVisible] = useState(true);
  
  const { fitView, getNodes, getEdges } = useReactFlow();
  const demoLoadedRef = useRef(false);
  const animationCleanupRef = useRef<(() => void) | null>(null);

  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdges((eds) => addEdge({
          ...params,
          id: `user-e-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: 'smoothstep', animated: false, style: { stroke: 'var(--edge-default-color)', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' },
          className: 'edge-appear-static'
        }, eds));
      }
    },
    [setEdges]
  );

  const processJsonToGraph = useCallback((data: JsonData): { initialNodes: Node[]; initialEdges: Edge[] } => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const nodeIds = new Set<string>();
    let edgeIdCounter = Date.now(); 

    const addNodeSafely = (node: Node) => {
      const uniqueNodeId = `user-node-${node.id}`; 
      if (!nodeIds.has(uniqueNodeId)) {
        newNodes.push({ ...node, id: uniqueNodeId, className: 'node-appear' }); 
        nodeIds.add(uniqueNodeId);
      } else {
        const existingNodeIndex = newNodes.findIndex(n => n.id === uniqueNodeId);
        if (existingNodeIndex !== -1) {
          newNodes[existingNodeIndex] = {
            ...newNodes[existingNodeIndex], ...node, id: uniqueNodeId,
            data: { ...newNodes[existingNodeIndex].data, ...node.data, details: { ...newNodes[existingNodeIndex].data.details, ...node.data.details } }
          };
        }
      }
    };

    const addEdgeInternal = (sourceId: string, targetId: string, label: string, edgeData?: any) => {
      const prefixedSourceId = nodeIds.has(`user-node-${sourceId}`) ? `user-node-${sourceId}` : sourceId;
      const prefixedTargetId = nodeIds.has(`user-node-${targetId}`) ? `user-node-${targetId}` : targetId;

      if (nodeIds.has(prefixedSourceId) && nodeIds.has(prefixedTargetId) && prefixedSourceId !== prefixedTargetId) {
        const edgeId = `user-e-${edgeIdCounter++}-${prefixedSourceId.slice(-10)}-${prefixedTargetId.slice(-10)}-${label.replace(/[^a-zA-Z0-9]/g, '_').slice(0,10)}`;
        newEdges.push({
          id: edgeId, source: prefixedSourceId, target: prefixedTargetId, label,
          type: 'smoothstep', animated: false, style: { stroke: 'var(--edge-default-color)', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' },
          data: edgeData, className: 'edge-appear' 
        });
      }
    };
    
    if (data && Object.keys(data).length > 0) {
        const baseId = data._id?.$oid || 'parsedData'; 
        addNodeSafely({ 
            id: `${baseId}-main`, type: 'person', position: { x: 100, y: 100 }, 
            data: { name: `Processed: ${baseId.substring(0,10)}`, title: 'Main Entity', details: { fullJson: data } } 
        });

        if (newNodes.length > 0 && data.buro1?.data?.[0]?.comercios?.[0]) {
            const comercio = data.buro1.data[0].comercios[0];
            const comercioName = (comercio.institucion || 'ComercioBuro1').replace(/\W/g, '');
            const comercioId = `${baseId}-buro-${comercioName}`;
            addNodeSafely({ 
                id: comercioId, type: 'company', position: { x: 350, y: 100 }, 
                data: { name: comercio.institucion || 'Buro Co.', location: 'Buró', details: { ...comercio, source: 'buro1' } } 
            });
            addEdgeInternal(`${baseId}-main`, comercioId, 'Rel. Buró');
        }
    }
    console.log(`[processJsonToGraph] Generated ${newNodes.length} nodes, ${newEdges.length} edges.`);
    return { initialNodes: newNodes, initialEdges: newEdges };
  }, []);

  const animateGraphLoad = useCallback((nodesToLoad: Node[], edgesToLoad: Edge[], isOverwrite: boolean) => {
    if (animationCleanupRef.current) {
      animationCleanupRef.current();
    }
    setIsLoadingGraph(true);

    const currentInternalNodes = getNodes();
    const currentInternalEdges = getEdges();
    
    let targetNodes = isOverwrite ? [] : [...currentInternalNodes];
    let targetEdges = isOverwrite ? [] : [...currentInternalEdges];

    const finalNodesMap = new Map(targetNodes.map(n => [n.id, n]));
    nodesToLoad.forEach(n => finalNodesMap.set(n.id, {...finalNodesMap.get(n.id), ...n, data: {...finalNodesMap.get(n.id)?.data, ...n.data}}));
    
    const finalEdgesMap = new Map(targetEdges.map(e => [e.id, e]));
    edgesToLoad.forEach(e => finalEdgesMap.set(e.id, {...finalEdgesMap.get(e.id), ...e}));

    const finalNodes = Array.from(finalNodesMap.values());
    const finalEdges = Array.from(finalEdgesMap.values());
    
    setNodes(isOverwrite ? [] : currentNodes => currentNodes.filter(cn => finalNodesMap.has(cn.id)));
    setEdges(isOverwrite ? [] : currentEdges => currentEdges.filter(ce => finalEdgesMap.has(ce.id)));
    
    let nodeTimeoutId: NodeJS.Timeout | null = null;
    let edgeTimeoutId: NodeJS.Timeout | null = null;

    const batchAdd = (items: any[], setter: React.Dispatch<React.SetStateAction<any[]>>, batchSize: number, delay: number, onDone: () => void) => {
      let i = 0;
      function nextBatch() {
        if (i < items.length) {
          const batch = items.slice(i, Math.min(i + batchSize, items.length));
          setter(prev => {
            const prevMap = new Map(prev.map(item => [item.id, item]));
            batch.forEach(item => prevMap.set(item.id, item));
            return Array.from(prevMap.values());
          });
          i += batch.length;
          if (setter === setNodes) nodeTimeoutId = setTimeout(nextBatch, delay);
          else edgeTimeoutId = setTimeout(nextBatch, delay);
        } else {
          onDone();
        }
      }
      nextBatch();
    };

    setTimeout(() => { 
        batchAdd(finalNodes, setNodes, Math.max(1, Math.floor(finalNodes.length / 15)), 15, () => {
            batchAdd(finalEdges, setEdges, Math.max(1, Math.floor(finalEdges.length / 15)), 15, () => {
                setIsLoadingGraph(false);
                console.log(`Animated graph load complete (${isOverwrite ? 'overwrite' : 'merge'}).`);
                setTimeout(() => {
                    fitView({ duration: 600, padding: 0.15 });
                    firstLoadFitViewDone.current = true; 
                }, 100);
            });
        });
    }, 50);

    animationCleanupRef.current = () => {
      if (nodeTimeoutId) clearTimeout(nodeTimeoutId);
      if (edgeTimeoutId) clearTimeout(edgeTimeoutId);
      setIsLoadingGraph(false);
    };
    return animationCleanupRef.current;
  }, [getNodes, getEdges, setNodes, setEdges, fitView]);

  const handleJsonUploaded = useCallback((uploadedData: JsonData, name?: string, mode: 'overwrite' | 'merge' = 'overwrite') => {
    setJsonData(uploadedData);
    if (name) setFileName(name);
    setIsDemoDataVisible(false);
    firstLoadFitViewDone.current = false;
    
    const { initialNodes, initialEdges } = processJsonToGraph(uploadedData);

    if (initialNodes.length > 0 || initialEdges.length > 0) {
      animateGraphLoad(initialNodes, initialEdges, mode === 'overwrite');
    } else {
      if (mode === 'overwrite') {
        setNodes([]);
        setEdges([]);
      }
      setIsLoadingGraph(false);
      console.warn("Uploaded JSON resulted in no nodes or edges.");
    }
  }, [processJsonToGraph, animateGraphLoad, setNodes, setEdges]);

  useEffect(() => {
    if (isDemoDataVisible && !demoLoadedRef.current) {
      console.log("Loading default demo data (useEffect).");
      firstLoadFitViewDone.current = false;
      animateGraphLoad(
        defaultNodes.map(n => ({...n, data: {...n.data}})),
        defaultEdges.map(e => ({...e})),
        true
      );
      demoLoadedRef.current = true;
    }
  }, [isDemoDataVisible, animateGraphLoad]);

  useEffect(() => {
    return () => {
      if (animationCleanupRef.current) {
        animationCleanupRef.current();
      }
    };
  }, []);

  return (
    <div className="graph-page-container">
      <div className="upload-panel">
        <h2 className="panel-title">Cargar Archivo JSON del Grafo</h2>
        <JsonUploadButton onJsonUploaded={(data, name) => handleJsonUploaded(data, name, 'overwrite')} />
        {fileName && <p className="file-name-display">Archivo cargado: {fileName}</p>}
        <div className="action-buttons-container">
          <button 
            className="graph-action-button overwrite-button"
            onClick={() => {
              if (jsonData) handleJsonUploaded(jsonData, fileName, 'overwrite');
              else alert("Primero carga un archivo JSON para sobrescribir.");
            }}
            disabled={!jsonData || isLoadingGraph}
          >
            <Replace size={18} className="button-icon" />
            Sobrescribir Resultados
          </button>
          <button 
            className="graph-action-button merge-button"
            onClick={() => {
              if (jsonData) handleJsonUploaded(jsonData, fileName, 'merge');
              else alert("Primero carga un archivo JSON para agregar/actualizar.");
            }}
            disabled={!jsonData || isLoadingGraph}
          >
            <Layers size={18} className="button-icon" />
            Agregar y Actualizar
          </button>
        </div>
        {isLoadingGraph && <p className="loading-text">Cargando grafo...</p>}
      </div>

      <div className="graph-viewport-container">
        <div className="reactflow-wrapper"> 
          {(nodes.length > 0 || isLoadingGraph) ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={memoizedNodeTypes}
              fitView={!firstLoadFitViewDone.current}
              fitViewOptions={{ duration: 800, padding: 0.2 }}
              minZoom={0.05}
              maxZoom={2.5}
              className="themed-flow"
              onlyRenderVisibleElements={true}
              style={{ width: '100%', height: '100%' }}
            >
              <Controls position="bottom-right" />
              <MiniMap 
                nodeStrokeWidth={3}
                nodeColor={(n) => {
                  if (n.type === 'person') return 'var(--node-person-icon-color)';
                  if (n.type === 'company') return 'var(--node-company-icon-color)';
                  return 'var(--text-secondary)';
                }}
                nodeBorderRadius={2}
                pannable 
                zoomable
                position="top-right"
              />
              <Background 
                variant={BackgroundVariant.Lines} 
                gap={30} 
                size={0.5} 
                color="var(--graph-lines-color)" 
              />
            </ReactFlow>
          ) : !isLoadingGraph ? (
            <div className="placeholder-message">
              <UploadCloud size={64} className="mx-auto mb-6 text-gray-600" />
              <p className="mb-4">Arrastra o selecciona un archivo JSON para visualizar el grafo.</p>
              <p className="mb-2 text-sm">Utiliza el área de carga de arriba.</p>
              {isDemoDataVisible && !demoLoadedRef.current && (
                <p className="text-sm text-accent-green mt-2">Cargando datos de demostración...</p>
              )}
              {jsonData && nodes.length === 0 && (
                <details className="json-details-viewer">
                  <summary className="json-details-summary">JSON cargado pero no se generaron nodos. Ver JSON.</summary>
                  <pre className="json-details-pre">
                    {JSON.stringify(jsonData, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ) : null }
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