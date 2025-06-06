import React from 'react';
import DropdownMenu, { MenuItem } from './DropdownMenu';
import { FileCode, Edit, Eye, HelpCircle, Database, User, Settings } from 'lucide-react';

interface TopMenuBarProps {
  onFileMenuSelect: (action: string) => void;
  onEditMenuSelect: (action: string) => void;
  onViewMenuSelect: (action: string) => void;
}

const TopMenuBar: React.FC<TopMenuBarProps> = ({
  onFileMenuSelect,
  onEditMenuSelect,
  onViewMenuSelect,
}) => {
  const fileMenuItems: MenuItem[] = [
    { label: 'Nuevo Grafo', action: () => onFileMenuSelect('new'), icon: FileCode },
    { label: 'Abrir...', action: () => onFileMenuSelect('open'), icon: FileCode },
    { label: 'Guardar', action: () => onFileMenuSelect('save'), icon: FileCode },
    { label: 'Exportar...', action: () => onFileMenuSelect('export'), icon: FileCode },
  ];

  const editMenuItems: MenuItem[] = [
    { label: 'Deshacer', action: () => onEditMenuSelect('undo'), icon: Edit },
    { label: 'Rehacer', action: () => onEditMenuSelect('redo'), icon: Edit },
    { label: 'Copiar', action: () => onEditMenuSelect('copy'), icon: Edit },
    { label: 'Pegar', action: () => onEditMenuSelect('paste'), icon: Edit },
  ];

  const viewMenuItems: MenuItem[] = [
    { label: 'Zoom In', action: () => onViewMenuSelect('zoomIn'), icon: Eye },
    { label: 'Zoom Out', action: () => onViewMenuSelect('zoomOut'), icon: Eye },
    { label: 'Reset View', action: () => onViewMenuSelect('resetView'), icon: Eye },
  ];

  return (
    <div className="relative flex items-center w-full px-4 bg-bg-secondary/70 backdrop-blur-sm border-b border-border-primary h-11 shadow-lg z-20 flex-shrink-0">
      {/* Logo y Título */}
      <div className="flex items-center gap-2 mr-6">
        <Database size={18} className="text-accent-main" />
        <span className="font-bold text-lg text-text-primary tracking-wider font-mono">NODEX</span>
      </div>

      {/* Menús Principales */}
      <div className="flex items-center h-full gap-1 uppercase text-xs tracking-widest font-semibold">
        <div className="hover:bg-bg-tertiary px-3 py-2 rounded-sm transition-colors">
          <DropdownMenu 
            triggerLabel="Archivo" 
            items={fileMenuItems}
          />
        </div>
        <div className="hover:bg-bg-tertiary px-3 py-2 rounded-sm transition-colors">
          <DropdownMenu 
            triggerLabel="Edición" 
            items={editMenuItems}
          />
        </div>
        <div className="hover:bg-bg-tertiary px-3 py-2 rounded-sm transition-colors">
          <DropdownMenu 
            triggerLabel="Visualización" 
            items={viewMenuItems}
          />
        </div>
      </div>

      {/* Espaciador */}
      <div className="flex-grow" />

      {/* Acciones de Usuario */}
      <div className="flex items-center h-full gap-2">
        <button 
          className="p-2 rounded-sm hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
          title="Configuración"
        >
          <Settings size={16} />
        </button>
        <button 
          className="p-2 rounded-sm hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
          title="Ayuda"
        >
          <HelpCircle size={16} />
        </button>
        <div className="w-px h-5 bg-border-secondary mx-2"></div>
        <div 
          className="w-8 h-8 rounded-sm bg-bg-tertiary flex items-center justify-center text-text-secondary cursor-pointer hover:bg-accent-main hover:text-bg-primary transition-colors border border-border-secondary"
          title="Perfil de Usuario"
        >
          <User size={16} />
        </div>
      </div>
    </div>
  );
};

export default TopMenuBar;
