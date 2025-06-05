import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import classnames from 'classnames';
import { User, Upload } from 'lucide-react';

interface PersonNodeData {
  name: string;
  title?: string;
  imageUrl?: string;
  status?: 'normal' | 'warning' | 'alert' | 'delayed';
  onImageUpload?: (nodeId: string, file: File) => void;
  isHighlighted?: boolean;
  details?: any; // Para mostrar más info si es necesario
}

const PersonNode: React.FC<NodeProps<PersonNodeData>> = ({ data, selected, id }) => {
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && data.onImageUpload) {
      data.onImageUpload(id, file);
    }
  };

  const isSelectedOrHighlighted = selected || data.isHighlighted;

  return (
    <div
      className={classnames(
        'person-node w-32 h-32 p-2 rounded-full flex flex-col items-center justify-center text-center relative transition-all duration-200',
        'bg-node-bg border-2',
        {
          'border-node-border-selected shadow-node-selected': isSelectedOrHighlighted && data.status !== 'alert' && data.status !== 'warning',
          'border-node-border': !isSelectedOrHighlighted && data.status !== 'alert' && data.status !== 'warning',
          'node-alert-style': data.status === 'alert',
          'node-warning-style': data.status === 'warning',
        }
      )}
    >
      <Handle type="target" position={Position.Top} className="react-flow__handle" />
      
      <div className="relative mb-1">
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt={data.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-node-border"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-node-bg border-2 border-node-border flex items-center justify-center">
            <User size={32} className="text-node-icon-color" />
          </div>
        )}
        {data.onImageUpload && (
          <label className="absolute bottom-0 right-0 bg-node-bg rounded-full p-1 cursor-pointer hover:bg-node-bg-hover transition-colors">
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

      <div className="node-content mt-1">
        <h3 className="text-xs font-semibold text-node-text">{data.name}</h3>
        {/* data.title and data.details removed for circular view */}
      </div>

      <Handle type="source" position={Position.Bottom} className="react-flow__handle" />
    </div>
  );
};

export default memo(PersonNode);