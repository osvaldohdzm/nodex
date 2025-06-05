import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

export interface MenuItem {
  label?: string;  // Opcional para separadores
  action?: () => void;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  disabled?: boolean;
  isSeparator?: boolean;
  shortcut?: string;
  submenu?: MenuItem[];
}

interface DropdownMenuProps {
  triggerLabel: string;
  triggerIcon?: React.ComponentType<{ size?: number; className?: string }>;
  items: MenuItem[];
  className?: string;
  align?: 'left' | 'right';
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  triggerLabel,
  triggerIcon: TriggerIcon,
  items,
  className = '',
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuTimer = useRef<NodeJS.Timeout>();
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Manejar teclas para navegación
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setActiveSubmenu(null);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        // Navegación entre ítems
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleTriggerClick = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: align === 'left' ? rect.left + window.scrollX : rect.right + window.scrollX - 240,
      });
    }
    setIsOpen(!isOpen);
    setActiveSubmenu(null);
  };

  const handleItemClick = (item: MenuItem, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (item.disabled) return;
    
    if (item.submenu) {
      // No hacer nada, manejado por hover
      return;
    }
    
    if (item.action) {
      item.action();
      setIsOpen(false);
      setActiveSubmenu(null);
    }
  };

  const handleItemMouseEnter = (index: number, hasSubmenu: boolean) => {
    if (submenuTimer.current) {
      clearTimeout(submenuTimer.current);
    }
    
    if (hasSubmenu) {
      submenuTimer.current = setTimeout(() => {
        setActiveSubmenu(index);
      }, 200);
    } else {
      setActiveSubmenu(null);
    }
  };

  const handleSubmenuMouseLeave = () => {
    if (submenuTimer.current) {
      clearTimeout(submenuTimer.current);
    }
    submenuTimer.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 200);
  };

  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.isSeparator) {
      return <div key={`separator-${index}`} className="h-px my-1.5 bg-slate-200/80" role="separator" />;
    }

    const hasSubmenu = Boolean(item.submenu && item.submenu.length > 0);
    const isActive = activeSubmenu === index;

    return (
      <div
        key={item.label}
        className="relative mx-1"
        onMouseEnter={() => handleItemMouseEnter(index, hasSubmenu)}
        onMouseLeave={() => {
          if (submenuTimer.current) clearTimeout(submenuTimer.current);
        }}
      >
        <button
          className={`w-full px-3 py-1.5 text-sm text-left flex items-center justify-between gap-3 whitespace-nowrap rounded-md ${item.disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'} ${isActive ? 'bg-slate-100 text-blue-600' : ''}`}
          onClick={(e) => handleItemClick(item, e)}
          disabled={item.disabled}
          role="menuitem"
          aria-haspopup={hasSubmenu}
          aria-expanded={isActive}
        >
          <div className="flex items-center gap-3">
            {item.icon && (
              <span className={`w-5 flex justify-center ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>
                <item.icon size={16} className={item.disabled ? 'opacity-50' : ''} />
              </span>
            )}
            <span>{item.label}</span>
          </div>
          <div className="flex items-center">
            {item.shortcut && <span className="text-xs text-slate-500 ml-4">{item.shortcut}</span>}
            {hasSubmenu && <ChevronRight size={16} className="ml-2 text-slate-500" />}
          </div>
        </button>
      {hasSubmenu && isActive && item.submenu && (
        <div
          className={`absolute ${align === 'right' ? 'right-full' : 'left-full'} top-0 -mt-1 ml-1 bg-white rounded-lg shadow-xl border border-slate-200/80 py-1.5 z-50 min-w-[220px]`}
          onMouseEnter={() => {
            if (submenuTimer.current) clearTimeout(submenuTimer.current);
          }}
          onMouseLeave={handleSubmenuMouseLeave}
        >
          {item.submenu.map((subItem, subIndex) => (
            <React.Fragment key={`sub-${index}-${subIndex}`}>
              {subItem.isSeparator ? (
                <div className="h-px my-1.5 bg-slate-200/80" role="separator" />
              ) : (
                <button
                  className={`w-full px-3 py-1.5 text-sm text-left flex items-center justify-between gap-3 whitespace-nowrap rounded-md mx-1 ${subItem.disabled ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100 hover:text-blue-600'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!subItem.disabled && subItem.action) {
                      subItem.action();
                      setIsOpen(false);
                      setActiveSubmenu(null);
                    }
                  }}
                  disabled={subItem.disabled}
                  role="menuitem"
                >
                  <div className="flex items-center gap-3">
                    {subItem.icon && (
                      <span className="w-5 flex justify-center text-slate-500">
                        <subItem.icon size={16} className={subItem.disabled ? 'opacity-50' : ''} />
                      </span>
                    )}
                    <span>{subItem.label}</span>
                  </div>
                  {subItem.shortcut && <span className="text-xs text-slate-500">{subItem.shortcut}</span>}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
    );
  };

  return (
    <div className={`relative inline-block text-left h-full`} ref={menuRef}>
      <button
        ref={triggerRef}
        className={`flex items-center gap-2 px-3 h-full text-sm font-medium transition-colors 
          hover:bg-slate-200/60 
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 
          ${isOpen ? 'bg-slate-200/60 text-blue-600' : 'text-slate-700'}`}
        onClick={handleTriggerClick}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span>{triggerLabel}</span>
      </button>

      {isOpen && (
        <div 
          className="fixed bg-white rounded-lg shadow-xl border border-slate-200/80 py-1.5 z-50 min-w-[240px]"
          style={{ top: `${position.top}px`, left: `${position.left}px` }}
          role="menu"
        >
          {items.map((item, index) => renderMenuItem(item, index))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
