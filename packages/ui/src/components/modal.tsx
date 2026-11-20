import * as React from 'react';
import { cn } from '../lib/utils';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
export type ModalTone = 'default' | 'warning' | 'danger' | 'info' | 'success';

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl'
};

const ICON_TONE_CLASSES: Record<ModalTone, string> = {
  default: 'bg-slate-900 text-white',
  warning: 'bg-amber-100 text-amber-700 border border-amber-200',
  danger: 'bg-rose-100 text-rose-700 border border-rose-200',
  info: 'bg-blue-100 text-blue-700 border border-blue-200',
  success: 'bg-emerald-100 text-emerald-700 border border-emerald-200'
};

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  headerActions?: React.ReactNode;
  tone?: ModalTone;
  size?: ModalSize;
  /** Stacked / nested confirmation modal sits cleanly above a primary modal */
  nested?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  description,
  icon,
  badge,
  headerActions,
  tone = 'default',
  size = 'lg',
  nested = false,
  footer,
  children,
  className,
  bodyClassName
}: ModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    if (!nested) {
      document.body.style.overflow = 'hidden';
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (!nested) {
        document.body.style.overflow = prevOverflow || '';
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, nested]);

  if (!isOpen) return null;

  const subText = subtitle ?? description;

  return (
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-fade-in',
        nested ? 'z-[60] bg-slate-950/55' : 'z-50 bg-slate-900/60'
      )}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative w-full bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]',
          SIZE_CLASSES[size],
          className
        )}
      >
        {/* Unified Crisp Light Header */}
        {(title || icon || badge) && (
          <div className="relative z-20 px-5 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                    ICON_TONE_CLASSES[tone]
                  )}
                >
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {title && (
                    <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight truncate">
                      {title}
                    </h2>
                  )}
                  {badge}
                </div>
                {subText && (
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">{subText}</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {headerActions}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors shrink-0 cursor-pointer"
                aria-label="Закрити"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Body */}
        <div className={cn('flex-1 overflow-y-auto p-5', bodyClassName)}>{children}</div>

        {/* Optional Unified Footer */}
        {footer && (
          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
