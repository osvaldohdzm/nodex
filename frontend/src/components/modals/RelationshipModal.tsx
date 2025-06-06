import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

interface RelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (label: string, isDirected: boolean) => void;
  onDelete?: () => void; // Optional prop for delete functionality
  sourceNodeName: string;
  targetNodeName: string;
  initialLabel?: string;
  initialIsDirected?: boolean;
}

const RelationshipModal: React.FC<RelationshipModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete, // New prop for delete functionality
  sourceNodeName,
  targetNodeName,
  initialLabel = '',
  initialIsDirected = true,
}) => {
  const [label, setLabel] = useState(initialLabel);
  const [isDirected, setIsDirected] = useState(initialIsDirected);

  // Sync state with initial props when modal opens
  useEffect(() => {
    if (isOpen) {
      setLabel(initialLabel);
      setIsDirected(initialIsDirected);
    }
  }, [isOpen, initialLabel, initialIsDirected]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(label, isDirected);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary p-6 rounded-lg shadow-xl border border-input-border w-full max-w-md">
        <h2 className="text-xl font-semibold text-accent-cyan mb-4">
          {initialLabel ? 'Edit Relationship' : 'New Relationship'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <p className="text-sm text-text-secondary mb-2">
              <span className="font-medium text-text-primary">{sourceNodeName}</span>
              <span className="mx-2">→</span>
              <span className="font-medium text-text-primary">{targetNodeName}</span>
            </p>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (e.g., FAMILY, BUSINESS)"
              className="w-full p-2 bg-input-bg border border-node-border rounded text-text-primary focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition"
              required
            />
          </div>
          <div className="mb-6">
            <label className="flex items-center text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={isDirected}
                onChange={(e) => setIsDirected(e.target.checked)}
                className="appearance-none w-4 h-4 bg-input-bg border-2 border-input-border rounded-sm transition-all duration-200 checked:bg-accent-cyan checked:border-accent-cyan"
              />
              <span className="ml-2 select-none">Directed relationship (with arrow)</span>
            </label>
          </div>
          {/* Button container with delete button on the left */}
          <div className="flex justify-between items-center">
            <div>
              {onDelete && ( // Conditional rendering of delete button
                <button
                  type="button"
                  onClick={onDelete}
                  className="p-2 rounded-md text-accent-danger hover:bg-accent-danger/20 transition-colors"
                  title="Delete relationship"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-4 py-2 rounded-md text-text-secondary hover:bg-input-bg transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 bg-accent-cyan text-bg-primary rounded-md hover:bg-accent-cyan-darker transition-colors font-medium"
              >
                {initialLabel ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RelationshipModal;