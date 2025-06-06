import React, { memo, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import classnames from 'classnames';
import { User, Briefcase, Fingerprint, AlertTriangle, Upload, Trash2 } from 'lucide-react';
import { DemoNodeData } from '../../types/graph';

// Estilo para las esquinas biseladas (chamfered corners)
const ChamferStyle = () => (
  <style>{`
    .chamfer-clip {
      clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px);
    }
  `}</style>
);

const PersonNode: React.FC<NodeProps<DemoNodeData>> = ({ data, selected, id: nodeId }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que el click se propague al nodo
    if (data.onImageUpload) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && data.onImageUpload) {
      data.onImageUpload(nodeId, file);
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que el click seleccione el nodo
    if (data.onDelete) {
      data.onDelete(nodeId);
    }
  };

  const statusColor = {
    normal: 'bg-accent-main',
    warning: 'bg-accent-warn',
    alert: 'bg-accent-danger',
    delayed: 'bg-accent-warn',
  }[data.status || 'normal'];

  return (
    <>
      <ChamferStyle />
      <div
        className={classnames(
          'person-node chamfer-clip p-0 rounded-none flex flex-col relative transition-all duration-300 group w-[240px] h-[300px]',
          'bg-node-bg border-2',
          {
            'border-accent-main-glow glow-main': selected,
            'border-node-border': !selected,
          }
        )}
      >
        {/* Handles */}
        <Handle type="source" position={Position.Top} id={`${nodeId}-s-t`} className="!bg-accent-main" />
        <Handle type="target" position={Position.Left} id={`${nodeId}-t-l`} className="!bg-accent-warn" />
        <Handle type="source" position={Position.Right} id={`${nodeId}-s-r`} className="!bg-accent-main" />
        <Handle type="target" position={Position.Bottom} id={`${nodeId}-t-b`} className="!bg-accent-warn" />
        
        {/* Botón de eliminar (discreto) */}
        {data.onDelete && (
          <button
            onClick={handleDeleteClick}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-bg-tertiary text-text-secondary opacity-50 group-hover:opacity-100 hover:!opacity-100 hover:bg-accent-danger hover:text-white transition-all duration-200 z-10"
            title="Eliminar Perfil"
          >
            <Trash2 size={14} />
          </button>
        )}

        {/* Header del Nodo */}
        <div className="w-full bg-bg-tertiary p-2 flex items-center justify-between font-mono text-xs text-text-secondary uppercase tracking-widest">
          <span>// PROFILE ID: {nodeId.slice(0, 8)}</span>
          <div className={`w-2 h-2 rounded-full ${statusColor} ${selected ? 'animate-pulse' : ''}`}></div>
        </div>

        {/* Contenido Principal */}
        <div className="p-3 flex-grow flex flex-col">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/png, image/jpeg, image/jpg"
          />
          <div className="flex gap-3">
            {/* Imagen con retícula */}
            <div
              className="relative w-20 h-20 flex-shrink-0 group/image-container"
              onClick={handleImageContainerClick}
              style={{ cursor: data.onImageUpload ? 'pointer' : 'default' }}
              title={data.onImageUpload ? "Haz clic para cambiar la imagen" : ""}
            >
              <img
                src={data.imageUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${nodeId}`}
                alt={data.name}
                className="w-full h-full object-cover filter grayscale"
              />
              <div className="absolute inset-0 bg-accent-main opacity-20 mix-blend-screen"></div>
              <svg className="absolute inset-0 text-accent-main opacity-50" fill="none" viewBox="0 0 100 100">
                <path d="M50 0V100" stroke="currentColor" strokeWidth="1"/>
                <path d="M0 50H100" stroke="currentColor" strokeWidth="1"/>
                <rect x="15" y="15" width="70" height="70" stroke="currentColor" strokeWidth="2"/>
              </svg>
              {data.onImageUpload && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/image-container:opacity-100 transition-opacity duration-300">
                  <Upload size={28} className="text-white" />
                </div>
              )}
            </div>
            {/* Info Primaria */}
            <div className="flex flex-col justify-center overflow-hidden">
              <h3 className="text-lg font-bold text-text-primary truncate">{data.name}</h3>
              <p className="text-sm text-text-secondary truncate">{data.title || 'No Asignado'}</p>
            </div>
          </div>

          {/* Separador */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-border-secondary to-transparent my-3"></div>

          {/* Datos Clave */}
          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Fingerprint size={14} className="text-accent-main" />
              <span className="text-text-secondary">CURP:</span>
              <span className="text-text-primary">{data.rawJsonData?.curp_online?.data?.registros?.[0]?.curp || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase size={14} className="text-accent-main" />
              <span className="text-text-secondary">RFC:</span>
              <span className="text-text-primary">{data.rawJsonData?.buro1?.data?.[0]?.rfc_completo || 'N/A'}</span>
            </div>
          </div>

          {/* Estado de Alerta */}
          {data.status === 'alert' && (
            <div className="mt-3 p-2 bg-accent-danger/10 border border-accent-danger/20 rounded-sm flex items-center gap-2">
              <AlertTriangle size={14} className="text-accent-danger" />
              <span className="text-xs text-accent-danger font-medium">Estado Crítico Detectado</span>
            </div>
          )}
        </div>
        
        {/* Footer del Nodo */}
        <div className="w-full bg-bg-tertiary p-1.5 text-center font-mono text-xs text-accent-warn uppercase tracking-wider">
          Classification: {data.status === 'alert' ? 'Critical' : 'Standard'}
        </div>
      </div>
    </>
  );
};

export default memo(PersonNode);