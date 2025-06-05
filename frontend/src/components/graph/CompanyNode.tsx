import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import classnames from 'classnames';
import { Building2, Upload } from 'lucide-react';

interface CompanyNodeData {
  name: string;
  location?: string;
  logoUrl?: string;
  status?: 'normal' | 'warning' | 'alert' | 'delayed';
  onImageUpload?: (nodeId: string, file: File) => void;
  isHighlighted?: boolean;
  details?: any;
}

const CompanyNode: React.FC<NodeProps<CompanyNodeData>> = ({ data, selected, id }) => {
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
        'company-node w-48 p-3 rounded-lg flex flex-col items-center justify-center text-center relative transition-all duration-200',
        'bg-node-bg border-2', // Usar variables CSS
        {
          'border-node-border-selected shadow-node-selected': isSelectedOrHighlighted && data.status !== 'alert' && data.status !== 'warning',
          'border-node-border': !isSelectedOrHighlighted && data.status !== 'alert' && data.status !== 'warning',
          'node-alert-style': data.status === 'alert',
          'node-warning-style': data.status === 'warning',
        }
      )}
    >
      <Handle type="target" position={Position.Left} className="react-flow__handle" />
      
      <div className="relative mb-2">
        {data.logoUrl ? (
          <img
            src={data.logoUrl}
            alt={data.name}
            className="w-20 h-20 rounded-lg object-cover border-2 border-node-border"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-node-bg border-2 border-node-border flex items-center justify-center">
            <Building2 size={40} className="text-node-icon-color" />
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

      <div className="node-content">
        <h3 className="text-sm font-semibold text-node-text mb-1">{data.name}</h3>
        {data.location && (
          <p className="text-xs text-node-text-secondary mb-1">{data.location}</p>
        )}
        {data.details && (
          <div className="text-xs text-node-text-secondary mt-1">
            {Object.entries(data.details).map(([key, value]) => (
              <div key={key} className="detail-item">
                <span className="detail-label">{key}:</span>{' '}
                <span className="detail-value">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="react-flow__handle" />
    </div>
  );
};

export default memo(CompanyNode);