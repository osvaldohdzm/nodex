import React, { useState } from 'react';

interface RelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (label: string, isDirected: boolean) => void;
  sourceNodeName: string;
  targetNodeName: string;
  initialLabel?: string;
  initialIsDirected?: boolean;
}

const RelationshipModal: React.FC<RelationshipModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  sourceNodeName,
  targetNodeName,
  initialLabel = '',
  initialIsDirected = true,
}) => {
  const [label, setLabel] = useState(initialLabel);
  const [isDirected, setIsDirected] = useState(initialIsDirected);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(label, isDirected);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-bg-secondary p-6 rounded-lg shadow-xl w-96">
        <h2 className="text-xl font-semibold text-accent-cyan mb-4">
          {initialLabel ? 'Editar Relación' : 'Nueva Relación'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <p className="text-text-secondary mb-2">
              {sourceNodeName} → {targetNodeName}
            </p>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Etiqueta de la relación"
              className="w-full p-2 bg-input-bg border border-node-border rounded text-text-primary"
              required
            />
          </div>
          <div className="mb-6">
            <label className="flex items-center text-text-secondary">
              <input
                type="checkbox"
                checked={isDirected}
                onChange={(e) => setIsDirected(e.target.checked)}
                className="mr-2"
              />
              Relación dirigida
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-accent-cyan text-bg-primary rounded hover:bg-accent-cyan-darker transition-colors"
            >
              {initialLabel ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RelationshipModal; 