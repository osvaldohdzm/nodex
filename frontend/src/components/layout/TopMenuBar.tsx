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

const wrapIcon = (Icon: React.ComponentType<{ size?: string | number; className?: string }>) => (props: { size?: string | number; className?: string }) => <Icon {...props} />;

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
      icon: wrapIcon(Plus),
      disabled: false,
      shortcut: 'Ctrl+N',
      submenu: [
        { label: 'Documento', icon: wrapIcon(File), disabled: true },
        { label: 'Carpeta', icon: wrapIcon(FolderOpen), disabled: true },
        { isSeparator: true },
        { label: 'Documento', icon: wrapIcon(FileText), disabled: true },
        { label: 'Hoja de cálculo', icon: wrapIcon(FileSpreadsheet), disabled: true },
      ]
    },
    { 
      label: 'Abrir', 
      icon: wrapIcon(FolderOpen),
      action: onUploadClick,
      shortcut: 'Ctrl+O'
    },
    { 
      label: 'Guardar', 
      icon: wrapIcon(Save),
      disabled: true,
      shortcut: 'Ctrl+S'
    },
    { 
      label: 'Imprimir', 
      icon: wrapIcon(Printer),
      disabled: true,
      shortcut: 'Ctrl+P'
    },
    { isSeparator: true },
    { 
      label: 'Cargar JSON...', 
      action: onUploadClick, 
      icon: wrapIcon(Upload),
      disabled: false
    },
    { 
      label: `Sobrescribir con ${fileName || 'archivo'}`, 
      action: () => {
        if (window.confirm(`¿Seguro que deseas SOBRESCRIBIR con ${fileName || 'el archivo'}?`)) {
          onOverwrite();
        }
      },
      icon: wrapIcon(Replace), 
      disabled: !isFileLoaded 
    },
    { 
      label: `Agregar desde ${fileName || 'archivo'}`, 
      action: () => {
        if (window.confirm(`¿Seguro que deseas AGREGAR desde ${fileName || 'el archivo'}?`)) {
          onMerge();
        }
      },
      icon: wrapIcon(Layers), 
      disabled: !isFileLoaded 
    },
    { isSeparator: true },
    { 
      label: 'Exportar como PDF...', 
      action: onExportPDF, 
      icon: wrapIcon(Download), 
      disabled: isGraphEmpty,
      shortcut: 'Ctrl+E'
    },
    { isSeparator: true },
    { 
      label: 'Configuración', 
      icon: wrapIcon(Settings),
      disabled: true
    }
  ];

  const editMenuItems: (MenuItemWithSubmenu | { isSeparator: true })[] = [
    { 
      label: 'Deshacer', 
      disabled: true,
      icon: wrapIcon(Undo2),
      shortcut: 'Ctrl+Z'
    },
    { 
      label: 'Rehacer', 
      disabled: true,
      icon: wrapIcon(Redo2),
      shortcut: 'Ctrl+Shift+Z'
    },
    { isSeparator: true },
    { 
      label: 'Cortar', 
      disabled: isGraphEmpty,
      icon: wrapIcon(Scissors),
      shortcut: 'Ctrl+X'
    },
    { 
      label: 'Copiar', 
      disabled: isGraphEmpty,
      icon: wrapIcon(Copy),
      shortcut: 'Ctrl+C'
    },
    { 
      label: 'Pegar', 
      disabled: true,
      icon: wrapIcon(Copy),
      shortcut: 'Ctrl+V'
    },
    { 
      label: 'Seleccionar todo', 
      disabled: isGraphEmpty,
      icon: wrapIcon(Check),
      shortcut: 'Ctrl+A'
    },
    { isSeparator: true },
    { 
      label: 'Buscar', 
      disabled: false,
      icon: wrapIcon(FileSearch),
      shortcut: 'Ctrl+F'
    }
  ];

  const viewMenuItems: (MenuItemWithSubmenu | { isSeparator: true })[] = [
    { 
      label: 'Ajustar Vista', 
      action: onFitView,
      icon: wrapIcon(Maximize2),
      disabled: isGraphEmpty,
      shortcut: 'Ctrl+0'
    },
    { 
      label: 'Acercar', 
      action: onZoomIn,
      icon: wrapIcon(ZoomIn),
      disabled: isGraphEmpty,
      shortcut: 'Ctrl+Plus'
    },
    { 
      label: 'Alejar', 
      action: onZoomOut,
      icon: wrapIcon(ZoomOut),
      disabled: isGraphEmpty,
      shortcut: 'Ctrl+-'
    },
    { isSeparator: true },
    { 
      label: 'Modo oscuro', 
      icon: wrapIcon(Moon),
      disabled: true,
      shortcut: 'Ctrl+Shift+D'
    }
  ];

  const helpMenuItems: (MenuItemWithSubmenu | { isSeparator: true })[] = [
    { 
      label: 'Documentación', 
      icon: wrapIcon(HelpCircle),
      disabled: true,
      shortcut: 'F1'
    },
    { isSeparator: true },
    { 
      label: 'Acerca de Nodex', 
      icon: wrapIcon(Info),
      disabled: false
    }
  ];

  return (
    <div className="flex items-center w-full px-4 bg-slate-50 border-b border-slate-200 h-12 shadow-sm">
      <div className="flex items-center">
        <DropdownMenu triggerLabel="Archivo" items={fileMenuItems} />
        <DropdownMenu triggerLabel="Editar" items={editMenuItems} />
        <DropdownMenu triggerLabel="Vista" items={viewMenuItems} />
        <DropdownMenu triggerLabel="Ayuda" items={helpMenuItems} />
      </div>
    </div>
  );
};

export default TopMenuBar;
