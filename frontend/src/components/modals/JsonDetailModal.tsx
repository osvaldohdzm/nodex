// frontend/src/components/modals/JsonDetailModal.tsx
import React from 'react';
import { Node } from 'reactflow';
import { DemoNodeData } from '../../types/graph';

interface JsonDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  jsonData: any;
  title?: string;
}

const JsonDetailModal: React.FC<JsonDetailModalProps> = ({ isOpen, onClose, jsonData, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1000] p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-bg-secondary p-5 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-accent-cyan-darker">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-input-border">
          <h2 className="text-2xl font-bold text-accent-cyan">{title || "Detalles del Nodo"}</h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-accent-cyan text-3xl leading-none font-semibold outline-none focus:outline-none"
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>
        <div className="flex-grow overflow-hidden rounded">
          <pre className="h-full bg-input-bg text-text-secondary p-4 rounded overflow-auto text-xs scrollbar-thin scrollbar-thumb-accent-cyan-darker scrollbar-track-bg-secondary">
            {JSON.stringify(jsonData, null, 2)}
          </pre>
        </div>
        <button
          onClick={onClose}
          className="mt-5 bg-accent-cyan text-bg-primary py-2.5 px-6 rounded-md hover:bg-accent-cyan-darker focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:ring-opacity-50 transition-colors font-medium self-end"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export default JsonDetailModal;
