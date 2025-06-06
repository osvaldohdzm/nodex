// frontend/src/components/layout/TopMenuBar.tsx
import React from 'react';
import DropdownMenu, { type MenuItem } from './DropdownMenu'; // 'type' para importación de tipo
import {
  Database, User, Settings, HelpCircle, // Iconos generales
  Plus, UploadCloud, FileJson, Save, Download, // Iconos de Archivo
  Undo2, Redo2, Scissors, Copy, Check, FileSearch, // Iconos de Edición
  ZoomIn, ZoomOut, Maximize2 // Iconos de Vista
  // Asegúrate de que todos los iconos que uses estén importados de lucide-react
} from 'lucide-react';

// Definición de los tipos de acción que el TopMenuBar puede emitir
export const FileMenuAction = {
  NEW: 'new',
  OPEN_REACTFLOW_JSON: 'openReactFlowJson',
  LOAD_BRUJES_JSON: 'loadBrujesJson',
  SAVE_GRAPH_STATE: 'saveGraphState',
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
  FIT_VIEW: 'fitView',
} as const;

// Tipos para los callbacks
export type FileMenuActionType = typeof FileMenuAction[keyof typeof FileMenuAction];
export type EditMenuActionType = typeof EditMenuAction[keyof typeof EditMenuAction];
export type ViewMenuActionType = typeof ViewMenuAction[keyof typeof ViewMenuAction];

interface TopMenuBarProps {
  onFileMenuSelect: (action: FileMenuActionType) => void;
  onEditMenuSelect: (action: EditMenuActionType) => void;
  onViewMenuSelect: (action: ViewMenuActionType) => void;
  isGraphEmpty?: boolean; // Para habilitar/deshabilitar opciones
}

const TopMenuBar: React.FC<TopMenuBarProps> = ({
  onFileMenuSelect,
  onEditMenuSelect,
  onViewMenuSelect,
  isGraphEmpty = true,
}) => {

  const fileMenuItems: MenuItem[] = React.useMemo(() => [
    {
      label: 'Nuevo Grafo',
      action: () => onFileMenuSelect(FileMenuAction.NEW),
      icon: Plus, // Usar el icono importado
      shortcut: 'Ctrl+N',
      disabled: true, // Implementar si es necesario
    },
    {
      label: 'Cargar JSON (Formato Brujes)',
      action: () => onFileMenuSelect(FileMenuAction.LOAD_BRUJES_JSON),
      icon: FileJson, // Usar el icono importado
      shortcut: 'Ctrl+Shift+O',
    },
    // Quitado "Cargar Grafo (ReactFlow JSON)" por simplicidad, puedes añadirlo si lo necesitas
    // {
    //   label: 'Cargar Grafo (ReactFlow JSON)',
    //   action: () => onFileMenuSelect(FileMenuAction.OPEN_REACTFLOW_JSON),
    //   icon: UploadCloud,
    //   shortcut: 'Ctrl+O',
    //   disabled: true,
    // },
    { isSeparator: true },
    {
      label: 'Guardar Estado del Grafo',
      action: () => onFileMenuSelect(FileMenuAction.SAVE_GRAPH_STATE),
      icon: Save, // Usar el icono importado
      shortcut: 'Ctrl+S',
      disabled: true, // Habilitar cuando se implemente el guardado
    },
    {
      label: 'Exportar como PDF',
      action: () => onFileMenuSelect(FileMenuAction.EXPORT_PDF),
      icon: Download, // Usar el icono importado
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
    // { label: 'Pegar', action: () => onEditMenuSelect(EditMenuAction.PASTE), icon: Edit, shortcut: 'Ctrl+V', disabled: true }, // 'Edit' no es un icono estándar de Lucide para pegar
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
    // El layout visual del Proyecto B se mantiene aquí
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
        <button className="p-2 rounded-sm hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors" title="Configuración" type="button">
          <Settings size={16} />
        </button>
        <button className="p-2 rounded-sm hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors" title="Ayuda" type="button">
          <HelpCircle size={16} />
        </button>
        <div className="w-px h-5 bg-border-secondary mx-2"></div>
        <button className="w-8 h-8 rounded-sm bg-bg-tertiary flex items-center justify-center text-text-secondary cursor-pointer hover:bg-accent-main hover:text-bg-primary transition-colors border border-border-secondary focus:outline-none focus:ring-2 focus:ring-accent-main focus:ring-opacity-50" title="Perfil de Usuario" type="button" aria-label="Abrir menú de perfil de usuario" onClick={() => console.log('Profile menu clicked')}>
          <User size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default TopMenuBar;