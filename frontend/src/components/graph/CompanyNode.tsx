import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Building, ImagePlus } from 'lucide-react';
import classnames from 'classnames';

export interface CompanyNodeData {
  name: string;
  location?: string;
  logoUrl?: string;
  onImageUpload?: (nodeId: string, file: File) => void;
  isHighlighted?: boolean;
  details?: any;
}

const CompanyNode: React.FC<NodeProps<CompanyNodeData>> = ({ data, id, selected }) => {
  const [logoSrc, setLogoSrc] = useState<string | undefined>(data.logoUrl);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageError = () => {
    setLogoSrc(undefined);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // ... (tu lógica de subida de imagen)
    if (event.target.files && event.target.files[0] && data.onImageUpload) {
      const file = event.target.files[0];
      setIsUploading(true);
      try {
        await data.onImageUpload(id, file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoSrc(reader.result as string);
        };
        reader.readAsDataURL(file);
      } catch (error) {
        console.error("Logo upload failed:", error);
      } finally {
        setIsUploading(false);
      }
    }
  };
  
  const isSelectedOrHighlighted = selected || data.isHighlighted;

  return (
    <div
      className={classnames(
        'company-node w-44 p-3 rounded-lg flex flex-col items-center justify-center text-center relative transition-all duration-200',
        'bg-node-bg border-2', // Usar variables CSS
        isSelectedOrHighlighted ? 'border-node-border-selected shadow-node-selected' : 'border-node-border',
      )}
      style={{
        // @ts-ignore
        '--tw-shadow-color': isSelectedOrHighlighted ? 'var(--accent-cyan)' : 'transparent',
        boxShadow: isSelectedOrHighlighted ? 'var(--node-shadow-selected)' : '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)'
      }}
    >
      <Handle type="target" position={Position.Left} className="react-flow__handle" />
      
      <div className="w-12 h-12 mb-2 rounded-md flex items-center justify-center bg-black/20 border border-white/10 relative group">
        {logoSrc ? (
          <img src={logoSrc} alt={data.name} className="w-full h-full object-contain p-1 rounded-md" onError={handleImageError} />
        ) : (
          <Building size={28} className="text-node-company-icon-color" /> // Usar variable CSS para color de icono
        )}
        {data.onImageUpload && (
          <label
            htmlFor={`upload-logo-${id}`}
            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-md"
          >
            <ImagePlus size={20} className="text-white" />
            <input
              type="file" id={`upload-logo-${id}`} accept="image/*" className="hidden"
              onChange={handleFileChange} disabled={isUploading}
            />
          </label>
        )}
      </div>

      <div className="text-sm font-semibold text-text-primary truncate w-full">{data.name}</div>
      {data.location && <div className="text-xs text-text-secondary truncate w-full">{data.location}</div>}

      <Handle type="source" position={Position.Right} className="react-flow__handle" />
      {isUploading && <div className="absolute bottom-1 left-1 text-xs text-accent-cyan">Cargando...</div>}
    </div>
  );
};

export default memo(CompanyNode);