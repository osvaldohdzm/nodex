import React, { useState } from 'react';
import DropdownMenu, { MenuItem } from './DropdownMenu';
import { 
  FileText, Edit3, Eye, HelpCircle, Upload, Replace, Layers, Download, 
  ZoomIn, ZoomOut, Maximize2, Info, Plus, FolderOpen, Save, Printer, Share2, 
  Mail, History, Clock, Settings, Trash2, Copy, Scissors, File, 
  FileSpreadsheet, FileImage, FileVideo, FileAudio, FileJson, FileSearch, 
  User, Link2, Check, Undo2, Redo2, Clipboard, Moon, Play, Users as UsersIcon,
  AlertTriangle, X, ChevronDown
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
  onUploadClick,
  onOverwrite,
  onMerge,
  onExportPDF,
  onZoomIn = () => {},
  onZoomOut = () => {},
  onFitView = () => {},
  isFileLoaded,
  isGraphEmpty,
  fileName
}) => {
  // Define menu item type with proper submenu support
  type MenuItemWithSubmenu = MenuItem & {
    shortcut?: string;
    submenu?: (Omit<MenuItem, 'submenu'> & { shortcut?: string; disabled?: boolean })[];
  };

  const fileMenuItems: (MenuItemWithSubmenu | { isSeparator: true })[] = [
    { 
      label: 'Nuevo', 
      icon: Plus,
      disabled: false,
      shortcut: 'Ctrl+N',
      submenu: [
        { label: 'Documento', icon: File, disabled: true },
        { label: 'Carpeta', icon: FolderOpen, disabled: true },
        { isSeparator: true },
        { label: 'Documento', icon: FileText, disabled: true },
        { label: 'Hoja de cálculo', icon: FileSpreadsheet, disabled: true },
      ]
    },
    { 
      label: 'Abrir', 
      icon: FolderOpen,
      action: onUploadClick,
      shortcut: 'Ctrl+O'
    },
    { 
      label: 'Guardar', 
      icon: Save,
      disabled: true,
      shortcut: 'Ctrl+S'
    },
    { 
      label: 'Imprimir', 
      icon: Printer,
      disabled: true,
      shortcut: 'Ctrl+P'
    },
    { isSeparator: true },
    { 
      label: 'Cargar JSON...', 
      action: onUploadClick, 
      icon: Upload,
      disabled: false
    },
    { 
      label: `Sobrescribir con ${fileName || 'archivo'}`, 
      action: () => {
        if (window.confirm(`¿Seguro que deseas SOBRESCRIBIR con ${fileName || 'el archivo'}?`)) {
          onOverwrite();
        }
      },
      icon: Replace, 
      disabled: !isFileLoaded 
    },
    { 
      label: `Agregar desde ${fileName || 'archivo'}`, 
      action: () => {
        if (window.confirm(`¿Seguro que deseas AGREGAR desde ${fileName || 'el archivo'}?`)) {
          onMerge();
        }
      },
      icon: Layers, 
      disabled: !isFileLoaded 
    },
    { isSeparator: true },
    { 
      label: 'Exportar como PDF...', 
      action: onExportPDF, 
      icon: Download, 
      disabled: isGraphEmpty,
      shortcut: 'Ctrl+E'
    },
    { isSeparator: true },
    { 
      label: 'Configuración', 
      icon: Settings,
      disabled: true
    }
  ];

  const editMenuItems: (MenuItemWithSubmenu | { isSeparator: true })[] = [
    { 
      label: 'Deshacer', 
      disabled: true,
      icon: Undo2,
      shortcut: 'Ctrl+Z'
    },
    { 
      label: 'Rehacer', 
      disabled: true,
      icon: Redo2,
      shortcut: 'Ctrl+Shift+Z'
    },
    { isSeparator: true },
    { 
      label: 'Cortar', 
      disabled: isGraphEmpty,
      icon: Scissors,
      shortcut: 'Ctrl+X'
    },
    { 
      label: 'Copiar', 
      disabled: isGraphEmpty,
      icon: Copy,
      shortcut: 'Ctrl+C'
    },
    { 
      label: 'Pegar', 
      disabled: true,
      icon: Copy,
      shortcut: 'Ctrl+V'
    },
    { 
      label: 'Seleccionar todo', 
      disabled: isGraphEmpty,
      icon: Check,
      shortcut: 'Ctrl+A'
    },
    { isSeparator: true },
    { 
      label: 'Buscar', 
      disabled: false,
      icon: FileSearch,
      shortcut: 'Ctrl+F'
    }
  ];

  const viewMenuItems: (MenuItemWithSubmenu | { isSeparator: true })[] = [
    { 
      label: 'Ajustar Vista', 
      action: onFitView,
      icon: Maximize2,
      disabled: isGraphEmpty,
      shortcut: 'Ctrl+0'
    },
    { 
      label: 'Acercar', 
      action: onZoomIn,
      icon: ZoomIn,
      disabled: isGraphEmpty,
      shortcut: 'Ctrl+Plus'
    },
    { 
      label: 'Alejar', 
      action: onZoomOut,
      icon: ZoomOut,
      disabled: isGraphEmpty,
      shortcut: 'Ctrl+-'
    },
    { isSeparator: true },
    { 
      label: 'Modo oscuro', 
      icon: Moon,
      disabled: true,
      shortcut: 'Ctrl+Shift+D'
    }
  ];

  const helpMenuItems: (MenuItemWithSubmenu | { isSeparator: true })[] = [
    { 
      label: 'Documentación', 
      icon: HelpCircle,
      disabled: true,
      shortcut: 'F1'
    },
    { isSeparator: true },
    { 
      label: 'Acerca de Nodex', 
      icon: Info,
      disabled: false
    }
  ];

  return (
    <div className="flex items-center w-full px-4 bg-slate-50 border-b border-slate-200 h-12 shadow-sm flex-shrink-0">
      <div className="flex items-center mr-6">
        <div className="text-slate-800 font-bold text-xl">Nodex</div>
      </div>
      <div className="flex items-center h-full">
        <DropdownMenu triggerLabel="Archivo" items={fileMenuItems} />
        <DropdownMenu triggerLabel="Editar" items={editMenuItems} />
        <DropdownMenu triggerLabel="Vista" items={viewMenuItems} />
      </div>
      <div className="flex-grow" />
      <div className="flex items-center h-full">
        <DropdownMenu triggerLabel="Ayuda" items={helpMenuItems} align="right" />
        <div className="ml-4 w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer hover:bg-slate-300 transition-colors">
          <User size={18} />
        </div>
      </div>
    </div>
  );
};

export default TopMenuBar;
