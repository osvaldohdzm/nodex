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
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
// import '../styles/react-flow-theme.css'; // Module not found - Commented out
import '../styles/globals.css';

import JsonUploadButton from '../components/graph/JsonUploadButton';
import PersonNode from '../components/graph/PersonNode';
import CompanyNode from '../components/graph/CompanyNode';

// Define los tipos de nodos personalizados que React Flow usará
const nodeTypes = {
  person: PersonNode,
  company: CompanyNode,
};

interface JsonData {
  curp_online?: {
    data?: {
      registros?: Array<{
        curp: string;
        nombres: string;
        primerApellido: string;
        segundoApellido: string;
      }>;
    };
  };
  ine1?: {
    data?: Array<{
      nombre: string;
      paterno: string;
      materno: string;
      ocupacion: string;
      cve: string;
    }>;
  };
  buro1?: {
    data?: Array<{
      comercios: Array<{
        institucion: string;
        [key: string]: any;
      }>;
    }>;
  };
  [key: string]: any;
}

const GraphPage: React.FC = () => {
  console.log("GraphPage IS RENDERING - Now with Graph Display Logic");
  const [jsonData, setJsonData] = useState<JsonData | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Memoize nodeTypes para evitar re-renders innecesarios
  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  // Callback para cuando se conectan nodos manualmente
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdges((eds) => addEdge({
          ...params,
          id: `e${Date.now()}`,
          type: 'smoothstep',
          animated: true,
          style: { stroke: 'var(--edge-default)' },
        }, eds));
      }
    },
    [setEdges]
  );

  // Función para procesar el JSON y convertirlo en nodos y aristas para React Flow
  const processJsonToGraph = (data: JsonData): { initialNodes: Node[]; initialEdges: Edge[] } => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const nodeIds = new Set<string>();
    let edgeIdCounter = 0;
    let mainPersonNodeId = '';
    let mainPersonName = '';

    const addNodeSafely = (node: Node) => {
      if (!nodeIds.has(node.id)) {
        newNodes.push(node);
        nodeIds.add(node.id);
      }
    };

    const addEdgeInternal = (sourceId: string, targetId: string, label: string) => {
      if (nodeIds.has(sourceId) && nodeIds.has(targetId)) {
        newEdges.push({
          id: `e${edgeIdCounter++}`,
          source: sourceId,
          target: targetId,
          label,
          type: 'smoothstep',
          animated: false,
          style: { stroke: 'var(--edge-default)' },
        });
      }
    };

    if (!data) return { initialNodes: [], initialEdges: [] };

    // Crear nodo principal
    if (data.curp_online?.data?.registros?.[0]) {
      const personData = data.curp_online.data.registros[0];
      mainPersonNodeId = personData.curp || `person-${Date.now()}`;
      mainPersonName = `${personData.nombres} ${personData.primerApellido} ${personData.segundoApellido}`;
      addNodeSafely({
        id: mainPersonNodeId,
        type: 'person',
        position: { x: 250, y: 50 },
        data: {
          name: mainPersonName,
          title: data.ine1?.data?.[0]?.ocupacion || 'Individuo Principal',
          details: { ...personData, ine: data.ine1?.data?.[0], fullJson: data },
        },
      });
    } else if (data.ine1?.data?.[0]) {
      const personData = data.ine1.data[0];
      mainPersonNodeId = personData.cve || `person-${Date.now()}-${personData.nombre.replace(/\s+/g, '_')}`;
      mainPersonName = `${personData.nombre} ${personData.paterno} ${personData.materno}`;
      addNodeSafely({
        id: mainPersonNodeId,
        type: 'person',
        position: { x: 250, y: 50 },
        data: {
          name: mainPersonName,
          title: personData.ocupacion,
          details: { ...personData, fullJson: data },
        },
      });
    } else {
      mainPersonNodeId = data._id?.$oid || `json-root-${Date.now()}`;
      mainPersonName = "Raíz del JSON";
      addNodeSafely({
        id: mainPersonNodeId,
        type: 'person',
        position: { x: 250, y: 50 },
        data: {
          name: mainPersonName,
          title: "Datos Centrales",
          details: { id: data._id?.$oid, fullJson: data },
        },
      });
    }

    // Procesar empresas del buró
    if (data.buro1?.data?.[0]?.comercios) {
      data.buro1.data[0].comercios.forEach((comercio, index) => {
        const empresaId = `empresa-${index}-${(comercio.institucion || 'unknown').replace(/\s+/g, '_')}`;
        addNodeSafely({
          id: empresaId,
          type: 'company',
          position: { x: 50 + index * 200, y: 250 },
          data: {
            name: comercio.institucion || 'Empresa sin nombre',
            details: comercio,
          },
        });
        addEdgeInternal(mainPersonNodeId, empresaId, 'Relación Financiera');
      });
    }

    // 3. Nodo Empresa y Relaciones (Socios Empresas)
    if (mainPersonNodeId && data.socios_empresas?.data?.datos_subconsulta?.[0]) {
      const empresaSociaData = data.socios_empresas.data.datos_subconsulta[0];
      const empresaSociaId = (empresaSociaData.nombre_razon_social || `sociedad-${empresaSociaData.fme}`).replace(/\s+/g, '_');
      addNodeSafely({
        id: empresaSociaId,
        type: 'company',
        position: { x: 450, y: 250 },
        data: {
          name: empresaSociaData.nombre_razon_social,
          location: empresaSociaData.domicilio_social?.split('\n')[0], // Tomar primera línea
          details: empresaSociaData,
        },
      });
      addEdgeInternal(mainPersonNodeId!, empresaSociaId, 'Es Socio/Accionista en');

      if (data.socios_empresas.data.socios) {
          data.socios_empresas.data.socios.forEach((socio: any, index: number) => {
              const socioNameFull = `${socio.nombre} ${socio.apellido_paterno} ${socio.apellido_materno}`;
              // Evitar crear un nodo para la persona principal si ya existe como socio y tiene el mismo nombre
              if (socioNameFull.trim().toLowerCase() !== mainPersonName.trim().toLowerCase()) {
                  const socioId = (socio.rfc || socioNameFull.replace(/\s+/g, '_') || `socio-${index}`).replace(/\s+/g, '_');
                  addNodeSafely({
                      id: socioId,
                      type: 'person',
                      position: { x: 450 + index * 180, y: 400 + (index % 2 * 80) },
                      data: {
                          name: socioNameFull,
                          title: "Socio/Accionista",
                          details: socio
                      }
                  });
                  addEdgeInternal(empresaSociaId, socioId, 'Tiene como Socio/Accionista a');
              }
          });
      }
    }

    // 4. Contacto de Emergencia (Pasaportes)
    if (mainPersonNodeId && data.pasaportes2023?.data?.[0]?.solicitud?.datos_personales?.contacto_emergencia) {
      const contactoRaw = data.pasaportes2023.data.find((p:any) => p.solicitud?.datos_personales?.contacto_emergencia)?.solicitud.datos_personales.contacto_emergencia;
      if (contactoRaw) {
        const contactoName = `${contactoRaw.nombre} ${contactoRaw.apellido} ${contactoRaw.apellido2}`;
        const contactoId = (contactoName.replace(/\s+/g, '_') || `contacto-emergencia-0`).replace(/\s+/g, '_');
        addNodeSafely({
            id: contactoId,
            type: 'person',
            position: { x: 50, y: 400 },
            data: {
                name: contactoName,
                title: "Contacto de Emergencia",
                details: contactoRaw
            }
        });
        addEdgeInternal(mainPersonNodeId!, contactoId, 'Contacto de Emergencia');
      }
    }
    
    // 5. Resultados de Internet (LinkedIn, etc.) como nodos de "Perfil Online"
    if (mainPersonNodeId && data.internet1?.data?.ResultadosGoogle?.resultados) {
        data.internet1.data.ResultadosGoogle.resultados.forEach((res: any, index: number) => {
            if (res.link && res.title) {
                // Filtrar para que solo sean perfiles de la persona principal (heurística por nombre)
                if (mainPersonName && res.title.toLowerCase().includes(mainPersonName.split(" ")[0].toLowerCase())) {
                    const perfilId = `perfil-google-${index}-${res.link.substring(0,30).replace(/[^a-zA-Z0-9]/g, '_')}`;
                    addNodeSafely({
                        id: perfilId,
                        type: 'company', // Usar company node para representar un perfil/website
                        position: { x: 600 + index * 50, y: 100 + (index % 3 * 100) },
                        data: {
                            name: res.title.substring(0, 30) + "...",
                            location: res.link.startsWith("https://mx.linkedin.com") ? "LinkedIn" : "Web",
                            details: res
                        }
                    });
                    addEdgeInternal(mainPersonNodeId!, perfilId, 'Perfil Online');
                }
            }
        });
    }


    console.log("Nodos generados:", newNodes);
    console.log("Aristas generadas:", newEdges);
    return { initialNodes: newNodes, initialEdges: newEdges };
  };

  const handleJsonUploaded = useCallback((data: JsonData, name?: string) => {
    console.log("JSON data received in GraphPage:", data);
    setJsonData(data);
    if (name) {
      setFileName(name);
    }
    const { initialNodes, initialEdges } = processJsonToGraph(data);
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [setNodes, setEdges]); // Added dependencies

  return (
    <div className="h-full w-full p-2 flex flex-col bg-bg-secondary text-text-primary">
      <div className="mb-4 p-3 bg-bg-primary shadow-md rounded-md flex-shrink-0">
        <h2 className="text-xl font-semibold mb-3 text-accent-cyan">
          Cargar Archivo JSON del Grafo
        </h2>
        <JsonUploadButton onJsonUploaded={handleJsonUploaded} />
        {fileName && <p className="text-xs text-text-secondary mt-2">Archivo cargado: {fileName}</p>}
      </div>

      <div className="flex-grow mt-2 rounded-lg shadow-lg bg-graph-bg relative">
        {nodes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={memoizedNodeTypes}
            fitView
            fitViewOptions={{ padding: 0.1 }}
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
            <p className="mb-2 text-sm">El JSON podría no contener la estructura esperada para generar el grafo.</p>
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
  );
};

export default GraphPage;