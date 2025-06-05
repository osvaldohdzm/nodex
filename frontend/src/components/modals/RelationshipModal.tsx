import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface RelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (label: string, isDirected: boolean) => void;
  sourceNodeName?: string;
  targetNodeName?: string;
  initialLabel?: string;
  initialIsDirected?: boolean;
}

const RelationshipModal: React.FC<RelationshipModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  sourceNodeName = 'Nodo Origen',
  targetNodeName = 'Nodo Destino',
  initialLabel = '',
  initialIsDirected = true,
}) => {
  const [label, setLabel] = useState(initialLabel);
  const [isDirected, setIsDirected] = useState(initialIsDirected);

  useEffect(() => {
    setLabel(initialLabel);
    setIsDirected(initialIsDirected);
  }, [initialLabel, initialIsDirected]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(label.trim(), isDirected);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-node-bg rounded-lg p-6 w-full max-w-md relative shadow-xl border-2 border-node-border">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-node-text-secondary hover:text-node-text transition-colors"
          aria-label="Cerrar modal"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold text-node-text mb-4">
          {initialLabel ? 'Editar Relación' : 'Crear Relación'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-node-text-secondary">
              <span className="font-medium text-accent-pink">{sourceNodeName}</span>
              {' → '}
              <span className="font-medium text-accent-green">{targetNodeName}</span>
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="relationship-label" className="block text-sm font-medium text-node-text">
              Etiqueta de la relación
            </label>
            <input
              type="text"
              id="relationship-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej: Trabaja en, Conoce a, etc."
              className="w-full px-3 py-2 bg-input-bg border-2 border-node-border rounded-md text-node-text placeholder-node-text-secondary focus:outline-none focus:border-accent-cyan transition-colors"
              autoFocus
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is-directed"
              checked={isDirected}
              onChange={(e) => setIsDirected(e.target.checked)}
              className="w-4 h-4 text-accent-cyan border-node-border rounded focus:ring-accent-cyan focus:ring-offset-node-bg"
            />
            <label htmlFor="is-directed" className="text-sm text-node-text">
              Relación dirigida (flecha)
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-node-text-secondary hover:text-node-text transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!label.trim()}
              className="px-4 py-2 text-sm font-medium bg-accent-cyan text-node-bg rounded-md hover:bg-accent-cyan-darker transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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