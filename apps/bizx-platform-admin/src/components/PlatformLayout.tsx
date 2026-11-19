import React, { useState, useEffect } from 'react';
import { platformApi } from '../lib/api';
import { useTranslation } from '../hooks/useTranslation';
import type { UserProfile } from '@bizx/common-types';
import { LanguageSelector, SidebarAccountMenu, CountBadge } from '@bizx/ui';
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  Clock,
  Users,
  Scale,
  ShieldCheck,
  KeyRound,
  Menu,
  X,
  ExternalLink,
  ChevronDown,
  Store as StoreIcon
} from 'lucide-react';

export type PlatformTab =
  | 'metrics'
  | 'analytics'
  | 'businesses'
  | 'businesses_pending'
  | 'disputes'
  | 'users'
  | 'staff'
  | 'roles';

interface PlatformLayoutProps {
  currentTab: PlatformTab;
  onTabChange: (tab: PlatformTab) => void;
  currentUser: UserProfile | null;
  myPermissions?: string[] | null;
  myRoleName?: string | null;
  permsLoaded?: boolean;
  pendingStoresCount?: number;
  pendingDisputesCount?: number;
  onLogout: () => void;
  children: React.ReactNode;
}

const BUSINESS_CHILD_TABS: PlatformTab[] = ['businesses', 'businesses_pending', 'disputes'];

export const PlatformLayout: React.FC<PlatformLayoutProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  myPermissions,
  myRoleName,
  permsLoaded = true,
  pendingStoresCount = 0,
  pendingDisputesCount = 0,
  onLogout,
  children
}) => {
  const { t, locale, setLocale } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBusinessesOpen, setIsBusinessesOpen] = useState(
    BUSINESS_CHILD_TABS.includes(currentTab) || pendingStoresCount > 0 || pendingDisputesCount > 0
  );

  useEffect(() => {
    if (BUSINESS_CHILD_TABS.includes(currentTab)) {
      setIsBusinessesOpen(true);
    }
  }, [currentTab]);

  const resolvedAvatar = currentUser?.avatarUrl
    ? platformApi.storage.resolveMediaUrl(currentUser.avatarUrl)
    : null;

  const hasPerm = (code: string) => Boolean(myPermissions && myPermissions.includes(code));

  const canReadStores = hasPerm('platform.stores.read');
  const canReadDisputes = hasPerm('platform.disputes.read');
  const showBusinessesGroup = canReadStores || canReadDisputes;
  const businessAttentionTotal =
    (canReadStores ? pendingStoresCount : 0) + (canReadDisputes ? pendingDisputesCount : 0);

  const isBusinessChildActive = BUSINESS_CHILD_TABS.includes(currentTab);

  const handleLanguageChange = (next: 'uk' | 'en') => {
    setLocale(next);
    if (currentUser) {
      platformApi.auth.updateProfile({ preferredLanguage: next }).catch(() => {});
    }
  };

  const getBreadcrumb = (): { parent?: string; label: string } => {
    switch (currentTab) {
      case 'metrics':
        return { label: t('platform.tabMetrics') };
      case 'analytics':
        return { label: t('platform.tabAnalytics') };
      case 'businesses':
        return { parent: t('platform.tabBusinesses'), label: t('platform.tabBusinessesAll') };
      case 'businesses_pending':
        return { parent: t('platform.tabBusinesses'), label: t('platform.tabBusinessesPending') };
      case 'disputes':
        return { parent: t('platform.tabBusinesses'), label: t('platform.tabDisputes') };
      case 'users':
        return { label: t('platform.tabUsers') };
      case 'staff':
        return { label: t('platform.tabStaff') };
      case 'roles':
        return { label: t('platform.tabRoles') };
      default:
        return { label: t('platform.consoleTitle') };
    }
  };

  const breadcrumb = getBreadcrumb();

  const renderTopButton = (id: PlatformTab, label: string, Icon: React.ComponentType<{ className?: string }>) => {
    const isActive = currentTab === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => {
          onTabChange(id);
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
          <span className="truncate">{label}</span>
        </span>
      </button>
    );
  };

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
            type="button"
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
              <>
                {hasPerm('platform.analytics.read') &&
                  renderTopButton('metrics', t('platform.tabMetrics'), LayoutDashboard)}
                {hasPerm('platform.analytics.read') &&
                  renderTopButton('analytics', t('platform.tabAnalytics'), BarChart3)}

                {/* Expandable Businesses Group Dropdown */}
                {showBusinessesGroup && (
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => setIsBusinessesOpen((prev) => !prev)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                        isBusinessChildActive && !isBusinessesOpen
                          ? 'bg-slate-900 text-white shadow-sm'
                          : isBusinessChildActive
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <Building2
                          className={`w-4 h-4 shrink-0 ${
                            isBusinessChildActive && !isBusinessesOpen
                              ? 'text-white'
                              : isBusinessChildActive
                              ? 'text-slate-900'
                              : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{t('platform.tabBusinesses')}</span>
                      </span>

                      <span className="flex items-center gap-1.5 shrink-0">
                        {!isBusinessesOpen && (
                          <CountBadge count={businessAttentionTotal} tone="amber" />
                        )}
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${
                            isBusinessesOpen ? 'rotate-180 text-slate-500' : 'text-slate-400'
                          }`}
                        />
                      </span>
                    </button>

                    {isBusinessesOpen && (
                      <div className="mt-1 ml-3.5 pl-2.5 border-l border-slate-200 space-y-0.5">
                        {canReadStores && (
                          <button
                            type="button"
                            onClick={() => {
                              onTabChange('businesses');
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left ${
                              currentTab === 'businesses'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <StoreIcon
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  currentTab === 'businesses' ? 'text-white' : 'text-slate-400'
                                }`}
                              />
                              <span className="truncate">{t('platform.tabBusinessesAll')}</span>
                            </span>
                          </button>
                        )}

                        {canReadStores && (
                          <button
                            type="button"
                            onClick={() => {
                              onTabChange('businesses_pending');
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left ${
                              currentTab === 'businesses_pending'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <Clock
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  currentTab === 'businesses_pending'
                                    ? 'text-amber-300'
                                    : 'text-amber-500'
                                }`}
                              />
                              <span className="truncate">{t('platform.tabBusinessesPending')}</span>
                            </span>
                            <CountBadge
                              count={pendingStoresCount}
                              tone="amber"
                              inverted={currentTab === 'businesses_pending'}
                            />
                          </button>
                        )}

                        {canReadDisputes && (
                          <button
                            type="button"
                            onClick={() => {
                              onTabChange('disputes');
                              setIsMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left ${
                              currentTab === 'disputes'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <Scale
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  currentTab === 'disputes' ? 'text-rose-300' : 'text-rose-500'
                                }`}
                              />
                              <span className="truncate">{t('platform.tabDisputes')}</span>
                            </span>
                            <CountBadge
                              count={pendingDisputesCount}
                              tone="red"
                              inverted={currentTab === 'disputes'}
                            />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {hasPerm('platform.users.read') &&
                  renderTopButton('users', t('platform.tabUsers'), Users)}
                {hasPerm('platform.staff.read') &&
                  renderTopButton('staff', t('platform.tabStaff'), ShieldCheck)}
                {hasPerm('platform.roles.read') &&
                  renderTopButton('roles', t('platform.tabRoles'), KeyRound)}
              </>
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
            {breadcrumb.parent && (
              <>
                <span className="text-slate-300">/</span>
                <span className="font-semibold text-slate-500">{breadcrumb.parent}</span>
              </>
            )}
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-900 truncate">{breadcrumb.label}</span>
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
