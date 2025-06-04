import React, { useState, useCallback, useMemo } from 'react';
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
  // Position, // Not directly used for layout here
} from 'reactflow';
import 'reactflow/dist/style.css';
// import '../styles/react-flow-theme.css'; // Still commented out
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

// Define el tipo para los perfiles en línea
interface OnlineProfile {
  link: string;
  title: string;
  snippet?: string;
  source: string;
}

const GraphPage: React.FC = () => {
  console.log("GraphPage IS RENDERING - Now with Graph Display Logic");
  const [jsonData, setJsonData] = useState<JsonData | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdges((eds) => addEdge({
          ...params,
          id: `e${Date.now()}-${Math.random()}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: 'var(--edge-default)' },
        }, eds));
      }
    },
    [setEdges]
  );

  const processJsonToGraph = (data: JsonData): { initialNodes: Node[]; initialEdges: Edge[] } => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const nodeIds = new Set<string>();
    let edgeIdCounter = 0;
    let mainPersonNodeId = '';
    let mainPersonName = '';
    let mainPersonDetails: any = { fullJson: data };

    const addNodeSafely = (node: Node) => {
      if (!nodeIds.has(node.id)) {
        newNodes.push(node);
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
          style: { stroke: 'var(--edge-default)' },
          data: edgeData,
        });
      }
    };
    
    let yOffset = 50;
    const xSpacing = 220;
    const ySpacing = 180;
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
    const onlineProfiles: OnlineProfile[] = []; // Tipo explícito para evitar errores

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

    console.log("Nodos generados:", newNodes);
    console.log("Aristas generadas:", newEdges);
    return { initialNodes: newNodes, initialEdges: newEdges };
  };

  const handleJsonUploaded = useCallback((uploadedData: JsonData, name?: string) => {
    console.log("JSON data received in GraphPage:", uploadedData);
    setJsonData(uploadedData);
    if (name) {
      setFileName(name);
    }
    const { initialNodes, initialEdges } = processJsonToGraph(uploadedData);
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [setNodes, setEdges]);

  return (
    // This is the main container for GraphPage, it should fill its parent from App.tsx
    // Added p-2 here for overall page padding, removed from direct children previously.
    <div className="h-full w-full flex flex-col bg-bg-secondary text-text-primary p-2">
      
      {/* Upload Section - this will take some fixed height */}
      <div className="mb-4 p-3 bg-bg-primary shadow-md rounded-md flex-shrink-0">
        <h2 className="text-xl font-semibold mb-3 text-accent-cyan">
          Cargar Archivo JSON del Grafo
        </h2>
        <JsonUploadButton onJsonUploaded={handleJsonUploaded} />
        {fileName && <p className="text-xs text-text-secondary mt-2">Archivo cargado: {fileName}</p>}
      </div>

      {/* Graph Section - this should take all remaining vertical space */}
      {/* Added mt-2 here for margin above the graph area */}
      <div className="flex-grow relative rounded-lg shadow-lg bg-graph-bg mt-2">
        {/* This inner div is CRITICAL for React Flow. It MUST have a defined height. */}
        {/* By making its parent a flex-grow item, and this h-full (via style), it should work. */}
        <div style={{ width: '100%', height: '100%' }}> 
          {nodes.length > 0 ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={memoizedNodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.1}
            >
              <Controls />
              <MiniMap 
                nodeStrokeWidth={3}
                nodeColor={(n) => {
                  if (n.type === 'person') return 'var(--node-person-border)';
                  if (n.type === 'company') return 'var(--node-company-border)';
                  return 'var(--text-secondary)';
                }}
                pannable 
                zoomable
              />
              <Background 
                variant={BackgroundVariant.Dots} 
                gap={16} 
                size={0.7} 
                color="var(--input-border)" 
              />
            </ReactFlow>
          ) : jsonData ? (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary text-lg p-4">
              <p className="mb-4">El archivo JSON se cargó, pero no se generaron nodos para el grafo.</p>
              <p className="mb-2 text-sm">El JSON podría no contener la estructura esperada o suficiente para generar el grafo.</p>
              <details className="w-full max-w-2xl mt-4">
                <summary className="cursor-pointer text-accent-cyan hover:underline">Ver contenido del JSON</summary>
                <pre className="text-xs whitespace-pre-wrap break-all text-text-secondary overflow-auto max-h-96 mt-2 p-3 bg-input-bg rounded-md">
                  {JSON.stringify(jsonData, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-text-secondary text-lg">
              <p>Arrastra o selecciona un archivo JSON para visualizar el grafo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraphPage;