// frontend/src/utils/jsonProcessor.ts
import { Node } from 'reactflow';
import { DemoNodeData } from '../types/graph'; // Usaremos DemoNodeData, asegurándonos que incluya rawJsonData

// Helper function to safely get nested properties
const getNested = (obj: any, path: string, defaultValue: any = undefined): any => {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (typeof current !== 'object' || current === null) {
      return defaultValue;
    }

    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const arrayKey = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);
      if (current.hasOwnProperty(arrayKey) && Array.isArray(current[arrayKey]) && index < current[arrayKey].length) {
        current = current[arrayKey][index];
      } else {
        return defaultValue;
      }
    } else if (current.hasOwnProperty(part)) {
      current = current[part];
    } else {
      return defaultValue;
    }
  }
  return current === undefined ? defaultValue : current;
};

export const extractPersonInfo = (jsonData: any): { name: string; curp: string; rfc: string; otherKeyData: Record<string, any> } => {
  let name = "Persona Desconocida";
  let curp = "N/A";
  let rfc = "N/A";
  const otherKeyData: Record<string, any> = {};

  // Prioritized search for CURP
  const curpPaths = [
    'curp_online.data.registros[0].curp', 'buro1.data[0].curp', 'ine2.data[0].curp',
    'ine3.data[0].curp', 'vacunacion.data[0].curp', 'buro1.data[0].nombre.curp',
    'pasaportes2022.data[0].solicitud.datos_personales.curp',
    'pasaportes2023.data[0].solicitud.datos_personales.curp',
  ];
  for (const path of curpPaths) {
    const foundCurp = getNested(jsonData, path);
    if (foundCurp && typeof foundCurp === 'string' && foundCurp.length > 5) {
      curp = foundCurp;
      break;
    }
  }

  // Prioritized search for Full Name
  const namePaths = [
    'buro1.data[0].nombre_completo',
    'buro1.data[0].nombre.nombre_completo',
    'buro2.data[0].nombre_completo',
    'vacunacion.data[0].NOMBRE', 
  ];
   for (const path of namePaths) {
    const foundName = getNested(jsonData, path);
    if (foundName && typeof foundName === 'string' && foundName.trim().length > 3) {
      name = foundName.trim();
      if (path === 'vacunacion.data[0].NOMBRE') { // Completar con apellidos si es de vacunacion
        const paternoVac = getNested(jsonData, 'vacunacion.data[0].PATERNO');
        const maternoVac = getNested(jsonData, 'vacunacion.data[0].MATERNO');
        if (paternoVac) name += ` ${paternoVac.trim()}`;
        if (maternoVac) name += ` ${maternoVac.trim()}`;
        name = name.trim();
      }
      break;
    }
  }

  if (name === "Persona Desconocida" || name.split(' ').length < 2) {
    const nombres = getNested(jsonData, 'curp_online.data.registros[0].nombres') || getNested(jsonData, 'ine1.data[0].nombre');
    const paterno = getNested(jsonData, 'curp_online.data.registros[0].primerApellido') || getNested(jsonData, 'ine1.data[0].paterno');
    const materno = getNested(jsonData, 'curp_online.data.registros[0].segundoApellido') || getNested(jsonData, 'ine1.data[0].materno');
    if (nombres && paterno) {
      name = `${nombres.trim()} ${paterno.trim()}${materno ? ' ' + materno.trim() : ''}`.trim();
    }
  }
  
  const rfcPaths = [
    'buro1.data[0].rfc_completo', 
    'buro1.data[0].nombre.rfc_completo',
    'buro2.data[0].rfc_completo',
  ];
  for (const path of rfcPaths) {
      const foundRfc = getNested(jsonData, path);
      if (foundRfc && typeof foundRfc === 'string' && foundRfc.length > 5) {
          rfc = foundRfc;
          break;
      }
  }
  
  otherKeyData.fechaNacimiento = getNested(jsonData, 'curp_online.data.registros[0].fechaNacimiento') || 
                                 getNested(jsonData, 'buro1.data[0].fecha_nacimiento') || 
                                 getNested(jsonData, 'ine1.data[0].fecha_nac') ||
                                 getNested(jsonData, 'buro1.data[0].nombre.fecha_nacimiento');
  const oid = getNested(jsonData, '_id.$oid');
  if (oid) otherKeyData.docId = oid;

  return { name, curp, rfc, otherKeyData };
};

export const processJsonToSinglePersonNode = (
  jsonData: any,
  existingNodes: Node<DemoNodeData>[],
  onImageUpload?: (nodeId: string, file: File) => void
): { node: Node<DemoNodeData> | null } => {
  const personInfo = extractPersonInfo(jsonData);

  if (personInfo.name === "Persona Desconocida" && personInfo.curp === "N/A") {
    console.warn("No se pudo identificar a la persona desde el JSON. No se creó el nodo.");
    return { node: null };
  }
  
  let nodeIdBase = personInfo.curp !== "N/A" ? personInfo.curp : personInfo.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  if (!nodeIdBase || nodeIdBase === "persona_desconocida") {
    nodeIdBase = `person-uid-${Date.now()}`;
  }
  let nodeId = `person-${nodeIdBase}`;
  let counter = 1;
  while (existingNodes.some(n => n.id === nodeId)) {
    nodeId = `person-${nodeIdBase}-${counter++}`;
  }

  const PADDING = 40;
  const NODE_WIDTH = 200; 
  const NODE_HEIGHT = 220; // Ajustar según el contenido típico del nodo
  const COLS = Math.max(1, Math.floor( (typeof window !== 'undefined' ? window.innerWidth * 0.9 : 1200) / (NODE_WIDTH + PADDING) ) );

  const numExistingNodes = existingNodes.length;
  const xPos = (numExistingNodes % COLS) * (NODE_WIDTH + PADDING) + PADDING;
  const yPos = Math.floor(numExistingNodes / COLS) * (NODE_HEIGHT + PADDING) + PADDING;

  const personNode: Node<DemoNodeData> = {
    id: nodeId,
    type: 'person', // Usará PersonNode.tsx
    position: { x: xPos, y: yPos },
    data: {
      name: personInfo.name,
      title: `CURP: ${personInfo.curp}`, // Se mostrará debajo del nombre
      typeDetails: 'Persona', // Para consistencia con DemoNodeData
      status: 'normal',
      details: { // Estos son los detalles que se muestran en el nodo mismo
          ...(personInfo.rfc !== "N/A" && { RFC: personInfo.rfc }),
          ...(personInfo.otherKeyData.fechaNacimiento && { "Fec. Nac.": personInfo.otherKeyData.fechaNacimiento }),
          ...(personInfo.otherKeyData.docId && { "ID Doc.": personInfo.otherKeyData.docId.substring(0,10) + "..." }),
      },
      rawJsonData: jsonData, // El JSON completo para el modal de detalles
      onImageUpload: onImageUpload, // <-- FIX: Asignar la función de callback
    },
  };

  return { node: personNode };
};