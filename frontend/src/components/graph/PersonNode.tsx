import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { User, ImagePlus } from 'lucide-react';
import classnames from 'classnames';

export interface PersonNodeData {
  name: string;
  title?: string;
  imageUrl?: string;
  onImageUpload?: (nodeId: string, file: File) => void;
  isHighlighted?: boolean;
}

const PersonNode: React.FC<NodeProps<PersonNodeData>> = ({ data, id, selected }) => {
  const [imageSrc, setImageSrc] = useState<string | undefined>(data.imageUrl);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageError = () => {
    setImageSrc(undefined);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (data.onImageUpload) {
        setIsUploading(true);
        try {
          await data.onImageUpload(id, file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setImageSrc(reader.result as string);
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error("Image upload failed:", error);
          alert("Image upload failed.");
        } finally {
          setIsUploading(false);
        }
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageSrc(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div
      className={classnames(
        'rounded-full w-32 h-32 p-1 flex flex-col items-center justify-center text-center shadow-lg relative',
        'bg-node-person-bg border-2',
        selected || data.isHighlighted ? 'border-accent-cyan shadow-node-glow' : 'border-node-person-border',
        'transition-all duration-300'
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-accent-cyan w-3 h-3" />
      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/50 mb-1 relative group">
        {imageSrc ? (
          <img src={imageSrc} alt={data.name} className="w-full h-full object-cover" onError={handleImageError} />
        ) : (
          <User className="w-full h-full text-node-person-border p-2" />
        )}
        {data.onImageUpload && (
          <label
            htmlFor={`upload-${id}`}
            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <ImagePlus size={24} className="text-white" />
            <input
              type="file"
              id={`upload-${id}`}
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>
        )}
      </div>

      <div className="text-xs font-semibold text-text-primary truncate w-full px-1">{data.name}</div>
      {data.title && <div className="text-[10px] text-text-secondary truncate w-full px-1">{data.title}</div>}

      <Handle type="source" position={Position.Bottom} className="!bg-accent-cyan w-3 h-3" />
      {isUploading && <div className="absolute bottom-1 left-1 text-xs text-accent-cyan">Uploading...</div>}
    </div>
  );
};

export default memo(PersonNode);
