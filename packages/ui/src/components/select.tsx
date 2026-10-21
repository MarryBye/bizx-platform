import * as React from 'react';
import { cn } from '../lib/utils';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Оберіть значення...',
  className,
  disabled = false,
  name
}: SelectProps): React.JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Закриття при кліку поза селектом
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Закриття по Escape
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative inline-block w-full text-left', className)}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium rounded-lg',
          'border border-slate-200 bg-white text-slate-800 transition-colors',
          'hover:border-slate-300 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isOpen && 'border-slate-900 ring-1 ring-slate-900'
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <span className="shrink-0 text-slate-500">{selectedOption.icon}</span>
          )}
          <span className={cn('truncate', !selectedOption && 'text-slate-400')}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <KeyboardArrowDownOutlinedIcon
          className={cn(
            'w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150',
            isOpen && 'rotate-180 text-slate-700'
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg focus:outline-none"
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 text-center">Немає варіантів</div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    'w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md text-xs text-left font-medium transition-colors',
                    isSelected
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                    opt.disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {opt.icon && (
                      <span className={cn('shrink-0', isSelected ? 'text-white' : 'text-slate-500')}>
                        {opt.icon}
                      </span>
                    )}
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {isSelected && (
                    <CheckOutlinedIcon className="w-3.5 h-3.5 text-white shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
