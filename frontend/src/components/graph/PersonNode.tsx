import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import classnames from 'classnames';
import { User, Upload } from 'lucide-react';
import { DemoNodeData } from '../../types/graph';

// Estilos base para los handles usando Tailwind
const handleBaseClasses = "!w-3 !h-3 !border-2 !border-bg-secondary !rounded-sm !z-20 !opacity-80 hover:!opacity-100 hover:!scale-125 !transition-all";

const PersonNode: React.FC<NodeProps<DemoNodeData>> = ({ data, selected, id: nodeId }) => {
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && data.onImageUpload) {
      data.onImageUpload(nodeId, file);
    }
  };

  const isSelectedOrHighlighted = selected || data.isHighlighted;

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
        }
      )}
      style={{ minHeight: '200px' }}
    >
      {/* TOP Handles */}
      <Handle 
        type="source" 
        position={Position.Top} 
        id="s-top"
        className={`${handleBaseClasses} !bg-accent-pink !-mt-1.5`}
      />
      <Handle 
        type="target" 
        position={Position.Top} 
        id="t-top"
        className={`${handleBaseClasses} !bg-accent-green !mt-[1px]`}
      />

      {/* BOTTOM Handles */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="s-bottom"
        className={`${handleBaseClasses} !bg-accent-pink !-mb-1.5`}
      />
      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="t-bottom"
        className={`${handleBaseClasses} !bg-accent-green !mb-[1px]`}
      />

      {/* LEFT Handles */}
      <Handle 
        type="source" 
        position={Position.Left} 
        id="s-left"
        className={`${handleBaseClasses} !bg-accent-pink !-ml-1.5`}
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="t-left"
        className={`${handleBaseClasses} !bg-accent-green !ml-[1px]`}
      />

      {/* RIGHT Handles */}
      <Handle 
        type="source" 
        position={Position.Right} 
        id="s-right"
        className={`${handleBaseClasses} !bg-accent-pink !-mr-1.5`}
      />
      <Handle 
        type="target" 
        position={Position.Right} 
        id="t-right"
        className={`${handleBaseClasses} !bg-accent-green !mr-[1px]`}
      />
      
      <div className="relative mb-2">
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt={data.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-node-border"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-input-bg border-2 border-node-border flex items-center justify-center">
            <User size={32} className="text-node-icon-color" />
          </div>
        )}
        {data.onImageUpload && (
          <label className="absolute -bottom-1 -right-1 bg-node-bg rounded-full p-1 cursor-pointer hover:bg-node-bg-hover transition-colors shadow-md">
            <Upload size={14} className="text-node-icon-color" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>
        )}
      </div>

      <div className="node-content w-full flex-grow flex flex-col overflow-hidden items-center">
        <h3 className="text-base font-semibold text-node-text mb-0.5 flex-shrink-0 px-1 break-words w-full">
          {data.name}
        </h3>
        {data.title && (
          <p className="text-xs text-node-text-secondary mb-1 flex-shrink-0 px-1 break-words w-full">{data.title}</p>
        )}
        {data.details && Object.keys(data.details).length > 0 && (
          <div 
            className="text-xs text-node-text-secondary mt-1.5 flex-grow w-full px-1 max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-accent-cyan-darker scrollbar-track-input-bg hover:scrollbar-thumb-accent-cyan transition-colors"
          >
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