import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useBusinessStore } from '../store/useBusinessStore';
import { useTranslation } from '../hooks/useTranslation';
import { api } from '../lib/api';
import type { MemberAccessSummary } from '@bizx/common-types';
import { Button, Select, LanguageSelector } from '@bizx/ui';
import {
  LayoutDashboard,
  BarChart3,
  Package,
  ShoppingBag,
  Settings,
  Users,
  ShieldCheck,
  CreditCard,
  LogOut,
  Menu,
  X,
  ExternalLink,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { AnalyticsView } from '../views/AnalyticsView';
import { DetailedAnalyticsView } from '../views/DetailedAnalyticsView';
import { ProductsView } from '../views/ProductsView';
import { OrdersView } from '../views/OrdersView';
import { StoreSettingsView } from '../views/StoreSettingsView';
import { StaffView } from '../views/StaffView';
import { RolesView } from '../views/RolesView';
import { PlaceholderView } from '../views/PlaceholderView';
import { resolveMediaUrl } from '../lib/media';

type TabType = 'overview' | 'analytics' | 'products' | 'orders' | 'settings' | 'staff' | 'roles' | 'payouts';

export const DashboardLayout: React.FC = () => {
  const { t, locale, setLocale } = useTranslation();
  const { user, hasActiveSubscription, logout } = useAuthStore();
  const { stores, activeStore, activeStoreId, setActiveStore } = useBusinessStore();
  const [currentTab, setCurrentTab] = useState<TabType>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [myAccess, setMyAccess] = useState<MemberAccessSummary | null>(null);
  const [permsLoaded, setPermsLoaded] = useState(false);
  const [ownerHasActiveSub, setOwnerHasActiveSub] = useState<boolean>(true);

  useEffect(() => {
    if (!activeStoreId) {
      setMyAccess(null);
      setPermsLoaded(true);
      setOwnerHasActiveSub(hasActiveSubscription);
      return;
    }
    let cancelled = false;
    setPermsLoaded(false);
    api.rbac
      .getStorePermissions(activeStoreId)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data?.myAccess) {
          setMyAccess(res.data.myAccess);
          setOwnerHasActiveSub(
            res.data.ownerHasActiveSubscription !== undefined
              ? res.data.ownerHasActiveSubscription
              : hasActiveSubscription
          );
        } else {
          setMyAccess(null);
        }
      })
      .catch(() => {
        if (!cancelled) setMyAccess(null);
      })
      .finally(() => {
        if (!cancelled) setPermsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [activeStoreId, hasActiveSubscription]);

  const myPermissions = myAccess?.permissions ?? [];
  const hasPerm = (code: string) => Boolean(myAccess && myPermissions.includes(code));
  const isOwnerOrAdmin = Boolean(
    myAccess && (myAccess.isOwner || myPermissions.includes('store.admin'))
  );

  const isStoreInactive = activeStore && activeStore.status !== 'active';
  const isReadOnly = activeStore ? !ownerHasActiveSub : !hasActiveSubscription;

  const merchantNavItems = [
    { id: 'overview' as const, label: t('admin.overview'), icon: LayoutDashboard, visible: hasPerm('analytics.read') },
    { id: 'analytics' as const, label: t('admin.detailedAnalytics'), icon: BarChart3, visible: hasPerm('analytics.read') },
    { id: 'products' as const, label: t('admin.products'), icon: Package, visible: hasPerm('products.read') },
    { id: 'orders' as const, label: t('admin.orders'), icon: ShoppingBag, visible: hasPerm('orders.read') },
    { id: 'settings' as const, label: t('admin.settings'), icon: Settings, visible: hasPerm('store.read') },
    { id: 'staff' as const, label: t('admin.staff'), icon: Users, visible: hasPerm('staff.read') },
    { id: 'roles' as const, label: t('admin.roles'), icon: ShieldCheck, visible: hasPerm('roles.read') },
    { id: 'payouts' as const, label: t('admin.payouts'), icon: CreditCard, isStub: true, visible: isOwnerOrAdmin }
  ].filter((item) => item.visible);

  useEffect(() => {
    if (permsLoaded && merchantNavItems.length > 0) {
      const currentStillVisible = merchantNavItems.some((item) => item.id === currentTab);
      if (!currentStillVisible) {
        setCurrentTab(merchantNavItems[0].id);
      }
    }
  }, [permsLoaded, myAccess, currentTab]);

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

  const formatTierShort = (tier?: string | null) => {
    if (tier === 'business_starter') return 'Starter';
    if (tier === 'business_pro') return 'Pro';
    if (tier === 'business_enterprise') return 'Enterprise';
    return tier || 'Free';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900">
      {/* Mobile Top Header */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between p-4 bg-white border-b border-slate-200">
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

      {/* Sticky Full-Viewport Sidebar */}
      <aside
        className={`w-full md:w-64 bg-white border-r border-slate-200 flex-col shrink-0 md:sticky md:top-0 md:h-screen md:max-h-screen md:overflow-hidden ${
          isMobileMenuOpen ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Top Fixed Header + Store Switcher + Compact Subscription Pill (Owner/Admin only) */}
        <div className="p-4 pb-3 space-y-3.5 shrink-0 border-b border-slate-100">
          {/* Minimalist Logo */}
          <div className="hidden md:flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center font-bold text-xs tracking-wider">
                B
              </div>
              <span className="font-extrabold text-base tracking-tight text-slate-900">BizX</span>
            </div>
            {myAccess?.roleName && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 truncate max-w-[115px]">
                {myAccess.roleName}
              </span>
            )}
          </div>

          {/* Active Store Switcher */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t('admin.storeLabel')}
              </label>
              {activeStore && activeStore.status !== 'active' && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700 border border-red-200 uppercase">
                  {t(`statuses.store.${activeStore.status}`)}
                </span>
              )}
            </div>
            {stores.length > 0 ? (
              <div className={activeStore && activeStore.status !== 'active' ? 'ring-1 ring-red-300 rounded-lg' : ''}>
                <Select
                  value={activeStoreId || ''}
                  onChange={(val) => setActiveStore(val)}
                  options={stores.map((s) => ({
                    value: s.id,
                    label:
                      s.status === 'active'
                        ? s.name
                        : `${s.name} (${t(`statuses.store.${s.status}`)})`
                  }))}
                  placeholder={t('admin.selectStore')}
                />
              </div>
            ) : (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                {t('admin.noStores')}
              </div>
            )}
          </div>

          {/* Compact Subscription Info — ONLY for Owner or Store Admin */}
          {isOwnerOrAdmin && user && (user.subscriptionTier || myAccess?.isOwner) && (
            <div className="px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t('admin.tariffPlan')}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white">
                    {formatTierShort(user.subscriptionTier)}
                  </span>
                  {myAccess?.isOwner && (
                    <span className="text-[10px] font-semibold text-slate-600">
                      {user.subscriptionDaysLeft ?? 0} {t('common.daysShort')}
                    </span>
                  )}
                </div>
              </div>
              {myAccess?.isOwner && (user.subscriptionDaysLeft ?? 0) <= 5 && (
                <div className="text-[10px] font-semibold text-amber-700">
                  {t('subscriptions.expiringSoon')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Middle Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {t('admin.storePanel')}
          </div>
          {!permsLoaded ? (
            <div className="px-3 py-4 space-y-2">
              <div className="h-8 rounded-lg bg-slate-100 animate-pulse" />
              <div className="h-8 rounded-lg bg-slate-100 animate-pulse" />
              <div className="h-8 rounded-lg bg-slate-100 animate-pulse" />
            </div>
          ) : (
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.isStub && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ${
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
          )}
        </div>

        {/* Pinned Bottom User Profile, Language & Logout */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/70 space-y-2 shrink-0">
          <a
            href="http://localhost:3100/account"
            target="_blank"
            rel="noopener noreferrer"
            title={t('admin.manageAccountTitle')}
            className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-left transition-colors group cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {avatarUrl && !avatarError ? (
                <img
                  src={avatarUrl}
                  alt={user?.name || ''}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {getInitials(user?.name || 'U')}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                  {user?.name || t('common.user')}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{t('admin.profileInBizx')}</p>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0 ml-1" />
          </a>

          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <LanguageSelector
                value={locale}
                onChange={handleLanguageChange}
                variant="sidebar"
                dropUp={true}
                align="left"
                label={t('account.language')}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              title={t('common.logout')}
              className="px-2.5 text-xs text-red-600 hover:bg-red-50 hover:border-red-200 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-5">
          {/* Inactive / Read-Only Banner */}
          {(isReadOnly || isStoreInactive) && activeStore && (
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isReadOnly || activeStore.status === 'suspended'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-start gap-3">
                {isReadOnly ? (
                  <Lock className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-red-700">{activeStore.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-800 border border-red-200">
                      {t(`statuses.store.${activeStore.status}`)}
                    </span>
                    {isReadOnly && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-900 text-white">
                        {locale === 'en' ? 'Read-only' : 'Лише перегляд'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed">
                    {isReadOnly
                      ? locale === 'en'
                        ? 'This store is inactive because the business subscription has expired or is missing. Editing is locked — you can only view historical data.'
                        : 'Бізнес не працює: термін дії бізнес-підписки закінчився або підписка відсутня. Редагування заблоковано — доступний лише перегляд збережених даних.'
                      : activeStore.status === 'suspended'
                        ? locale === 'en'
                          ? 'This store is currently suspended and hidden from shoppers. Submit it for BizX review in your Personal Account to reactivate.'
                          : 'Заклад призупинено та приховано від покупців. Перейдіть у кабінет BizX, щоб відправити його на перевірку для повторної активації.'
                        : activeStore.status === 'pending'
                          ? locale === 'en'
                            ? 'This store is awaiting moderation approval from BizX administrators.'
                            : 'Заклад очікує перевірки та підтвердження модераторами BizX.'
                          : locale === 'en'
                            ? 'This store is in draft mode. Submit it for moderation when ready.'
                            : 'Заклад знаходиться у статусі чернетки. Надішліть його на модерацію, коли будете готові.'}
                  </p>
                </div>
              </div>
              {myAccess?.isOwner && (
                <a
                  href="http://localhost:3100/account"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors self-start sm:self-center"
                >
                  <span>{locale === 'en' ? 'Manage in BizX' : 'Керувати в BizX'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {permsLoaded && merchantNavItems.length === 0 && activeStore ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
              <Lock className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">
                {locale === 'en' ? 'No permissions assigned' : 'Немає призначених доступів'}
              </h3>
              <p className="text-xs text-slate-500">
                {locale === 'en'
                  ? 'Contact the store owner or administrator to assign a role with permissions.'
                  : 'Зверніться до власника або адміністратора закладу для надання прав доступу.'}
              </p>
            </div>
          ) : (
            <>
              {currentTab === 'overview' && hasPerm('analytics.read') && (
                <AnalyticsView onOpenDetailed={() => setCurrentTab('analytics')} />
              )}
              {currentTab === 'analytics' && hasPerm('analytics.read') && (
                <DetailedAnalyticsView canExport={hasPerm('analytics.export')} />
              )}
              {currentTab === 'products' && hasPerm('products.read') && (
                <ProductsView
                  isReadOnly={isReadOnly}
                  canCreate={!isReadOnly && hasPerm('products.write')}
                  canEdit={!isReadOnly && hasPerm('products.edit')}
                  canChangeStatus={!isReadOnly && hasPerm('products.status')}
                  canArchive={!isReadOnly && hasPerm('products.archive')}
                />
              )}
              {currentTab === 'orders' && hasPerm('orders.read') && (
                <OrdersView canEdit={!isReadOnly && hasPerm('orders.edit')} />
              )}
              {currentTab === 'settings' && hasPerm('store.read') && (
                <StoreSettingsView
                  isReadOnly={isReadOnly}
                  canEdit={!isReadOnly && hasPerm('store.edit')}
                />
              )}
              {currentTab === 'staff' && hasPerm('staff.read') && <StaffView />}
              {currentTab === 'roles' && hasPerm('roles.read') && <RolesView />}
              {currentTab === 'payouts' && isOwnerOrAdmin && (
                <PlaceholderView
                  title={t('admin.payoutsTitle')}
                  description={t('admin.payoutsDesc')}
                  icon={CreditCard}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};
