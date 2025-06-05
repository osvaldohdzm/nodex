import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight, LucideIcon } from 'lucide-react';

export interface MenuItem {
  label?: string;
  action?: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
  isSeparator?: boolean;
  shortcut?: string;
  submenu?: MenuItem[];
}

export interface DropdownMenuProps {
  triggerLabel: string;
  triggerIcon?: LucideIcon;
  items: MenuItem[];
  align?: 'left' | 'right';
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({
  triggerLabel, triggerIcon: TriggerIcon, items, align = 'left',
}: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const submenuTimer = useRef<NodeJS.Timeout>();

  const handleTriggerClick = useCallback(() => setIsOpen((prev: boolean) => !prev), []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleItemClick = (item: MenuItem) => {
    if (item.disabled || item.submenu) return;
    if (item.action) item.action();
    setIsOpen(false);
  };

  const handleItemMouseEnter = (index: number, hasSubmenu: boolean) => {
    clearTimeout(submenuTimer.current);
    if (hasSubmenu) {
      submenuTimer.current = setTimeout(() => setActiveSubmenu(index), 150);
    } else {
      setActiveSubmenu(null);
    }
  };

  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.isSeparator) {
      return <div key={`sep-${index}`} className="h-px my-1 bg-menu-border" />;
    }

    const hasSubmenu = !!item.submenu?.length;
    const isSubmenuActive = activeSubmenu === index;

    return (
      <div
        key={item.label}
        className="relative"
        onMouseEnter={() => handleItemMouseEnter(index, hasSubmenu)}
        onMouseLeave={() => clearTimeout(submenuTimer.current)}
      >
        <button
          className={`w-full px-3 py-1.5 text-sm text-left flex items-center justify-between gap-4 whitespace-nowrap rounded-sm mx-1
            ${item.disabled ? 'text-menu-text-secondary/50 cursor-not-allowed' : 'text-menu-text hover:bg-menu-hover-bg hover:text-menu-hover-text'}
            ${isSubmenuActive ? 'bg-menu-hover-bg text-menu-hover-text' : ''}`}
          onClick={() => handleItemClick(item)}
          disabled={item.disabled}
        >
          <div className="flex items-center gap-2">
            {item.icon && <item.icon size={16} className={item.disabled ? 'opacity-40' : ''} />}
            <span>{item.label}</span>
          </div>
          {hasSubmenu ? <ChevronRight size={16} /> : null}
          {item.shortcut && <span className="text-xs text-menu-text-secondary">{item.shortcut}</span>}
        </button>

        {hasSubmenu && isSubmenuActive && (
          <div className={`absolute top-0 mt-[-5px] ${align === 'right' ? 'right-full mr-1' : 'left-full ml-1'} bg-menu-bg rounded-md shadow-lg border border-menu-border py-1 z-10 min-w-[220px]`}>
            {item.submenu?.map((subItem, subIndex) => renderMenuItem(subItem, subIndex))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative h-full" ref={menuRef}>
      <button
        className={`flex items-center gap-2 px-3 h-full text-sm font-medium transition-colors 
          hover:bg-menu-hover-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
          ${isOpen ? 'bg-menu-active-bg text-menu-active-text' : 'text-menu-text'}`}
        onClick={handleTriggerClick}
      >
        {TriggerIcon && <TriggerIcon size={16} />}
        <span>{triggerLabel}</span>
      </button>
      {isOpen && (
        <div className={`absolute top-full mt-1 bg-menu-bg rounded-md shadow-lg border border-menu-border py-1 z-50 min-w-[240px] ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {items.map((item, index) => renderMenuItem(item, index))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
