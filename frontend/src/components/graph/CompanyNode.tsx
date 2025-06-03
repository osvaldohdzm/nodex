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
}

const CompanyNode: React.FC<NodeProps<CompanyNodeData>> = ({ data, id, selected }) => {
  const [logoSrc, setLogoSrc] = useState<string | undefined>(data.logoUrl);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageError = () => {
    setLogoSrc(undefined);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

  return (
    <div
      className={classnames(
        'rounded-lg w-40 p-3 flex flex-col items-center justify-center text-center shadow-lg relative',
        'bg-node-company-bg border-2',
        selected || data.isHighlighted ? 'border-accent-cyan shadow-node-glow' : 'border-node-company-border',
        'transition-all duration-300'
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-accent-cyan w-3 h-3" />
      <div className="w-16 h-16 rounded-md overflow-hidden border-2 border-white/30 mb-2 relative group">
        {logoSrc ? (
          <img src={logoSrc} alt={data.name} className="w-full h-full object-contain p-1" onError={handleImageError} />
        ) : (
          <Building className="w-full h-full text-node-company-border p-2" />
        )}
        {data.onImageUpload && (
          <label
            htmlFor={`upload-logo-${id}`}
            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <ImagePlus size={24} className="text-white" />
            <input
              type="file"
              id={`upload-logo-${id}`}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>
        )}
      </div>

      <div className="text-sm font-bold text-text-primary truncate w-full">{data.name}</div>
      {data.location && <div className="text-xs text-text-secondary truncate w-full">{data.location}</div>}

      <Handle type="source" position={Position.Right} className="!bg-accent-cyan w-3 h-3" />
      {isUploading && <div className="absolute bottom-1 left-1 text-xs text-accent-cyan">Uploading...</div>}
    </div>
  );
};

export default memo(CompanyNode);
