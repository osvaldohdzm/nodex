import React from 'react';
import { FileText, Layers, Replace, X } from 'lucide-react';

interface UploadConfirmModalProps {
  isOpen: boolean;
  fileName: string;
  onConfirm: (mode: 'merge' | 'overwrite') => void;
  onCancel: () => void;
}

const UploadConfirmModal: React.FC<UploadConfirmModalProps> = ({
  isOpen,
  fileName,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
      <div className="bg-bg-secondary p-8 rounded-lg shadow-2xl border border-border-primary w-full max-w-lg transform transition-all animate-nodeEnterAnimation">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-text-secondary hover:text-accent-danger transition-colors"
          aria-label="Cerrar"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-text-primary mb-2">Confirmar Carga de Archivo</h2>
        <p className="text-text-secondary mb-6">¿Cómo quieres cargar el siguiente archivo?</p>

        <div className="bg-bg-tertiary border border-border-secondary rounded-md p-4 mb-8 flex items-center gap-4">
          <FileText size={24} className="text-accent-main flex-shrink-0" />
          <span className="font-mono text-text-primary truncate" title={fileName}>
            {fileName}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Opción AGREGAR (Merge) */}
          <button
            onClick={() => onConfirm('merge')}
            className="group flex flex-col items-center p-6 bg-bg-tertiary rounded-md border-2 border-transparent hover:border-accent-green hover:bg-green-900/20 transition-all duration-300"
          >
            <Layers size={32} className="text-accent-green mb-3 transition-transform group-hover:scale-110" />
            <h3 className="text-lg font-semibold text-text-primary mb-1">Agregar al Grafo</h3>
            <p className="text-sm text-text-secondary text-center">
              Añade los nodos y relaciones de este archivo al grafo existente.
            </p>
          </button>

          {/* Opción REEMPLAZAR (Overwrite) */}
          <button
            onClick={() => onConfirm('overwrite')}
            className="group flex flex-col items-center p-6 bg-bg-tertiary rounded-md border-2 border-transparent hover:border-accent-warn hover:bg-yellow-900/20 transition-all duration-300"
          >
            <Replace size={32} className="text-accent-warn mb-3 transition-transform group-hover:scale-110" />
            <h3 className="text-lg font-semibold text-text-primary mb-1">Reemplazar Grafo</h3>
            <p className="text-sm text-text-secondary text-center">
              Borra el grafo actual y lo reemplaza con el contenido de este archivo.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadConfirmModal;
