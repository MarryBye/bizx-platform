import React, { useState } from 'react';
import { platformApi } from '../lib/api';
import { useTranslation } from '../hooks/useTranslation';
import type { UserProfile } from '@bizx/common-types';
import { LanguageSelector } from '@bizx/ui';
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  Users,
  ShieldCheck,
  KeyRound,
  LogOut,
  Menu,
  X,
  ExternalLink
} from 'lucide-react';

export type PlatformTab = 'metrics' | 'analytics' | 'businesses' | 'users' | 'staff' | 'roles';

interface PlatformLayoutProps {
  currentTab: PlatformTab;
  onTabChange: (tab: PlatformTab) => void;
  currentUser: UserProfile | null;
  myPermissions?: string[] | null;
  onLogout: () => void;
  children: React.ReactNode;
}

export const PlatformLayout: React.FC<PlatformLayoutProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  myPermissions,
  onLogout,
  children
}) => {
  const { t, locale, setLocale } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const resolvedAvatar = currentUser?.avatarUrl
    ? platformApi.storage.resolveMediaUrl(currentUser.avatarUrl)
    : null;

  const hasPerm = (code: string) => !myPermissions || myPermissions.includes(code);

  const navItems = [
    { id: 'metrics' as const, label: t('platform.tabMetrics'), icon: LayoutDashboard, visible: hasPerm('platform.analytics.read') },
    { id: 'analytics' as const, label: t('platform.tabAnalytics'), icon: BarChart3, visible: hasPerm('platform.analytics.read') },
    { id: 'businesses' as const, label: t('platform.tabBusinesses'), icon: Building2, visible: hasPerm('platform.stores.read') },
    { id: 'users' as const, label: t('platform.tabUsers'), icon: Users, visible: hasPerm('platform.users.read') },
    { id: 'staff' as const, label: t('platform.tabStaff'), icon: ShieldCheck, visible: hasPerm('platform.staff.read') },
    { id: 'roles' as const, label: t('platform.tabRoles'), icon: KeyRound, visible: hasPerm('platform.roles.read') }
  ].filter((item) => item.visible);

  const handleLanguageChange = (next: 'uk' | 'en') => {
    setLocale(next);
    if (currentUser) {
      platformApi.auth.updateProfile({ preferredLanguage: next }).catch(() => {});
    }
  };

  const getInitials = (nameVal?: string) => {
    if (!nameVal) return 'SA';
    const parts = nameVal.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return nameVal.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center font-bold text-xs tracking-wider">
            B
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900">BizX Control</span>
            <span className="block text-[9px] font-bold text-blue-600 uppercase">Platform Admin</span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg border border-slate-200 text-slate-600"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`w-full md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 ${
          isMobileMenuOpen ? 'block' : 'hidden md:flex'
        }`}
      >
        <div className="p-4 space-y-6">
          {/* Logo & Service Badge */}
          <div className="hidden md:flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center font-bold text-xs tracking-wider">
                B
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900">BizX</span>
                <span className="block text-[9px] font-bold text-blue-600 uppercase tracking-wider">
                  Platform Core
                </span>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 font-mono">
              Control
            </span>
          </div>

          {/* Platform Navigation */}
          <nav className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              {t('platform.consoleTitle')}
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick External Links */}
          <div className="pt-4 border-t border-slate-100 space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              {t('platform.quickLinks')}
            </div>
            <a
              href="http://localhost:3100"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-medium"
            >
              <span>{t('nav.mainPortal')}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            </a>
            <a
              href="http://localhost:3102"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-medium"
            >
              <span>{t('nav.businessAdmin')}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Bottom Operator Pill + Language Dropdown */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-3">
          <LanguageSelector
            value={locale}
            onChange={handleLanguageChange}
            variant="sidebar"
            dropUp={true}
            align="left"
            label={t('account.language')}
          />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                {resolvedAvatar && !avatarError ? (
                  <img
                    src={resolvedAvatar}
                    alt={currentUser?.name || ''}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  getInitials(currentUser?.name)
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {currentUser?.name || t('platform.operatorFallback')}
                </div>
                <div className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded inline-block">
                  {t('roles.platformAdmin')}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              title={t('platform.logoutTitle')}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
};
