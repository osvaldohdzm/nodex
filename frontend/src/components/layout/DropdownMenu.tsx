import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';

export interface MenuItem {
  label?: string;  // Opcional para separadores
  action?: () => void;
  icon?: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
  disabled?: boolean;
  isSeparator?: boolean;
  shortcut?: string;
  submenu?: MenuItem[];
}

interface DropdownMenuProps {
  triggerLabel: string;
  triggerIcon?: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
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

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
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
      return (
        <div 
          key={`separator-${index}`} 
          className="h-px my-1 bg-gray-200"
          role="separator"
        />
      );
    }

    const hasSubmenu = Boolean(item.submenu && item.submenu.length > 0);
    const isActive = activeSubmenu === index;

    return (
      <div 
        key={item.label}
        className="relative"
        onMouseEnter={() => handleItemMouseEnter(index, hasSubmenu)}
        onMouseLeave={() => {
          if (submenuTimer.current) clearTimeout(submenuTimer.current);
        }}
      >
        <button
          className={`w-full px-4 py-2 text-sm text-left flex items-center justify-between gap-3 whitespace-nowrap
            ${item.disabled 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-gray-800 hover:bg-blue-50 hover:text-blue-700'}
            ${isActive ? 'bg-blue-50 text-blue-700' : ''}
          `}
          onClick={(e) => handleItemClick(item, e)}
          disabled={item.disabled}
          role="menuitem"
          aria-haspopup={hasSubmenu ? 'true' : undefined}
          aria-expanded={isActive ? 'true' : undefined}
        >
          <div className="flex items-center gap-3">
            {item.icon && (
              <span className="text-gray-500 w-5 flex justify-center">
                <item.icon size={16} className={item.disabled ? 'opacity-50' : ''} />
              </span>
            )}
            <span>{item.label}</span>
          </div>
          <div className="flex items-center">
            {item.shortcut && (
              <span className="text-xs text-gray-500 ml-4">
                {item.shortcut}
              </span>
            )}
            {hasSubmenu && <ChevronRight size={16} className="ml-2 text-gray-500" />}
          </div>
        </button>

        {hasSubmenu && isActive && item.submenu && (
          <div 
            className={`absolute ${align === 'right' ? 'right-full' : 'left-full'} top-0 mt-0 ml-1 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50 min-w-[200px]`}
            onMouseEnter={() => {
              if (submenuTimer.current) clearTimeout(submenuTimer.current);
            }}
            onMouseLeave={handleSubmenuMouseLeave}
          >
            {item.submenu.map((subItem, subIndex) => (
              <React.Fragment key={`sub-${index}-${subIndex}`}>
                {subItem.isSeparator ? (
                  <div className="h-px my-1 bg-gray-200" role="separator" />
                ) : (
                  <button
                    className={`w-full px-4 py-2 text-sm text-left flex items-center justify-between gap-3 whitespace-nowrap
                      ${subItem.disabled 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-gray-800 hover:bg-blue-50 hover:text-blue-700'}
                    `}
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
                        <span className="text-gray-500 w-5 flex justify-center">
                          <subItem.icon size={16} className={subItem.disabled ? 'opacity-50' : ''} />
                        </span>
                      )}
                      <span>{subItem.label}</span>
                    </div>
                    {subItem.shortcut && (
                      <span className="text-xs text-gray-500">
                        {subItem.shortcut}
                      </span>
                    )}
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
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      <button
        ref={triggerRef}
        className={`flex items-center gap-1 px-3 h-9 text-sm font-medium rounded-md transition-colors
          hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
          ${isOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-700'}`}
        onClick={handleTriggerClick}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls="dropdown-menu"
      >
        {TriggerIcon && (
          <span className="text-gray-600">
            <TriggerIcon size={16} className={isOpen ? 'text-blue-600' : ''} />
          </span>
        )}
        <span className={isOpen ? 'text-blue-600' : ''}>{triggerLabel}</span>
      </button>

      {isOpen && (
        <div 
          className="fixed bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50 min-w-[240px]"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button"
          tabIndex={-1}
        >
          {items.map((item, index) => renderMenuItem(item, index))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
