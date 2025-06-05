import React, { memo, useRef } from 'react';
import { Handle, Position, NodeProps, useReactFlow, NodeResizer } from 'reactflow';
import classnames from 'classnames';
import { User, UploadCloud, XCircle } from 'lucide-react';
import { DemoNodeData } from '../../types/graph';
import { resizeAndCropImage } from '../../utils/imageUtils';

const PersonNode: React.FC<NodeProps<DemoNodeData>> = ({ data, selected, id: nodeId }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { deleteElements } = useReactFlow();

  const handleProfileAreaClick = () => {
    if (data.onImageUpload) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && data.onImageUpload) {
      try {
        const resizedBlob = await resizeAndCropImage(file, { maxWidth: 256, maxHeight: 256 });
        const resizedFile = new File([resizedBlob], file.name, { type: file.type });
        data.onImageUpload(nodeId, resizedFile);
      } catch (error) {
        console.error("Error al redimensionar la imagen:", error);
        data.onImageUpload(nodeId, file);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteNode = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm(`¿Seguro que quieres eliminar el nodo "${data.name}"? Esta acción no se puede deshacer.`)) {
      deleteElements({ nodes: [{ id: nodeId }] });
    }
  };

  return (
    <div
      className={classnames(
        'person-node p-4 rounded-lg flex flex-col items-center justify-start text-center relative transition-all duration-200 group overflow-hidden',
        'bg-node-bg border-2'
      )}
      style={{ minHeight: '220px' }}
    >
      {/* Always render all handles for testing */}
      {/* TOP */}
      <Handle
        type="source"
        position={Position.Top}
        id={`${nodeId}-source-top`}
        className="handle-source"
      />
      <Handle
        type="target"
        position={Position.Top}
        id={`${nodeId}-target-top`}
        className="handle-target"
      />
      {/* LEFT */}
      <Handle
        type="target"
        position={Position.Left}
        id={`${nodeId}-target-left`}
        className="react-flow__handle handle-target"
      />
      {/* BOTTOM */}
      <Handle
        type="source"
        position={Position.Bottom}
        id={`${nodeId}-source-bottom`}
        className="react-flow__handle handle-source"
      />
      {/* RIGHT */}
      <Handle
        type="source"
        position={Position.Right}
        id={`${nodeId}-source-right`}
        className="react-flow__handle handle-source"
      />

      <NodeResizer
        isVisible={selected}
        minWidth={208}
        minHeight={220}
      />

      <div
        className="relative mb-3 group cursor-pointer w-24 h-24 flex-shrink-0"
        onClick={handleProfileAreaClick}
        title={data.onImageUpload ? "Cambiar imagen de perfil" : data.name}
      >
        <div className="w-24 h-24 relative">
          <img
            src={data.imageUrl}
            alt={data.name}
            className="w-full h-full rounded-full object-cover border-2 border-node-border group-hover:border-accent-cyan transition-all"
          />
        </div>
        {data.onImageUpload && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-60 rounded-full transition-all duration-200">
            <UploadCloud
              size={32}
              className="text-white opacity-0 group-hover:opacity-90 transition-opacity duration-200"
            />
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg"
          className="hidden"
        />
      </div>

      <button
        onClick={handleDeleteNode}
        className="absolute top-1.5 right-1.5 p-0.5 bg-red-600/70 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10"
        title={`Eliminar nodo ${data.name}`}
        aria-label={`Eliminar nodo ${data.name}`}
      >
        <XCircle size={18} />
      </button>

      <div className="node-content w-full flex-grow flex flex-col overflow-hidden items-center">
        <h3 className="text-md font-semibold text-node-text mb-1 flex-shrink-0 px-1 break-words w-full">
          {data.name}
        </h3>
        {data.title && (
          <p className="text-sm text-node-text-secondary mb-2 flex-shrink-0 px-1 break-words w-full">
            {data.title}
          </p>
        )}
      </div>
    </div>
  );
};

export default memo(PersonNode);