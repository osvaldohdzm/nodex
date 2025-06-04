import React, { useState, useCallback, useMemo, useEffect } from 'react';
// import { CSSProperties } from 'react'; // No se usa CSSProperties directamente
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
  // ReactFlowInstance, // No se usa directamente si usamos el hook
  useReactFlow,
  ReactFlowProvider, // Mover ReactFlowProvider al componente que usa GraphPage
} from 'reactflow';
import 'reactflow/dist/style.css';
import '../styles/globals.css';

import JsonUploadButton from '../components/graph/JsonUploadButton';
import PersonNode from '../components/graph/PersonNode';
import CompanyNode from '../components/graph/CompanyNode';

const nodeTypes = {
  person: PersonNode,
  company: CompanyNode,
};

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

export const GraphPage: React.FC = () => {
  const [jsonData, setJsonData] = useState<JsonData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  
  const reactFlowInstance = useReactFlow();

  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdges((eds) => addEdge({
          ...params,
          id: `e${Date.now()}-${Math.random()}`,
          type: 'smoothstep',
          animated: false,
          style: { stroke: 'var(--edge-default-color)', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' },
          className: 'edge-appear-static'
        }, eds));
      }
    },
    [setEdges]
  );

  const processJsonToGraph = useCallback((data: JsonData): { initialNodes: Node[]; initialEdges: Edge[] } => {
    // ... (tu lógica de processJsonToGraph sin cambios, solo asegúrate de que addNodeSafely y addEdgeInternal añadan las clases 'node-appear' y 'edge-appear')
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const nodeIds = new Set<string>();
    let edgeIdCounter = 0;
    let mainPersonNodeId = '';
    let mainPersonName = '';
    let mainPersonDetails: any = { fullJson: data };

    const addNodeSafely = (node: Node) => {
      if (!nodeIds.has(node.id)) {
        newNodes.push({ ...node, className: 'node-appear' }); // Añadir clase para animación
        nodeIds.add(node.id);
      } else {
        const existingNode = newNodes.find(n => n.id === node.id);
        if (existingNode) {
          existingNode.data = { ...existingNode.data, ...node.data, details: { ...existingNode.data.details, ...node.data.details } };
        }
      }
    };

    const addEdgeInternal = (sourceId: string, targetId: string, label: string, edgeData?: any) => {
      if (nodeIds.has(sourceId) && nodeIds.has(targetId) && sourceId !== targetId) {
        newEdges.push({
          id: `e${edgeIdCounter++}-${sourceId}-${targetId}-${label.replace(/\s+/g, '_')}`,
          source: sourceId,
          target: targetId,
          label,
          type: 'smoothstep',
          animated: false,
          style: { stroke: 'var(--edge-default-color)', strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--edge-default-color)' },
          data: edgeData,
          className: 'edge-appear' // Añadir clase para animación
        });
      }
    };
    
    let yOffset = 50;
    const xSpacing = 250; 
    const ySpacing = 200; 
    let currentX = 250;

    if (!data) return { initialNodes: [], initialEdges: [] };

    if (data.curp_online?.data?.registros?.[0]) {
      const personData = data.curp_online.data.registros[0];
      mainPersonNodeId = personData.curp || `person-curp-${Date.now()}`;
      mainPersonName = `${personData.nombres || ''} ${personData.primerApellido || ''} ${personData.segundoApellido || ''}`.trim();
      mainPersonDetails = { ...mainPersonDetails, ...personData, source: 'curp_online' };
    } else if (data.ine1?.data?.[0]) {
      const personData = data.ine1.data[0];
      mainPersonNodeId = personData.cve || `person-ine-${Date.now()}`;
      mainPersonName = `${personData.nombre || ''} ${personData.paterno || ''} ${personData.materno || ''}`.trim();
      mainPersonDetails = { ...mainPersonDetails, ...personData, source: 'ine1' };
    } else {
      mainPersonNodeId = data._id?.$oid || `json-root-${Date.now()}`;
      mainPersonName = "Individuo Principal (Datos Generales)";
      mainPersonDetails = { ...mainPersonDetails, id: data._id?.$oid, source: 'root' };
    }
    
    if (data.ine1?.data?.[0]) {
        mainPersonDetails.ine1 = data.ine1.data[0];
        if (!mainPersonDetails.ocupacion) mainPersonDetails.ocupacion = data.ine1.data[0].ocupacion;
        if (!mainPersonDetails.direccion_ine) {
            mainPersonDetails.direccion_ine = `${data.ine1.data[0].calle || ''} ${data.ine1.data[0].exterior || ''} ${data.ine1.data[0].interior || ''}, Col. ${data.ine1.data[0].colonia || ''}, CP ${data.ine1.data[0].codigo_postal || ''}`.trim();
        }
    }
     if (data.ine2?.data?.[0]) mainPersonDetails.ine2 = data.ine2.data[0];
     if (data.ine3?.data?.[0]) mainPersonDetails.ine3 = data.ine3.data[0];

    addNodeSafely({
      id: mainPersonNodeId,
      type: 'person',
      position: { x: currentX, y: yOffset },
      data: {
        name: mainPersonName,
        title: mainPersonDetails.ocupacion || 'Individuo Principal',
        details: mainPersonDetails,
      },
    });
    currentX += xSpacing + 100; 

    const buroComercios = [
        ...(data.buro1?.data?.[0]?.comercios || []),
        ...(data.buro2?.data?.[0]?.comercios2 || [])
    ];
    
    let buroX = 50;
    const buroY = yOffset + ySpacing;

    buroComercios.forEach((comercio, index) => {
      const institucionName = comercio.institucion || `Empresa Desconocida ${index}`;
      const empresaId = `empresa-buro-${institucionName.replace(/\s+/g, '_').substring(0,50)}-${index}`;
      addNodeSafely({
        id: empresaId,
        type: 'company',
        position: { x: buroX + index * xSpacing, y: buroY + (index % 2 * 80) },
        data: {
          name: institucionName,
          location: "Información de Buró",
          details: { ...comercio, source: data.buro1?.data?.[0]?.comercios?.includes(comercio) ? 'buro1' : 'buro2' },
        },
      });
      addEdgeInternal(mainPersonNodeId, empresaId, 'Relación Financiera (Buró)');
    });
    if (buroComercios.length > 0) currentX = Math.max(currentX, buroX + buroComercios.length * xSpacing);

    let sociosY = yOffset + ySpacing * 2;
    if (data.socios_empresas?.data?.datos_subconsulta?.[0]) {
      const empresaSociaData = data.socios_empresas.data.datos_subconsulta[0];
      const empresaSociaName = empresaSociaData.nombre_razon_social || `Sociedad Desconocida ${empresaSociaData.fme}`;
      const empresaSociaId = `empresa-socia-${empresaSociaName.replace(/\s+/g, '_').substring(0,50)}`;
      
      addNodeSafely({
        id: empresaSociaId,
        type: 'company',
        position: { x: currentX - xSpacing, y: sociosY },
        data: {
          name: empresaSociaName,
          location: empresaSociaData.domicilio_social?.split('\n')[0] || "Ubicación Desconocida",
          details: { ...empresaSociaData, source: 'socios_empresas' },
        },
      });
      addEdgeInternal(mainPersonNodeId, empresaSociaId, 'Es Socio/Accionista en');

      if (data.socios_empresas.data.socios) {
        data.socios_empresas.data.socios.forEach((socio: any, index: number) => {
          const socioNameFull = `${socio.nombre || ''} ${socio.apellido_paterno || ''} ${socio.apellido_materno || ''}`.trim();
          if (socioNameFull.toLowerCase() !== mainPersonName.toLowerCase()) { 
            const socioId = `persona-socio-${(socio.rfc || socioNameFull.replace(/\s+/g, '_') || `socioidx-${index}`).substring(0,50)}`;
            addNodeSafely({
              id: socioId,
              type: 'person',
              position: { x: currentX + index * xSpacing, y: sociosY + (index % 2 * 80) },
              data: {
                name: socioNameFull,
                title: "Socio/Accionista",
                details: { ...socio, source: 'socios_empresas.socios' }
              }
            });
            addEdgeInternal(empresaSociaId, socioId, 'Tiene como Socio/Accionista a');
          }
        });
      }
    }

    let contactoY = yOffset + ySpacing * 1.5;
    const pasaportesData = [...(data.pasaportes2022?.data || []), ...(data.pasaportes2023?.data || [])];
    const emergencyContacts = new Map<string, any>();

    pasaportesData.forEach(pasaporte => {
        const contactoRaw = pasaporte?.solicitud?.datos_personales?.contacto_emergencia;
        if (contactoRaw) {
            const contactoName = `${contactoRaw.nombre || ''} ${contactoRaw.apellido || ''} ${contactoRaw.apellido2 || ''}`.trim();
            if (contactoName && !emergencyContacts.has(contactoName)) {
                emergencyContacts.set(contactoName, { ...contactoRaw, source: pasaporte.cod_documento ? `pasaporte_${pasaporte.cod_documento}` : 'pasaporte' });
            }
        }
    });
    
    Array.from(emergencyContacts.entries()).forEach(([contactoName, contactoDetails], index) => {
        const contactoId = `persona-contacto-${contactoName.replace(/\s+/g, '_').substring(0,50)}-${index}`;
        addNodeSafely({
            id: contactoId,
            type: 'person',
            position: { x: 50 + index * xSpacing, y: contactoY + (index % 2 * 60) },
            data: {
                name: contactoName,
                title: "Contacto de Emergencia",
                details: contactoDetails
            }
        });
        addEdgeInternal(mainPersonNodeId, contactoId, 'Contacto de Emergencia');
    });

    let internetX = currentX + xSpacing;
    let internetY = yOffset;
    const onlineProfiles: OnlineProfile[] = []; 

    if (data.internet1?.data?.ResultadosGoogle?.resultados) {
        data.internet1.data.ResultadosGoogle.resultados.forEach(res => {
            if (res.link && res.title) onlineProfiles.push({ ...res, source: 'Google (internet1)'});
        });
    }
    if (data.internet1?.data?.ResultadosBing) {
        Object.values(data.internet1.data.ResultadosBing).forEach((res: any) => {
            if (res.url && res.name) onlineProfiles.push({ link: res.url, title: res.name, snippet: res.snippet, source: 'Bing (internet1)' });
        });
    }
    if (data.internet2?.data) {
        data.internet2.data.forEach(res => {
            if (res.link && res.title) onlineProfiles.push({ ...res, source: 'internet2'});
        });
    }
    
    const uniqueOnlineProfiles = Array.from(new Map(onlineProfiles.map(p => [p.link, p])).values());

    uniqueOnlineProfiles.forEach((profile, index) => {
        const connectToMain = mainPersonName && profile.title.toLowerCase().includes(mainPersonName.split(" ")[0].toLowerCase());
        if (connectToMain) {
            const perfilId = `online-profile-${profile.link.substring(0,30).replace(/[^a-zA-Z0-9]/g, '_')}-${index}`;
            addNodeSafely({
                id: perfilId,
                type: 'company', 
                position: { x: internetX, y: internetY + index * 80 },
                data: {
                    name: profile.title.substring(0, 40) + (profile.title.length > 40 ? "..." : ""),
                    location: profile.link.includes("linkedin.com") ? "LinkedIn" : "Web",
                    details: profile
                }
            });
            addEdgeInternal(mainPersonNodeId, perfilId, 'Perfil Online');
        }
    });
    
    if (!mainPersonDetails.direccion_principal && pasaportesData.length > 0) {
        const passDir = pasaportesData[0]?.solicitud?.datos_personales?.direccion;
        if (passDir) {
            mainPersonDetails.direccion_pasaporte = `${passDir.direccion || ''}, Col. ${passDir.colonia || ''}, ${passDir.ciudad || ''}, CP ${passDir.cod_postal || ''}`.trim();
            const mainNode = newNodes.find(n => n.id === mainPersonNodeId);
            if (mainNode) {
                mainNode.data.details = mainPersonDetails;
            }
        }
    }

    const sortedNodes = newNodes.sort((a, b) => {
        if (a.id === mainPersonNodeId) return -1;
        if (b.id === mainPersonNodeId) return 1;
        return 0;
    });

    return { initialNodes: sortedNodes, initialEdges: newEdges };
  }, []);

  const animateGraphLoad = useCallback((allNodes: Node[], allEdges: Edge[]) => {
    setIsLoadingGraph(true);
    setNodes([]); // Limpiar nodos existentes antes de la animación
    setEdges([]); // Limpiar aristas existentes

    const nodeBatchSize = Math.max(1, Math.floor(allNodes.length / 5));
    const edgeBatchSize = Math.max(1, Math.floor(allEdges.length / 5));
    const delayBetweenNodeBatches = 20; 
    const delayBetweenEdgeBatches = 15;

    let currentNodeIndex = 0;
    let currentEdgeIndex = 0;
    let animationTimeoutId: NodeJS.Timeout | null = null; // Permitir que sea null

    function addNextNodeBatch() {
      if (currentNodeIndex < allNodes.length) {
        const batch = allNodes.slice(currentNodeIndex, currentNodeIndex + nodeBatchSize);
        setNodes(prev => [...prev, ...batch]);
        currentNodeIndex += batch.length;
        animationTimeoutId = setTimeout(addNextNodeBatch, delayBetweenNodeBatches);
      } else {
        addNextEdgeBatch();
      }
    }

    function addNextEdgeBatch() {
      if (currentEdgeIndex < allEdges.length) {
        const batch = allEdges.slice(currentEdgeIndex, currentEdgeIndex + edgeBatchSize);
        setEdges(prev => [...prev, ...batch]);
        currentEdgeIndex += batch.length;
        animationTimeoutId = setTimeout(addNextEdgeBatch, delayBetweenEdgeBatches);
      } else {
        setIsLoadingGraph(false);
        console.log("Carga animada completada.");
        setTimeout(() => {
          if (reactFlowInstance) {
            reactFlowInstance.fitView({ duration: 400, padding: 0.2 });
          }
        }, 100);
      }
    }

    addNextNodeBatch();

    return () => {
      if (animationTimeoutId) clearTimeout(animationTimeoutId);
    };

  }, [setNodes, setEdges, reactFlowInstance]);


  const handleJsonUploaded = useCallback((uploadedData: JsonData, name?: string) => {
    setJsonData(uploadedData);
    if (name) setFileName(name);
    
    const { initialNodes, initialEdges } = processJsonToGraph(uploadedData);

    if (initialNodes.length > 0) {
      animateGraphLoad(initialNodes, initialEdges);
    } else {
      setNodes([]);
      setEdges([]);
      setIsLoadingGraph(false); // Asegurar que se detenga la carga si no hay nodos
    }
  }, [processJsonToGraph, animateGraphLoad]);

  // Limpieza de timeouts
  useEffect(() => {
    // La función animateGraphLoad ya devuelve su propia función de limpieza
    // que se activa cuando cambian sus dependencias o el componente se desmonta.
    // No es necesario un useEffect adicional aquí para la limpieza del timeout de animación.
  }, []);


  return (
    <div className="h-full w-full flex flex-col bg-bg-primary text-text-primary p-4 space-y-4">
      <div className="p-4 bg-bg-secondary shadow-lg rounded-lg flex-shrink-0">
        <h2 className="text-xl font-semibold mb-3 text-accent-cyan text-center">
          Cargar Archivo JSON del Grafo
        </h2>
        <JsonUploadButton onJsonUploaded={handleJsonUploaded} />
        {fileName && <p className="text-xs text-text-secondary mt-2 text-center">Archivo cargado: {fileName}</p>}
        {isLoadingGraph && <p className="text-sm text-accent-cyan mt-2 animate-pulse text-center">Cargando grafo...</p>}
      </div>

      <div 
        className="flex-grow rounded-lg shadow-lg bg-graph-bg overflow-hidden graph-container" 
        style={{ border: '5px solid red', backgroundColor: 'rgba(0, 0, 255, 0.1)' }}
      >
        {(nodes.length > 0 || isLoadingGraph) ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={memoizedNodeTypes}
            fitViewOptions={{ duration: 300, padding: 0.2 }}
            minZoom={0.1}
            maxZoom={2}
            className="themed-flow"
            onlyRenderVisibleElements={true}
            defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
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
              gap={24} 
              size={0.4} 
              color="var(--graph-lines-color)" 
            />
          </ReactFlow>
        ) : jsonData ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary text-lg p-4 text-center">
            <p className="mb-4">El archivo JSON se cargó, pero no se generaron nodos para el grafo.</p>
            <p className="mb-2 text-sm">Verifica la consola para errores o la estructura del JSON.</p>
            <details className="w-full max-w-2xl mt-4">
              <summary className="cursor-pointer text-accent-cyan hover:underline">Ver contenido del JSON</summary>
              <pre className="text-xs whitespace-pre-wrap break-all text-text-secondary overflow-auto max-h-96 mt-2 p-3 bg-input-bg rounded-md">
                {JSON.stringify(jsonData, null, 2)}
              </pre>
            </details>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary text-lg p-4 text-center">
            <p className="mb-4">Arrastra o selecciona un archivo JSON para visualizar el grafo.</p>
            <p className="mb-2 text-sm">Utiliza el área de carga de arriba.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const GraphPageWithProvider: React.FC = () => (
  <ReactFlowProvider>
    <GraphPage />
  </ReactFlowProvider>
);

export default GraphPageWithProvider;