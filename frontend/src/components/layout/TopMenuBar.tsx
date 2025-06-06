import React from 'react';
import DropdownMenu, { MenuItem } from './DropdownMenu';
import {
  FileCode, Edit, Eye, HelpCircle, Database, User, Settings,
  UploadCloud, FileJson, Download, Save, Plus, // Added Download, Save, Plus
  ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, Copy, Scissors, FileSearch, Check // Added more edit/view icons
} from 'lucide-react'; // Asegúrate que todos los iconos estén importados

// Define action types with const assertions for better type safety
export const FileMenuAction = {
  NEW: 'new',
  OPEN_REACTFLOW_JSON: 'openReactFlowJson', // Para JSONs que ya son formato ReactFlow
  LOAD_BRUJES_JSON: 'loadBrujesJson',    // Para JSONs formato "Brujes"
  SAVE_GRAPH_STATE: 'saveGraphState',      // Para guardar el estado actual (ej. a backend o local)
  EXPORT_PDF: 'exportPdf',
} as const;

export const EditMenuAction = {
  UNDO: 'undo',
  REDO: 'redo',
  CUT: 'cut',
  COPY: 'copy',
  PASTE: 'paste',
  SELECT_ALL: 'selectAll',
  FIND: 'find',
} as const;

export const ViewMenuAction = {
  ZOOM_IN: 'zoomIn',
  ZOOM_OUT: 'zoomOut',
  FIT_VIEW: 'fitView', // Renombrado de resetView para claridad
} as const;

export type FileMenuActionType = typeof FileMenuAction[keyof typeof FileMenuAction];
export type EditMenuActionType = typeof EditMenuAction[keyof typeof EditMenuAction];
export type ViewMenuActionType = typeof ViewMenuAction[keyof typeof ViewMenuAction];

interface TopMenuBarProps {
  onFileMenuSelect: (action: FileMenuActionType) => void;
  onEditMenuSelect: (action: EditMenuActionType) => void;
  onViewMenuSelect: (action: ViewMenuActionType) => void;
  // Props para habilitar/deshabilitar opciones
  isFileLoadedForActions?: boolean; // Si un archivo JSON (ReactFlow format) está cargado y listo para "Sobrescribir/Agregar"
  isGraphEmpty?: boolean;
}

const TopMenuBar: React.FC<TopMenuBarProps> = ({
  onFileMenuSelect,
  onEditMenuSelect,
  onViewMenuSelect,
  isFileLoadedForActions = false,
  isGraphEmpty = true,
}: TopMenuBarProps) => {

  const fileMenuItems: MenuItem[] = React.useMemo(() => [
    {
      label: 'Nuevo Grafo',
      action: () => onFileMenuSelect(FileMenuAction.NEW),
      icon: Plus,
      shortcut: 'Ctrl+N',
      disabled: true, // Implementar si es necesario
    },
    {
      label: 'Cargar JSON (Formato Brujes)',
      action: () => onFileMenuSelect(FileMenuAction.LOAD_BRUJES_JSON),
      icon: FileJson,
      shortcut: 'Ctrl+Shift+O',
    },
    {
      label: 'Cargar Grafo (ReactFlow JSON)',
      action: () => onFileMenuSelect(FileMenuAction.OPEN_REACTFLOW_JSON),
      icon: UploadCloud,
      shortcut: 'Ctrl+O',
      disabled: true, // Habilitar si se implementa carga directa de ReactFlow JSON
    },
    { isSeparator: true },
    {
      label: 'Guardar Estado del Grafo',
      action: () => onFileMenuSelect(FileMenuAction.SAVE_GRAPH_STATE),
      icon: Save,
      shortcut: 'Ctrl+S',
      disabled: isGraphEmpty, // O lógica más compleja si se guarda en backend
    },
    {
      label: 'Exportar como PDF',
      action: () => onFileMenuSelect(FileMenuAction.EXPORT_PDF),
      icon: Download,
      shortcut: 'Ctrl+E',
      disabled: isGraphEmpty,
    },
  ], [onFileMenuSelect, isGraphEmpty]);

  const editMenuItems: MenuItem[] = React.useMemo(() => [
    { label: 'Deshacer', action: () => onEditMenuSelect(EditMenuAction.UNDO), icon: Undo2, shortcut: 'Ctrl+Z', disabled: true },
    { label: 'Rehacer', action: () => onEditMenuSelect(EditMenuAction.REDO), icon: Redo2, shortcut: 'Ctrl+Shift+Z', disabled: true },
    { isSeparator: true },
    { label: 'Cortar', action: () => onEditMenuSelect(EditMenuAction.CUT), icon: Scissors, shortcut: 'Ctrl+X', disabled: true },
    { label: 'Copiar', action: () => onEditMenuSelect(EditMenuAction.COPY), icon: Copy, shortcut: 'Ctrl+C', disabled: true },
    { label: 'Pegar', action: () => onEditMenuSelect(EditMenuAction.PASTE), icon: Edit /* Cambiar icono si hay uno mejor */, shortcut: 'Ctrl+V', disabled: true },
    { isSeparator: true },
    { label: 'Seleccionar Todo', action: () => onEditMenuSelect(EditMenuAction.SELECT_ALL), icon: Check, shortcut: 'Ctrl+A', disabled: isGraphEmpty },
    { label: 'Buscar...', action: () => onEditMenuSelect(EditMenuAction.FIND), icon: FileSearch, shortcut: 'Ctrl+F', disabled: true },
  ], [onEditMenuSelect, isGraphEmpty]);

  const viewMenuItems: MenuItem[] = React.useMemo(() => [
    { label: 'Acercar', action: () => onViewMenuSelect(ViewMenuAction.ZOOM_IN), icon: ZoomIn, shortcut: 'Ctrl++', disabled: isGraphEmpty },
    { label: 'Alejar', action: () => onViewMenuSelect(ViewMenuAction.ZOOM_OUT), icon: ZoomOut, shortcut: 'Ctrl+-', disabled: isGraphEmpty },
    { label: 'Ajustar Vista', action: () => onViewMenuSelect(ViewMenuAction.FIT_VIEW), icon: Maximize2, shortcut: 'Ctrl+0', disabled: isGraphEmpty },
  ], [onViewMenuSelect, isGraphEmpty]);

  return (
    <div className="relative flex items-center w-full px-4 bg-bg-secondary/70 backdrop-blur-sm border-b border-border-primary h-11 shadow-lg z-20 flex-shrink-0">
      <div className="flex items-center gap-2 mr-6">
        <Database size={18} className="text-accent-main" />
        <span className="font-bold text-lg text-text-primary tracking-wider font-mono">NODEX</span>
      </div>
      <div className="flex items-center h-full gap-1 uppercase text-xs tracking-widest font-semibold">
        <div className="hover:bg-bg-tertiary px-3 py-2 rounded-sm transition-colors">
          <DropdownMenu triggerLabel="Archivo" items={fileMenuItems} />
        </div>
        <div className="hover:bg-bg-tertiary px-3 py-2 rounded-sm transition-colors">
          <DropdownMenu triggerLabel="Edición" items={editMenuItems} />
        </div>
        <div className="hover:bg-bg-tertiary px-3 py-2 rounded-sm transition-colors">
          <DropdownMenu triggerLabel="Visualización" items={viewMenuItems} />
        </div>
      </div>
      <div className="flex-grow" />
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
