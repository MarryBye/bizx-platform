import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { ChevronDown, Check, Globe } from 'lucide-react';
import { CountryFlag } from './country-flag';

export interface LanguageOption {
  code: 'uk' | 'en';
  label: string;
  shortLabel: string;
  flagIso: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'uk', label: 'Українська', shortLabel: 'UA', flagIso: 'UA' },
  { code: 'en', label: 'English', shortLabel: 'EN', flagIso: 'GB' }
];

export interface LanguageSelectorProps {
  value: 'uk' | 'en';
  onChange: (locale: 'uk' | 'en') => void;
  variant?: 'minimal' | 'sidebar' | 'full';
  dropUp?: boolean;
  align?: 'left' | 'right';
  label?: string;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  variant = 'minimal',
  dropUp = false,
  align = 'right',
  label,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const active = LANGUAGE_OPTIONS.find((opt) => opt.code === value) || LANGUAGE_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSelect = (code: 'uk' | 'en') => {
    setIsOpen(false);
    if (code !== value) {
      onChange(code);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-block text-left', variant === 'full' && 'w-full', className)}
    >
      {variant === 'minimal' && (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
        >
          <CountryFlag iso={active.flagIso} className="w-[18px] h-[13px]" />
          <span className="text-[11px] font-semibold uppercase tracking-wide leading-none">
            {active.shortLabel}
          </span>
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-slate-400 transition-transform duration-150 shrink-0',
              isOpen && 'rotate-180 text-slate-700'
            )}
          />
        </button>
      )}

      {variant === 'sidebar' && (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className="w-full flex items-center justify-between gap-2 px-2.5 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-500 font-medium truncate">
              {label || (value === 'en' ? 'Language' : 'Мова')}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <CountryFlag iso={active.flagIso} className="w-[18px] h-[13px]" />
            <span className="text-[11px] font-bold text-slate-800 leading-none">
              {active.shortLabel}
            </span>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-slate-400 transition-transform duration-150 shrink-0',
                isOpen && 'rotate-180 text-slate-700'
              )}
            />
          </div>
        </button>
      )}

      {variant === 'full' && (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-sm transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <CountryFlag iso={active.flagIso} className="w-5 h-3.5" />
            <span className="font-semibold text-slate-900 leading-none">{active.label}</span>
          </div>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-slate-400 transition-transform duration-150 shrink-0',
              isOpen && 'rotate-180 text-slate-700'
            )}
          />
        </button>
      )}

      {isOpen && (
        <div
          role="listbox"
          className={cn(
            'absolute z-50 min-w-[168px] bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 text-xs',
            variant === 'full' && 'w-full',
            dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          {LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = opt.code === value;
            return (
              <button
                key={opt.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.code)}
                className={cn(
                  'w-full flex items-center justify-between gap-2.5 px-3 py-2 text-left transition-colors',
                  isSelected
                    ? 'bg-slate-100/80 text-slate-900 font-bold'
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                )}
              >
                <span className="flex items-center gap-2.5">
                  <CountryFlag iso={opt.flagIso} className="w-5 h-3.5" />
                  <span className="leading-none">{opt.label}</span>
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
