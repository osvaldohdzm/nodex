import React, { useState, useCallback } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Position // Importado para posible uso futuro, no estrictamente necesario para MiniMap nodeColor
} from 'reactflow';
import 'reactflow/dist/style.css'; // Estilo base de React Flow
import '../styles/react-flow-theme.css'; // Tus estilos personalizados para React Flow
import '../styles/globals.css'; // Asegura que las variables CSS estén disponibles

import JsonUploadButton from '../components/graph/JsonUploadButton';
import PersonNode from '../components/graph/PersonNode';
import CompanyNode from '../components/graph/CompanyNode';

// Define los tipos de nodos personalizados que React Flow usará
const nodeTypes = {
  person: PersonNode,
  company: CompanyNode,
  // Podrías añadir más tipos aquí, ej: location: LocationNode,
};

const GraphPage: React.FC = () => {
  console.log("GraphPage IS RENDERING - Now with Graph Display Logic");
  const [jsonData, setJsonData] = useState<any>(null);
  const [fileName, setFileName] = useState<string>('');

  // Estados para los nodos y aristas del grafo
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);

  // Callback para cuando se conectan nodos manualmente (si se habilita la funcionalidad)
  const onConnect = useCallback(
    (params: Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Función para procesar el JSON y convertirlo en nodos y aristas para React Flow
  const processJsonToGraph = (data: any): { initialNodes: Node[], initialEdges: Edge[] } => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const nodeIds = new Set<string>(); // Para evitar duplicar nodos con el mismo ID
    let edgeIdCounter = 0; // Para generar IDs únicos para las aristas

    const addNodeSafely = (node: Node) => {
      if (!nodeIds.has(node.id)) {
        newNodes.push(node);
        nodeIds.add(node.id);
      }
    };

    const addEdgeInternal = (sourceId: string, targetId: string, label: string, animated: boolean = false) => {
      // Asegurarse que source y target existen como nodos antes de crear la arista
      if (nodeIds.has(sourceId) && nodeIds.has(targetId)) {
        newEdges.push({
          id: `e${edgeIdCounter++}`,
          source: sourceId,
          target: targetId,
          label: label,
          animated: animated,
          style: { stroke: 'var(--edge-default)' }, // Estilo por defecto
        });
      } else {
        console.warn(`No se pudo crear arista: ${sourceId} -> ${targetId}. Uno o ambos nodos no existen.`);
      }
    };

    if (!data) return { initialNodes: [], initialEdges: [] };

    let mainPersonNodeId: string | null = null;
    let mainPersonName: string = "Persona Principal";

    // 1. Nodo Persona Principal
    if (data.curp_online?.data?.registros?.[0]) {
      const personData = data.curp_online.data.registros[0];
      mainPersonNodeId = personData.curp;
      mainPersonName = `${personData.nombres} ${personData.primerApellido} ${personData.segundoApellido}`;
      const ocupacion = data.ine1?.data?.[0]?.ocupacion || 'Individuo Principal';
      addNodeSafely({
        id: mainPersonNodeId,
        type: 'person',
        position: { x: 250, y: 50 }, // Posición inicial
        data: {
          name: mainPersonName,
          title: ocupacion,
          curp: personData.curp,
          details: { ...personData, ine: data.ine1?.data?.[0], fullJson: data }, // Incluir todo el JSON para detalles
        },
      });
    } else if (data.ine1?.data?.[0]) { // Fallback si curp_online no está
      const personData = data.ine1.data[0];
      mainPersonNodeId = personData.cve || `person-${personData.nombre.replace(/\s+/g, '_')}`;
      mainPersonName = `${personData.nombre} ${personData.paterno} ${personData.materno}`;
      addNodeSafely({
        id: mainPersonNodeId,
        type: 'person',
        position: { x: 250, y: 50 },
        data: {
          name: mainPersonName,
          title: personData.ocupacion,
          cve_ine: personData.cve,
          details: { ...personData, fullJson: data },
        },
      });
    }

    if (!mainPersonNodeId) {
      mainPersonNodeId = data._id?.$oid || "json_root_node";
      mainPersonName = "Raíz del JSON";
      addNodeSafely({
          id: mainPersonNodeId,
          type: 'person', // O un tipo 'generic'
          position: { x: 250, y: 50 },
          data: { name: mainPersonName, title: "Datos Centrales", details: { id: data._id?.$oid, fullJson: data } }
      });
    }

    // 2. Nodos de Empresas y Relaciones (Buro1)
    if (mainPersonNodeId && data.buro1?.data?.[0]?.comercios) {
      data.buro1.data[0].comercios.forEach((comercio: any, index: number) => {
        const empresaId = (comercio.institucion || `buro1-empresa-${index}`).replace(/\s+/g, '_');
        addNodeSafely({
          id: empresaId,
          type: 'company',
          position: { x: 50 + index * 200, y: 250 },
          data: {
            name: comercio.institucion,
            details: comercio,
          },
        });
        addEdgeInternal(mainPersonNodeId!, empresaId, 'Relación Financiera');
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

  const handleJsonUploaded = (data: any, name?: string) => {
    console.log("JSON data received in GraphPage:", data);
    setJsonData(data); // Guardar JSON original por si se necesita
    if (name) {
      setFileName(name);
    }
    const { initialNodes, initialEdges } = processJsonToGraph(data);
    setNodes(initialNodes);
    setEdges(initialEdges);
  };

  return (
    <div className="h-full w-full p-2 flex flex-col bg-bg-secondary text-text-primary box-sizing-border-box">
      {/* Área de carga de JSON */}
      <div className="mb-4 p-3 bg-bg-primary shadow-md rounded-md flex-shrink-0">
        <h2 className="text-xl font-semibold mb-3 text-accent-cyan">
          Cargar Archivo JSON del Grafo
        </h2>
        <JsonUploadButton onJsonUploaded={handleJsonUploaded} />
        {fileName && <p className="text-xs text-text-secondary mt-2">Archivo cargado: {fileName}</p>}
      </div>

      {/* Área para el grafo o mensajes */}
      <div className="flex-grow mt-2 rounded-lg shadow-lg bg-graph-bg relative">
        {nodes.length > 0 ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.1 }}
            minZoom={0.1}
          >
            <Controls />
            <MiniMap 
              nodeStrokeWidth={3}
              nodeColor={(n: Node) => {
                if (n.type === 'person') return 'var(--node-person-border)';
                if (n.type === 'company') return 'var(--node-company-border)';
                return 'var(--text-secondary)';
              }}
              pannable 
              zoomable
            />
            <Background variant="dots" gap={16} size={0.7} color="var(--input-border)" />
          </ReactFlow>
        ) : jsonData ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary text-lg p-4">
            <p className="mb-4">El archivo JSON se cargó, pero no se generaron nodos para el grafo o el procesamiento está en curso.</p>
            <p className="mb-2 text-sm">Puede que el JSON no contenga la estructura esperada para extraer entidades graficables, o que las entidades encontradas no tuvieran identificadores claros.</p>
            <details className="w-full max-w-2xl mt-4">
              <summary className="cursor-pointer text-accent-cyan hover:underline">Ver contenido del JSON cargado</summary>
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