  import React from 'react';
import DropdownMenu, { MenuItem } from './DropdownMenu';
import { 
  FileText, Edit3, Eye, HelpCircle, Upload, Replace, Layers, Download, 
  ZoomIn, ZoomOut, Maximize2, User, Plus, FolderOpen, Save, Printer, 
  Settings, Copy, Scissors, FileSearch, Check, Undo2, Redo2, Moon, Info
} from 'lucide-react';

interface TopMenuBarProps {
  onUploadClick: () => void;
  onOverwrite: () => void;
  onMerge: () => void;
  onExportPDF: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  isFileLoaded: boolean;
  isGraphEmpty: boolean;
  fileName?: string;
}

const TopMenuBar: React.FC<TopMenuBarProps> = ({
  onUploadClick, onOverwrite, onMerge, onExportPDF, onZoomIn, onZoomOut, onFitView, isFileLoaded, isGraphEmpty, fileName
}) => {
  const fileMenuItems: MenuItem[] = [
    { label: 'Nuevo...', icon: Plus, disabled: true, shortcut: 'Ctrl+N' },
    { label: 'Abrir Archivo...', icon: FolderOpen, action: onUploadClick, shortcut: 'Ctrl+O' },
    { label: 'Guardar', icon: Save, disabled: true, shortcut: 'Ctrl+S' },
    { isSeparator: true },
    { label: 'Exportar como PDF...', action: onExportPDF, icon: Download, disabled: isGraphEmpty, shortcut: 'Ctrl+E' },
    { isSeparator: true },
    { label: 'Configuración', icon: Settings, disabled: true },
  ];

  const dataMenuItems: MenuItem[] = [
    { label: 'Cargar JSON...', action: onUploadClick, icon: Upload },
    { label: `Sobrescribir con ${fileName || 'archivo'}`, action: onOverwrite, icon: Replace, disabled: !isFileLoaded },
    { label: `Agregar desde ${fileName || 'archivo'}`, action: onMerge, icon: Layers, disabled: !isFileLoaded },
  ];

  const editMenuItems: MenuItem[] = [
    { label: 'Deshacer', icon: Undo2, disabled: true, shortcut: 'Ctrl+Z' },
    { label: 'Rehacer', icon: Redo2, disabled: true, shortcut: 'Ctrl+Shift+Z' },
    { isSeparator: true },
    { label: 'Cortar', icon: Scissors, disabled: true, shortcut: 'Ctrl+X' },
    { label: 'Copiar', icon: Copy, disabled: true, shortcut: 'Ctrl+C' },
    { label: 'Seleccionar todo', icon: Check, action: () => {}, disabled: isGraphEmpty, shortcut: 'Ctrl+A' },
    { isSeparator: true },
    { label: 'Buscar', icon: FileSearch, disabled: true, shortcut: 'Ctrl+F' },
  ];

  const viewMenuItems: MenuItem[] = [
    { label: 'Ajustar Vista', action: onFitView, icon: Maximize2, disabled: isGraphEmpty, shortcut: 'Ctrl+0' },
    { label: 'Acercar', action: onZoomIn, icon: ZoomIn, disabled: isGraphEmpty, shortcut: 'Ctrl+Plus' },
    { label: 'Alejar', action: onZoomOut, icon: ZoomOut, disabled: isGraphEmpty, shortcut: 'Ctrl+-' },
    { isSeparator: true },
    { label: 'Modo oscuro', icon: Moon, disabled: true },
  ];

  const helpMenuItems: MenuItem[] = [
    { label: 'Documentación', icon: HelpCircle, disabled: true },
    { label: 'Acerca de Nodex', icon: Info, action: () => alert('Nodex v1.0') },
  ];

  return (
    <div className="flex items-center w-full px-2 bg-menu-bg border-b border-menu-border h-10 shadow-sm flex-shrink-0">
       <div className="flex items-center h-full top-menu-bar">
        <DropdownMenu triggerLabel="Archivo" items={fileMenuItems} triggerIcon={FileText} />
        <DropdownMenu triggerLabel="Editar" items={editMenuItems} triggerIcon={Edit3} />
        <DropdownMenu triggerLabel="Datos" items={dataMenuItems} triggerIcon={Layers} />
        <DropdownMenu triggerLabel="Vista" items={viewMenuItems} triggerIcon={Eye} />
      </div>
      <div className="flex-grow" />
      <div className="flex items-center h-full top-menu-bar">
        <DropdownMenu triggerLabel="Ayuda" items={helpMenuItems} triggerIcon={HelpCircle} align="right" />
        <div className="ml-2 w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer hover:bg-slate-300 transition-colors">
          <User size={16} />
        </div>
      </div>
    </div>
  );
};

export default TopMenuBar;
