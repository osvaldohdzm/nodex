import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { User, ImagePlus } from 'lucide-react'; // Lucide icons
import classnames from 'classnames';

export interface PersonNodeData {
  name: string;
  title?: string;
  imageUrl?: string;
  onImageUpload?: (nodeId: string, file: File) => void;
  isHighlighted?: boolean;
  details?: any; // Para mostrar más info si es necesario
}

const PersonNode: React.FC<NodeProps<PersonNodeData>> = ({ data, id, selected }) => {
  const [imageSrc, setImageSrc] = useState<string | undefined>(data.imageUrl);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageError = () => {
    setImageSrc(undefined);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // ... (tu lógica de subida de imagen)
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

  const isSelectedOrHighlighted = selected || data.isHighlighted;

  return (
    <div
      className={classnames(
        'person-node w-36 p-3 rounded-lg flex flex-col items-center justify-center text-center relative transition-all duration-200',
        'bg-node-bg border-2', // Usar variables CSS
        isSelectedOrHighlighted ? 'border-node-border-selected shadow-node-selected' : 'border-node-border',
      )}
      style={{
        // @ts-ignore
        '--tw-shadow-color': isSelectedOrHighlighted ? 'var(--accent-cyan)' : 'transparent',
        boxShadow: isSelectedOrHighlighted ? 'var(--node-shadow-selected)' : '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)' // Sombra sutil por defecto
      }}
    >
      <Handle type="target" position={Position.Top} className="react-flow__handle" />
      
      <div className="w-12 h-12 mb-2 rounded-full flex items-center justify-center bg-black/20 border border-white/10 relative group">
        {imageSrc ? (
          <img src={imageSrc} alt={data.name} className="w-full h-full object-cover rounded-full" onError={handleImageError} />
        ) : (
          <User size={28} className="text-node-person-icon-color" /> // Usar variable CSS para color de icono
        )}
        {data.onImageUpload && (
          <label
            htmlFor={`upload-${id}`}
            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full"
          >
            <ImagePlus size={20} className="text-white" />
            <input
              type="file" id={`upload-${id}`} accept="image/*" className="hidden"
              onChange={handleFileChange} disabled={isUploading}
            />
          </label>
        )}
      </div>

      <div className="text-sm font-medium text-text-primary truncate w-full px-1">{data.name}</div>
      {data.title && <div className="text-xs text-text-secondary truncate w-full px-1">{data.title}</div>}

      <Handle type="source" position={Position.Bottom} className="react-flow__handle" />
      {isUploading && <div className="absolute bottom-1 left-1 text-xs text-accent-cyan">Cargando...</div>}
    </div>
  );
};

export default memo(PersonNode);