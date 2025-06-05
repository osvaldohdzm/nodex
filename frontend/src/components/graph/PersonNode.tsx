import React, { memo, useRef } from 'react';
import { Handle, Position, NodeProps, useStore } from 'reactflow';
import classnames from 'classnames';
import { User, UploadCloud } from 'lucide-react';
import { DemoNodeData } from '../../types/graph';

// Hook para saber si se está conectando y desde qué nodo/handle
const useIsConnecting = () => {
  const isConnecting = useStore(s => s.connectionStartHandle != null && s.connectionEndHandle == null);
  const connectionStartHandle = useStore(s => s.connectionStartHandle);
  return { isConnecting, connectionStartHandleNodeId: connectionStartHandle?.nodeId };
};

// Estilos base para los handles usando Tailwind
const handleBaseClasses = "!w-3 !h-3 !border-2 !border-bg-secondary !rounded-sm !z-[100] !transition-all !duration-150";
const sourceHandleClasses = `${handleBaseClasses} !bg-accent-pink hover:!scale-125 hover:!shadow-lg`;
const targetHandleClasses = `${handleBaseClasses} !bg-accent-green hover:!scale-125 hover:!shadow-lg`;

const PersonNode: React.FC<NodeProps<DemoNodeData>> = ({ data, selected, id: nodeId }) => {
  const { isConnecting, connectionStartHandleNodeId } = useIsConnecting();
  const isTargetCandidate = isConnecting && connectionStartHandleNodeId !== nodeId;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleIconClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && data.onImageUpload) {
      data.onImageUpload(nodeId, file);
    }
    // Reset input value to allow uploading the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isSelectedOrHighlighted = selected || data.isHighlighted;

  // IDs de los handles (simples, React Flow los asociará al nodo)
  const handleIds = {
    topSource: 's-top', topTarget: 't-top',
    bottomSource: 's-bottom', bottomTarget: 't-bottom',
    leftSource: 's-left', leftTarget: 't-left',
    rightSource: 's-right', rightTarget: 't-right',
  };

  return (
    <div
      className={classnames(
        'person-node w-48 p-3 rounded-lg flex flex-col items-center justify-center text-center relative transition-all duration-200',
        'bg-node-bg border-2',
        {
          'border-node-border-selected shadow-node-selected': isSelectedOrHighlighted && data.status !== 'alert' && data.status !== 'warning',
          'border-node-border': !isSelectedOrHighlighted && data.status !== 'alert' && data.status !== 'warning',
          'node-alert-style': data.status === 'alert',
          'node-warning-style': data.status === 'warning',
          'border-accent-green !shadow-accent-green': isTargetCandidate,
        }
      )}
      style={{ minHeight: '200px' }}
    >
      {/* Always render all handles for testing */}
      {/* TOP */}
      <Handle 
        type="source" 
        position={Position.Top} 
        id={handleIds.topSource} 
        className={`${sourceHandleClasses} !-top-[6px]`}
        style={{ zIndex: 100 }}
      />
      <Handle 
        type="target" 
        position={Position.Top} 
        id={handleIds.topTarget} 
        className={`${targetHandleClasses} !top-[3px]`}
        style={{ zIndex: 100 }}
      />

      {/* BOTTOM */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id={handleIds.bottomSource} 
        className={`${sourceHandleClasses} !-bottom-[6px]`}
        style={{ zIndex: 100 }}
      />
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id={handleIds.bottomTarget} 
        className={`${targetHandleClasses} !bottom-[3px]`}
        style={{ zIndex: 100 }}
      />

      {/* LEFT */}
      <Handle 
        type="source" 
        position={Position.Left} 
        id={handleIds.leftSource} 
        className={`${sourceHandleClasses} !-left-[6px]`}
        style={{ zIndex: 100 }}
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id={handleIds.leftTarget} 
        className={`${targetHandleClasses} !left-[3px]`}
        style={{ zIndex: 100 }}
      />

      {/* RIGHT */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id={handleIds.rightSource} 
        className={`${sourceHandleClasses} !-right-[6px]`}
        style={{ zIndex: 100 }}
      />
      <Handle 
        type="target" 
        position={Position.Right} 
        id={handleIds.rightTarget} 
        className={`${targetHandleClasses} !right-[3px]`}
        style={{ zIndex: 100 }}
      />
      
      {/* Profile image container with hover effect */}
      <div className="relative mb-2 group">
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt={data.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-node-border transition-all duration-200 group-hover:border-accent-cyan"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-input-bg border-2 border-node-border flex items-center justify-center transition-all duration-200 group-hover:border-accent-cyan">
            <User size={32} className="text-node-icon-color" />
          </div>
        )}
        {/* Upload overlay that appears on hover */}
        {data.onImageUpload && (
          <>
            <div 
              onClick={handleIconClick}
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-full transition-all duration-200 cursor-pointer"
              title="Subir imagen de perfil"
            >
              <UploadCloud 
                size={24} 
                className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              />
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png, image/jpeg"
              className="hidden"
            />
          </>
        )}
      </div>

      <div className="node-content w-full flex-grow flex flex-col overflow-hidden items-center">
        <h3 className="text-base font-semibold text-node-text mb-0.5 flex-shrink-0 px-1 break-words w-full">
          {data.name}
        </h3>
        {data.title && (
          <p className="text-xs text-node-text-secondary mb-1 flex-shrink-0 px-1 break-words w-full">{data.title}</p>
        )}
        {/* Texto condicional durante la conexión */}
        {isConnecting && connectionStartHandleNodeId === nodeId && (
          <p className="text-xs text-accent-pink mt-1 animate-pulse">Arrastra para conectar...</p>
        )}
        {isTargetCandidate && (
          <p className="text-xs text-accent-green mt-1 animate-pulse">Soltar aquí para conectar</p>
        )}

        {data.details && Object.keys(data.details).length > 0 && (!isConnecting) && (
          <div className="text-xs text-node-text-secondary mt-1.5 flex-grow w-full px-1 max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-accent-cyan-darker scrollbar-track-input-bg hover:scrollbar-thumb-accent-cyan transition-colors">
            {Object.entries(data.details).map(([key, value]) => (
              <div key={key} className="detail-item text-left py-0.5">
                <span className="detail-label font-medium">{key}: </span>
                <span className="detail-value">{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(PersonNode);