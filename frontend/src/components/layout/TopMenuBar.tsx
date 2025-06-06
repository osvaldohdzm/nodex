import React, { useCallback } from 'react';
import DropdownMenu, { MenuItem } from './DropdownMenu';
import { FileCode, Edit, Eye, HelpCircle, Database, User, Settings, UploadCloud, FileJson } from 'lucide-react';

// Define action types with const assertions for better type safety
export const FileMenuAction = {
  NEW: 'new',
  OPEN: 'open',
  LOAD_BRUJES_JSON: 'loadBrujesJson',
  SAVE: 'save',
  EXPORT: 'export',
} as const;

export const EditMenuAction = {
  UNDO: 'undo',
  REDO: 'redo',
  COPY: 'copy',
  PASTE: 'paste',
} as const;

export const ViewMenuAction = {
  ZOOM_IN: 'zoomIn',
  ZOOM_OUT: 'zoomOut',
  RESET_VIEW: 'resetView',
} as const;

type FileMenuActionType = typeof FileMenuAction[keyof typeof FileMenuAction];
type EditMenuActionType = typeof EditMenuAction[keyof typeof EditMenuAction];
type ViewMenuActionType = typeof ViewMenuAction[keyof typeof ViewMenuAction];

interface TopMenuBarProps {
  onFileMenuSelect: (action: FileMenuActionType) => void;
  onEditMenuSelect: (action: EditMenuActionType) => void;
  onViewMenuSelect: (action: ViewMenuActionType) => void;
}

const TopMenuBar: React.FC<TopMenuBarProps> = ({
  onFileMenuSelect,
  onEditMenuSelect,
  onViewMenuSelect,
}: TopMenuBarProps) => {
  const fileMenuItems: MenuItem[] = React.useMemo(() => [
    { 
      label: 'Nuevo Grafo', 
      action: () => onFileMenuSelect(FileMenuAction.NEW), 
      icon: FileCode,
      shortcut: 'Ctrl+N'
    },
    { 
      label: 'Abrir...', 
      action: () => onFileMenuSelect(FileMenuAction.OPEN), 
      icon: FileCode,
      shortcut: 'Ctrl+O'
    },
    { isSeparator: true },
    {
      label: 'Cargar JSON',
      icon: UploadCloud,
      submenu: [
        {
          label: 'Brujes JSON format',
          action: () => onFileMenuSelect(FileMenuAction.LOAD_BRUJES_JSON),
          icon: FileJson,
        },
      ],
    },
    { isSeparator: true },
    { 
      label: 'Guardar', 
      action: () => onFileMenuSelect(FileMenuAction.SAVE), 
      icon: FileCode,
      shortcut: 'Ctrl+S'
    },
    { 
      label: 'Exportar...', 
      action: () => onFileMenuSelect(FileMenuAction.EXPORT), 
      icon: FileCode,
      shortcut: 'Ctrl+E'
    },
  ], [onFileMenuSelect]);

  const editMenuItems: MenuItem[] = React.useMemo(() => [
    { 
      label: 'Deshacer', 
      action: () => onEditMenuSelect(EditMenuAction.UNDO), 
      icon: Edit,
      shortcut: 'Ctrl+Z'
    },
    { 
      label: 'Rehacer', 
      action: () => onEditMenuSelect(EditMenuAction.REDO), 
      icon: Edit,
      shortcut: 'Ctrl+Shift+Z'
    },
    { 
      label: 'Copiar', 
      action: () => onEditMenuSelect(EditMenuAction.COPY), 
      icon: Edit,
      shortcut: 'Ctrl+C',
      disabled: true // Disabled until implementation
    },
    { 
      label: 'Pegar', 
      action: () => onEditMenuSelect(EditMenuAction.PASTE), 
      icon: Edit,
      shortcut: 'Ctrl+V',
      disabled: true // Disabled until implementation
    },
  ], [onEditMenuSelect]);

  const viewMenuItems: MenuItem[] = React.useMemo(() => [
    { 
      label: 'Zoom In', 
      action: () => onViewMenuSelect(ViewMenuAction.ZOOM_IN), 
      icon: Eye,
      shortcut: 'Ctrl++'
    },
    { 
      label: 'Zoom Out', 
      action: () => onViewMenuSelect(ViewMenuAction.ZOOM_OUT), 
      icon: Eye,
      shortcut: 'Ctrl+-'
    },
    { 
      label: 'Reset View', 
      action: () => onViewMenuSelect(ViewMenuAction.RESET_VIEW), 
      icon: Eye,
      shortcut: 'Ctrl+0'
    },
  ], [onViewMenuSelect]);

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
          type="button"
        >
          <Settings size={16} />
        </button>
        <button 
          className="p-2 rounded-sm hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
          title="Ayuda"
          type="button"
        >
          <HelpCircle size={16} />
        </button>
        <div className="w-px h-5 bg-border-secondary mx-2"></div>
        <button 
          className="w-8 h-8 rounded-sm bg-bg-tertiary flex items-center justify-center text-text-secondary cursor-pointer hover:bg-accent-main hover:text-bg-primary transition-colors border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent-main focus:ring-opacity-50"
          title="Perfil de Usuario"
          type="button"
          aria-label="Abrir menú de perfil de usuario"
          onClick={() => console.log('Profile menu clicked')}
        >
          <User size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default TopMenuBar;
