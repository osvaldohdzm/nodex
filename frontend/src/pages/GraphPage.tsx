import React, { useState, useRef, useEffect, useCallback, Fragment, type ComponentType, type MouseEvent as ReactMouseEvent } from 'react';
import { ChevronRight, LucideIcon } from 'lucide-react';

// Definición de MenuItem
export interface MenuItem {
  label?: string;
  action?: () => void;
  icon?: LucideIcon | ComponentType<{ size?: number; className?: string }>;
  disabled?: boolean;
  isSeparator?: boolean;
  shortcut?: string;
  submenu?: MenuItem[];
}

// Props del DropdownMenu
interface DropdownMenuProps {
  triggerLabel: string;
  triggerIcon?: LucideIcon | ComponentType<{ size?: number; className?: string }>;
  items: MenuItem[];
  className?: string;
  align?: 'left' | 'right';
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  triggerLabel,
  triggerIcon: TriggerIconComponent, // Renombrar para claridad, ya que puede ser un componente
  items,
  className = '',
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null); // Tipo correcto para el ref
  const submenuTimer = useRef<NodeJS.Timeout | undefined>(undefined); // Tipo correcto para el timer
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null); // Tipo correcto para el ref

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { // MouseEvent global del DOM
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
    };

    if (isOpen) { // Solo añadir listener si está abierto
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]); // Dependencia en isOpen

  // Manejar teclas para navegación
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => { // KeyboardEvent global del DOM
      if (e.key === 'Escape') {
        setIsOpen(false);
        setActiveSubmenu(null);
      }
      // Podrías añadir lógica para ArrowUp/ArrowDown aquí
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleTriggerClick = (e: ReactMouseEvent<HTMLButtonElement>) => { // Usar ReactMouseEvent
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

  const handleItemClick = (item: MenuItem, e: ReactMouseEvent<HTMLButtonElement>) => { // Usar ReactMouseEvent
    e.stopPropagation();
    if (item.disabled) return;
    if (item.submenu) return; // No cierra si es un submenu, se maneja por hover/click en subitem

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
      }, 150); // Reducido el delay para que se sienta más responsivo
    } else {
      // Si no tiene submenu, y hay uno activo, cerrarlo.
      // Esto previene que un submenu quede abierto si mueves el ratón rápido a un item sin submenu.
      if (activeSubmenu !== null) {
          setActiveSubmenu(null);
      }
    }
  };
  
  const handleMenuMouseLeave = () => { // Para el menú principal
    if (submenuTimer.current) {
      clearTimeout(submenuTimer.current);
    }
    // No cerrar el submenu activo inmediatamente al salir del item principal,
    // permitir que el usuario mueva el cursor al submenu.
    // El cierre del submenu se maneja en handleSubmenuMouseLeave.
  };

  const handleSubmenuMouseLeave = () => {
    if (submenuTimer.current) {
      clearTimeout(submenuTimer.current);
    }
    // Iniciar un temporizador para cerrar el submenu.
    // Si el usuario vuelve a entrar al submenu o a su item padre antes de que expire, se cancelará.
    submenuTimer.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 200); // Un pequeño delay para permitir movimiento entre submenus o volver al padre
  };


  const renderMenuItem = (item: MenuItem, index: number, isSubmenuItem: boolean = false) => {
    if (item.isSeparator) {
      return (
        <div
          key={`separator-${index}`}
          className="h-px my-1 bg-menu-border" // Usar variable CSS
          role="separator"
        />
      );
    }

    const IconComponent = item.icon; // Puede ser LucideIcon o un ComponentType
    const hasSubmenu = Boolean(item.submenu && item.submenu.length > 0);
    const isActive = !isSubmenuItem && activeSubmenu === index; // Solo el menú principal puede tener submenu activo

    return (
      <div
        key={item.label || `item-${index}`} // Asegurar key única
        className="relative"
        onMouseEnter={() => {
            if (!isSubmenuItem) handleItemMouseEnter(index, hasSubmenu);
            else if (submenuTimer.current) clearTimeout(submenuTimer.current); // Si es subitem, limpiar timer para que no se cierre
        }}
        onMouseLeave={() => {
            if (!isSubmenuItem) handleMenuMouseLeave(); // Solo para items del menú principal
        }}
      >
        <button
          className={`w-full px-3 py-1.5 text-sm text-left flex items-center justify-between gap-3 whitespace-nowrap rounded-sm mx-1
            ${item.disabled
              ? 'text-menu-text-secondary/40 cursor-not-allowed'
              : 'text-menu-text hover:bg-menu-hover-bg hover:text-menu-hover-text transition-colors duration-150'}
            ${isActive ? 'bg-menu-hover-bg text-menu-hover-text' : ''}
          `}
          onClick={(e) => handleItemClick(item, e)}
          disabled={item.disabled}
          role="menuitem"
          aria-haspopup={hasSubmenu ? 'true' : undefined}
          aria-expanded={isActive ? 'true' : undefined}
        >
          <div className="flex items-center gap-2">
            {IconComponent && (
              <span className="w-5 flex justify-center items-center"> {/* Contenedor para el icono */}
                <IconComponent size={16} className={item.disabled ? 'opacity-40' : ''} />
              </span>
            )}
            <span>{item.label}</span>
          </div>
          <div className="flex items-center">
            {item.shortcut && (
              <span className="text-xs text-menu-text-secondary/70 ml-3">
                {item.shortcut}
              </span>
            )}
            {hasSubmenu && <ChevronRight size={16} className="ml-2 text-menu-text-secondary/70" />}
          </div>
        </button>

        {hasSubmenu && isActive && item.submenu && (
          <div
            className={`absolute top-0 mt-[-5px] ${align === 'right' ? 'right-full mr-1' : 'left-full ml-1'} 
                        bg-menu-bg rounded-md shadow-lg border border-menu-border py-1 z-50 min-w-[220px]
                        transition-opacity duration-150 ease-in-out`}
            onMouseEnter={() => { // Cuando el mouse entra al submenu, cancelar cualquier timer de cierre
              if (submenuTimer.current) clearTimeout(submenuTimer.current);
            }}
            onMouseLeave={handleSubmenuMouseLeave} // Cuando el mouse sale del submenu
          >
            {item.submenu.map((subItem, subIndex) => (
              // Renderizar subitems de forma similar, pero sin la lógica de activar otro submenu
              // (a menos que quieras sub-submenus)
              <Fragment key={`sub-${index}-${subIndex}`}>
                {renderMenuItem(subItem, subIndex, true)}
              </Fragment>
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
        className={`flex items-center gap-2 px-3 h-full text-sm font-medium transition-colors duration-150
          hover:bg-menu-hover-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan/50
          ${isOpen
            ? 'bg-menu-active-bg text-menu-active-text'
            : 'text-menu-text hover:text-menu-hover-text'
          }`}
        onClick={handleTriggerClick}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls="dropdown-menu" // ID del menú si es necesario para accesibilidad
        id="menu-button" // ID del botón para aria-labelledby en el menú
      >
        {TriggerIconComponent && (
          <span className={isOpen ? 'text-menu-active-text' : 'text-menu-text'}>
            <TriggerIconComponent size={16} />
          </span>
        )}
        <span className={isOpen ? 'text-menu-active-text' : 'text-menu-text'}>{triggerLabel}</span>
      </button>

      {isOpen && (
        <div
          id="dropdown-menu" // ID para aria-controls
          className="fixed bg-menu-bg rounded-md shadow-lg border border-menu-border py-1 z-50 min-w-[240px]
                     transition-all duration-150 ease-in-out transform origin-top
                     opacity-100 scale-100" // Simplificado, la animación se puede añadir con clases de Tailwind
          style={{
            top: `${position.top}px`,
            left: `${align === 'left' ? position.left : 'auto'}px`, // Ajustar para alineación
            right: `${align === 'right' ? (window.innerWidth - position.left - (triggerRef.current?.offsetWidth || 0)) : 'auto'}px`, // Ajustar para alineación
          }}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button" // Referencia al botón que lo abre
          tabIndex={-1} // Para que el menú pueda recibir foco programáticamente si es necesario
          onMouseLeave={handleMenuMouseLeave} // Manejar salida del menú principal
        >
          {items.map((item, index) => renderMenuItem(item, index))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;