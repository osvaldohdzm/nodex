import React from 'react';
import DropdownMenu, { MenuItem } from './DropdownMenu';
import { FileText, Edit3, Eye, HelpCircle, UploadCloud, Replace, Layers, Download, ZoomIn, ZoomOut, Maximize2, Info } from 'lucide-react';

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
  onZoomIn,
  onZoomOut,
  onFitView,
  isFileLoaded,
  isGraphEmpty,
  fileName
}) => {
  const fileMenuItems: MenuItem[] = [
    { 
      label: 'Cargar JSON...', 
      action: onUploadClick, 
      icon: UploadCloud,
      disabled: false
    },
    { isSeparator: true },
    { 
      label: `Sobrescribir con ${fileName || 'archivo'}`, 
      action: onOverwrite, 
      icon: Replace, 
      disabled: !isFileLoaded 
    },
    { 
      label: `Agregar desde ${fileName || 'archivo'}`, 
      action: onMerge, 
      icon: Layers, 
      disabled: !isFileLoaded 
    },
    { isSeparator: true },
    { 
      label: 'Exportar como PDF...', 
      action: onExportPDF, 
      icon: Download, 
      disabled: isGraphEmpty 
    },
  ];

  const editMenuItems: MenuItem[] = [
    { 
      label: 'Deshacer', 
      disabled: true,
      icon: Edit3
    },
    { 
      label: 'Rehacer', 
      disabled: true,
      icon: Edit3
    },
    { isSeparator: true },
    { 
      label: 'Eliminar selección', 
      disabled: isGraphEmpty,
      icon: Edit3
    },
  ];

  const viewMenuItems: MenuItem[] = [
    { 
      label: 'Ajustar Vista', 
      action: onFitView,
      icon: Maximize2,
      disabled: isGraphEmpty
    },
    { 
      label: 'Acercar', 
      action: onZoomIn,
      icon: ZoomIn,
      disabled: isGraphEmpty
    },
    { 
      label: 'Alejar', 
      action: onZoomOut,
      icon: ZoomOut,
      disabled: isGraphEmpty
    },
  ];

  const helpMenuItems: MenuItem[] = [
    { 
      label: 'Acerca de Nodex', 
      icon: Info,
      disabled: false
    },
    { isSeparator: true },
    { 
      label: 'Documentación', 
      icon: HelpCircle,
      disabled: true
    },
    { 
      label: 'Reportar un problema', 
      icon: HelpCircle,
      disabled: true
    },
  ];

  return (
    <div className="flex items-center w-full px-3 py-1 bg-bg-secondary border-b border-input-border shadow-sm h-12">
      <div className="flex items-center gap-1">
        <DropdownMenu 
          triggerLabel="Archivo" 
          items={fileMenuItems} 
          triggerIcon={FileText} 
        />
        <DropdownMenu 
          triggerLabel="Editar" 
          items={editMenuItems} 
          triggerIcon={Edit3} 
        />
        <DropdownMenu 
          triggerLabel="Vista" 
          items={viewMenuItems} 
          triggerIcon={Eye} 
        />
      </div>

      <div className="flex-grow" /> {/* Spacer */}

      <div className="flex items-center gap-1">
        <DropdownMenu 
          triggerLabel="Ayuda" 
          items={helpMenuItems} 
          triggerIcon={HelpCircle} 
        />
      </div>
    </div>
  );
};

export default TopMenuBar;
