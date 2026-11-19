import React, { useState } from 'react';
import { platformApi } from '../lib/api';
import { useTranslation } from '../hooks/useTranslation';
import { formatCompactCount, type UserProfile } from '@bizx/common-types';
import { LanguageSelector, SidebarAccountMenu } from '@bizx/ui';
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  Users,
  Scale,
  ShieldCheck,
  KeyRound,
  Menu,
  X,
  ExternalLink
} from 'lucide-react';

export type PlatformTab =
  | 'metrics'
  | 'analytics'
  | 'businesses'
  | 'users'
  | 'disputes'
  | 'staff'
  | 'roles';

interface PlatformLayoutProps {
  currentTab: PlatformTab;
  onTabChange: (tab: PlatformTab) => void;
  currentUser: UserProfile | null;
  myPermissions?: string[] | null;
  myRoleName?: string | null;
  permsLoaded?: boolean;
  pendingDisputesCount?: number;
  onLogout: () => void;
  children: React.ReactNode;
}

export const PlatformLayout: React.FC<PlatformLayoutProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  myPermissions,
  myRoleName,
  permsLoaded = true,
  pendingDisputesCount = 0,
  onLogout,
  children
}) => {
  const { t, locale, setLocale } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const resolvedAvatar = currentUser?.avatarUrl
    ? platformApi.storage.resolveMediaUrl(currentUser.avatarUrl)
    : null;

  const hasPerm = (code: string) => Boolean(myPermissions && myPermissions.includes(code));

  const navItems = [
    { id: 'metrics' as const, label: t('platform.tabMetrics'), icon: LayoutDashboard, visible: hasPerm('platform.analytics.read') },
    { id: 'analytics' as const, label: t('platform.tabAnalytics'), icon: BarChart3, visible: hasPerm('platform.analytics.read') },
    { id: 'businesses' as const, label: t('platform.tabBusinesses'), icon: Building2, visible: hasPerm('platform.stores.read') },
    { id: 'users' as const, label: t('platform.tabUsers'), icon: Users, visible: hasPerm('platform.users.read') },
    { id: 'disputes' as const, label: t('platform.tabDisputes'), icon: Scale, visible: hasPerm('platform.disputes.read') },
    { id: 'staff' as const, label: t('platform.tabStaff'), icon: ShieldCheck, visible: hasPerm('platform.staff.read') },
    { id: 'roles' as const, label: t('platform.tabRoles'), icon: KeyRound, visible: hasPerm('platform.roles.read') }
  ].filter((item) => item.visible);

  const handleLanguageChange = (next: 'uk' | 'en') => {
    setLocale(next);
    if (currentUser) {
      platformApi.auth.updateProfile({ preferredLanguage: next }).catch(() => {});
    }
  };

  const currentTabLabel = navItems.find((item) => item.id === currentTab)?.label;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between p-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center font-bold text-xs tracking-wider">
            B
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-slate-900">BizX Control</span>
            <span className="block text-[9px] font-bold text-blue-600 uppercase">Platform Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSelector
            value={locale}
            onChange={handleLanguageChange}
            variant="minimal"
            align="right"
          />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg border border-slate-200 text-slate-600"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sticky Full-Viewport Sidebar */}
      <aside
        className={`w-full md:w-64 bg-white border-r border-slate-200 flex-col shrink-0 md:sticky md:top-0 md:h-screen md:max-h-screen z-30 ${
          isMobileMenuOpen ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Top Fixed Brand Header */}
        <div className="p-4 pb-3 border-b border-slate-100 shrink-0">
          <div className="hidden md:flex items-center justify-between px-1">
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
        </div>

        {/* Scrollable Middle Navigation + Quick Links */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          <nav className="space-y-0.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              {t('platform.consoleTitle')}
            </div>
            {!permsLoaded ? (
              <div className="px-2 py-2 space-y-2">
                <div className="h-8 rounded-lg bg-slate-100 animate-pulse" />
                <div className="h-8 rounded-lg bg-slate-100 animate-pulse" />
                <div className="h-8 rounded-lg bg-slate-100 animate-pulse" />
              </div>
            ) : (
              navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.id === 'disputes' && pendingDisputesCount > 0 && (
                      <span
                        className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold shrink-0 ${
                          isActive ? 'bg-white text-slate-900' : 'bg-red-600 text-white'
                        }`}
                      >
                        {formatCompactCount(pendingDisputesCount)}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </nav>

          {/* Quick External Links */}
          <div className="pt-3 border-t border-slate-100 space-y-0.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
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

        {/* Pinned Bottom Operator Account Dropdown */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/70 shrink-0">
          <SidebarAccountMenu
            name={currentUser?.name || t('platform.operatorFallback')}
            subtitle={currentUser?.email || currentUser?.phone || null}
            roleBadge={myRoleName || t('roles.platformAdmin')}
            roleBadgeClassName="bg-blue-50 text-blue-700"
            avatarUrl={resolvedAvatar}
            accountHref="http://localhost:3100/account"
            accountSettingsLabel={t('nav.accountSettings')}
            logoutLabel={t('common.logout')}
            onLogout={onLogout}
          />
        </div>
      </aside>

      {/* Right Content Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Desktop Top Utility Bar (Breadcrumb + Landing-style Language Dropdown) */}
        <header className="hidden md:flex sticky top-0 z-20 h-14 px-6 lg:px-8 bg-white/85 backdrop-blur-sm border-b border-slate-200/80 items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <span className="font-semibold text-slate-500">BizX Control</span>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-900 truncate">
              {currentTabLabel || t('platform.consoleTitle')}
            </span>
          </div>

          <LanguageSelector
            value={locale}
            onChange={handleLanguageChange}
            variant="minimal"
            align="right"
          />
        </header>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
