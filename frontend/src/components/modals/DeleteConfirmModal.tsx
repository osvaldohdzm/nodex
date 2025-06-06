import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  nodeName: string;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  nodeName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
      <div className="bg-bg-secondary p-8 rounded-lg shadow-2xl border border-accent-danger w-full max-w-md transform transition-all animate-nodeEnterAnimation">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-text-secondary hover:text-accent-main transition-colors"
          aria-label="Cerrar"
        >
          <X size={24} />
        </button>

        <div className="flex flex-col items-center text-center">
          <AlertTriangle size={48} className="text-accent-danger mb-4" />
          <h2 className="text-2xl font-bold text-text-primary mb-2">Terminar Expediente</h2>
          <p className="text-text-secondary mb-1">
            Estás a punto de eliminar permanentemente el perfil de:
          </p>
          <p className="font-mono text-accent-warn text-lg mb-6">{nodeName}</p>
          <p className="text-text-secondary mb-8">
            Esta acción no se puede deshacer. Todos los datos y conexiones asociadas se perderán.
          </p>
        </div>

        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-md font-semibold text-text-primary bg-bg-tertiary hover:bg-border-secondary transition-colors"
          >
            Cancelar Misión
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-md font-semibold text-white bg-accent-danger hover:bg-red-700 transition-colors"
          >
            Confirmar Eliminación
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal; 