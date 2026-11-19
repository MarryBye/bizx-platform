import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { ChevronsUpDown, Settings, LogOut, ExternalLink } from 'lucide-react';

export interface SidebarAccountMenuProps {
  name: string;
  subtitle?: string | null;
  roleBadge?: string | null;
  roleBadgeClassName?: string;
  avatarUrl?: string | null;
  accountHref?: string;
  accountSettingsLabel: string;
  logoutLabel: string;
  onLogout: () => void;
  className?: string;
}

export const SidebarAccountMenu: React.FC<SidebarAccountMenuProps> = ({
  name,
  subtitle,
  roleBadge,
  roleBadgeClassName,
  avatarUrl,
  accountHref = 'http://localhost:3100/account',
  accountSettingsLabel,
  logoutLabel,
  onLogout,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAvatarError(false);
  }, [avatarUrl]);

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);

  const getInitials = (val: string) => {
    const parts = val.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return (val.trim().slice(0, 2) || 'U').toUpperCase();
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {isOpen && (
        <div
          role="menu"
          className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 text-xs"
        >
          {/* User Identity Header */}
          <div className="px-3 py-2 border-b border-slate-100 space-y-0.5">
            <p className="font-bold text-slate-900 truncate">{name}</p>
            {subtitle && <p className="text-[11px] text-slate-500 truncate">{subtitle}</p>}
            {roleBadge && (
              <span
                className={cn(
                  'inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 max-w-full truncate',
                  roleBadgeClassName
                )}
              >
                {roleBadge}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="py-1">
            <a
              href={accountHref}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Settings className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{accountSettingsLabel}</span>
              </span>
              <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
            </a>
          </div>

          {/* Logout */}
          <div className="border-t border-slate-100 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-red-600 hover:bg-red-50 transition-colors font-semibold text-left"
            >
              <LogOut className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="truncate">{logoutLabel}</span>
            </button>
          </div>
        </div>
      )}

      {/* Profile Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={cn(
          'w-full flex items-center justify-between gap-2 p-2 rounded-xl border text-left transition-colors cursor-pointer',
          isOpen
            ? 'bg-white border-slate-300 shadow-sm'
            : 'bg-white/60 border-transparent hover:bg-white hover:border-slate-200'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {avatarUrl && !avatarError ? (
            <img
              src={avatarUrl}
              alt={name}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {getInitials(name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{name}</p>
            {roleBadge ? (
              <p className="text-[10px] font-semibold text-slate-500 truncate">{roleBadge}</p>
            ) : subtitle ? (
              <p className="text-[10px] text-slate-400 truncate">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <ChevronsUpDown
          className={cn(
            'w-3.5 h-3.5 shrink-0 transition-colors',
            isOpen ? 'text-slate-800' : 'text-slate-400'
          )}
        />
      </button>
    </div>
  );
};
