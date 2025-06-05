import React, { useState, useRef, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';

export interface MenuItem {
  label?: string;  // Opcional para separadores
  action?: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
  isSeparator?: boolean;
}

interface DropdownMenuProps {
  triggerLabel: string;
  triggerIcon?: LucideIcon;
  items: MenuItem[];
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ triggerLabel, triggerIcon: TriggerIcon, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTriggerClick = () => {
    setIsOpen(!isOpen);
  };

  const handleItemClick = (item: MenuItem) => {
    if (!item.disabled && item.action) {
      item.action();
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center gap-1 px-3 py-1.5 text-sm text-text-primary hover:bg-accent-cyan/10 rounded-sm transition-colors"
        onClick={handleTriggerClick}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {TriggerIcon && <TriggerIcon size={16} className="text-accent-cyan" />}
        <span>{triggerLabel}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-bg-secondary border border-input-border rounded-md shadow-lg z-50 py-1">
          {items.map((item, index) => (
            item.isSeparator ? (
              <div key={`separator-${index}`} className="my-1 border-t border-input-border" />
            ) : (
              <button
                key={item.label}
                className={`w-full px-4 py-1.5 text-sm text-left flex items-center gap-2 ${
                  item.disabled
                    ? 'text-text-secondary cursor-not-allowed opacity-50'
                    : 'text-text-primary hover:bg-accent-cyan/10'
                }`}
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
              >
                {item.icon && <item.icon size={16} className="text-accent-cyan" />}
                <span>{item.label}</span>
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default DropdownMenu;
