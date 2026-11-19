import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useBusinessStore } from '../store/useBusinessStore';
import { useTranslation } from '../hooks/useTranslation';
import { api } from '../lib/api';
import { Button, Select, LanguageSelector } from '@bizx/ui';
import {
  LayoutDashboard,
  BarChart3,
  Package,
  ShoppingBag,
  Settings,
  Users,
  CreditCard,
  LogOut,
  Menu,
  X,
  ExternalLink
} from 'lucide-react';
import { AnalyticsView } from '../views/AnalyticsView';
import { DetailedAnalyticsView } from '../views/DetailedAnalyticsView';
import { ProductsView } from '../views/ProductsView';
import { OrdersView } from '../views/OrdersView';
import { StoreSettingsView } from '../views/StoreSettingsView';
import { StaffView } from '../views/StaffView';
import { PlaceholderView } from '../views/PlaceholderView';
import { resolveMediaUrl } from '../lib/media';

type TabType = 'overview' | 'analytics' | 'products' | 'orders' | 'settings' | 'staff' | 'payouts';

export const DashboardLayout: React.FC = () => {
  const { t, locale, setLocale } = useTranslation();
  const { user, logout } = useAuthStore();
  const { stores, activeStoreId, setActiveStore } = useBusinessStore();
  const [currentTab, setCurrentTab] = useState<TabType>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const merchantNavItems = [
    { id: 'overview' as const, label: t('admin.overview'), icon: LayoutDashboard },
    { id: 'analytics' as const, label: t('admin.detailedAnalytics'), icon: BarChart3 },
    { id: 'products' as const, label: t('admin.products'), icon: Package },
    { id: 'orders' as const, label: t('admin.orders'), icon: ShoppingBag },
    { id: 'settings' as const, label: t('admin.settings'), icon: Settings },
    { id: 'staff' as const, label: t('admin.staff'), icon: Users },
    { id: 'payouts' as const, label: t('admin.payouts'), icon: CreditCard, isStub: true }
  ];

  const handleLanguageChange = (next: 'uk' | 'en') => {
    setLocale(next);
    if (user) {
      api.auth.updateProfile({ preferredLanguage: next }).catch(() => {});
    }
  };

  const getInitials = (userName: string) => {
    return userName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  };

  const avatarUrl = resolveMediaUrl(user?.avatarUrl);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center font-bold text-xs tracking-wider">
            B
          </div>
          <span className="font-extrabold text-base tracking-tight text-slate-900">BizX</span>
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
          {/* Minimalist Logo */}
          <div className="hidden md:flex items-center gap-2.5 px-2">
            <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center font-bold text-xs tracking-wider">
              B
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">BizX</span>
          </div>

          {/* Active Store Switcher */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 block">
              {t('admin.storeLabel')}
            </label>
            {stores.length > 0 ? (
              <Select
                value={activeStoreId || ''}
                onChange={(val) => setActiveStore(val)}
                options={stores.map((s) => ({ value: s.id, label: s.name }))}
                placeholder={t('admin.selectStore')}
              />
            ) : (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                {t('admin.noStores')}
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t('admin.storePanel')}
            </div>
            <nav className="space-y-0.5">
              {merchantNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.isStub && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {t('common.soon')}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Subscription Status Pill */}
        {user && user.subscriptionTier && (
          <div className="px-4 py-3 border-t border-slate-100 bg-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {t('admin.tariffPlan')}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                {user.subscriptionTier === 'business_starter' && 'Starter'}
                {user.subscriptionTier === 'business_pro' && 'Pro'}
                {user.subscriptionTier === 'business_enterprise' && 'Enterprise'}
                {user.subscriptionTier !== 'business_starter' &&
                  user.subscriptionTier !== 'business_pro' &&
                  user.subscriptionTier !== 'business_enterprise' &&
                  user.subscriptionTier}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span>{t('subscriptions.daysRemainingLabel')}</span>
              <span className="font-bold text-slate-900">
                {user.subscriptionDaysLeft ?? 0} {t('common.daysShort')}
              </span>
            </div>
            {(user.subscriptionDaysLeft ?? 0) <= 5 && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800">
                {t('subscriptions.expiringSoon')}
              </div>
            )}
          </div>
        )}

        {/* User Profile Badge, Language Dropdown & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-2.5">
          <a
            href="http://localhost:3100/account"
            target="_blank"
            rel="noopener noreferrer"
            title={t('admin.manageAccountTitle')}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-left transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white border overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs">
                {avatarUrl && !avatarError ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span>{user ? getInitials(user.name) : 'U'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate group-hover:text-slate-900">
                  {user?.name || t('common.partner')}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{t('admin.profileInBizx')}</p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0 ml-1" />
          </a>

          <LanguageSelector
            value={locale}
            onChange={handleLanguageChange}
            variant="sidebar"
            dropUp={true}
            align="left"
            label={t('account.language')}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:border-red-200"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" /> {t('common.logout')}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {currentTab === 'overview' && (
            <AnalyticsView onOpenDetailed={() => setCurrentTab('analytics')} />
          )}
          {currentTab === 'analytics' && <DetailedAnalyticsView />}
          {currentTab === 'products' && <ProductsView />}
          {currentTab === 'orders' && <OrdersView />}
          {currentTab === 'settings' && <StoreSettingsView />}
          {currentTab === 'staff' && <StaffView />}
          {currentTab === 'payouts' && (
            <PlaceholderView
              title={t('admin.payoutsTitle')}
              description={t('admin.payoutsDesc')}
              icon={CreditCard}
            />
          )}
        </div>
      </main>
    </div>
  );
};
