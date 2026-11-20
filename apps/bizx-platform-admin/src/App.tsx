import React, { useState, useEffect, useCallback, useRef } from 'react';
import { platformApi } from './lib/api';
import { useTranslation, initPlatformLocale } from './hooks/useTranslation';
import type {
  UserProfile,
  PlatformAnalytics,
  StoreCategory,
  MemberAccessSummary,
  UpdatePlatformUserStatusDto,
  UpdatePlatformUserSubscriptionDto
} from '@bizx/common-types';
import { ShieldAlert, AlertCircle, X, Lock, Bell, ArrowRight } from 'lucide-react';
import { PlatformLayout, type PlatformTab } from './components/PlatformLayout';
import { MetricsView } from './views/MetricsView';
import { PlatformAnalyticsView } from './views/PlatformAnalyticsView';
import { PlatformRolesView } from './views/PlatformRolesView';
import { BusinessesView, type ExtendedBusiness } from './views/BusinessesView';
import { PendingBusinessesView } from './views/PendingBusinessesView';
import { UsersView } from './views/UsersView';
import { DisputesView } from './views/DisputesView';
import { SupportView } from './views/SupportView';
import { BroadcastsView } from './views/BroadcastsView';
import { StaffView } from './views/StaffView';
import { LoginView } from './views/LoginView';
import {
  BusinessDetailsModal,
  type BusinessStatusUpdatePayload
} from './components/BusinessDetailsModal';
import { UserDetailsModal, type PlatformUserRecord } from './components/UserDetailsModal';

export const App: React.FC = () => {
  const { t, locale } = useTranslation();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<PlatformTab>('metrics');

  // Platform Data State (100% real DB — zero mock fallbacks)
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [businesses, setBusinesses] = useState<ExtendedBusiness[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [myAccess, setMyAccess] = useState<MemberAccessSummary | null>(null);
  const [permsLoaded, setPermsLoaded] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals & Active Selections
  const [selectedBusiness, setSelectedBusiness] = useState<ExtendedBusiness | null>(null);
  const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);
  const [isUpdatingBusinessStatus, setIsUpdatingBusinessStatus] = useState(false);

  const [selectedUser, setSelectedUser] = useState<PlatformUserRecord | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Users State (loaded from real DB /platform/users)
  const [usersList, setUsersList] = useState<PlatformUserRecord[]>([]);
  const [pendingDisputesCount, setPendingDisputesCount] = useState<number>(0);
  const [pendingStoresCount, setPendingStoresCount] = useState<number>(0);
  const [unreadSupportCount, setUnreadSupportCount] = useState<number>(0);
  const [newPendingAlert, setNewPendingAlert] = useState<number | null>(null);
  const prevPendingStoresRef = useRef<number | null>(null);

  const myPermissions = myAccess?.permissions ?? [];
  const hasPerm = (code: string) => Boolean(myAccess && myPermissions.includes(code));

  // Load Real Data from Backend API strictly according to user permissions
  const loadPlatformData = useCallback(async () => {
    setIsDataLoading(true);
    try {
      // 1. Fetch Real Platform Permissions FIRST
      let perms: string[] = [];
      try {
        const permRes = await platformApi.rbac.getPlatformPermissions();
        if (permRes.success && permRes.data?.myAccess) {
          setMyAccess(permRes.data.myAccess);
          perms = permRes.data.myAccess.permissions;
        } else {
          setMyAccess(null);
        }
      } catch {
        setMyAccess(null);
      } finally {
        setPermsLoaded(true);
      }

      // 2. Fetch Categories (public)
      try {
        const catRes = await platformApi.stores.getCategories();
        if (catRes.success && catRes.data) {
          setCategories(catRes.data.map((c: StoreCategory) => ({ id: c.id, name: c.name })));
        }
      } catch {
        setCategories([]);
      }

      // 3. Fetch ALL Platform Stores (including draft/pending/suspended/archived) ONLY if platform.stores.read
      if (perms.includes('platform.stores.read')) {
        try {
          const storesRes = await platformApi.rbac.getPlatformStores();
          if (storesRes.success && storesRes.data) {
            const mapped = storesRes.data.map((st) => ({
              ...st,
              categoryName: st.categoryName || undefined,
              ownerName: st.ownerName || undefined,
              ownerEmail: st.ownerEmail || undefined
            }));
            setBusinesses(mapped);
            const pCount = mapped.filter((b) => b.status === 'pending').length;
            setPendingStoresCount(pCount);
            if (prevPendingStoresRef.current === null) {
              prevPendingStoresRef.current = pCount;
            }
          }
        } catch {
          setBusinesses([]);
        }
      } else {
        setBusinesses([]);
      }

      // 4. Fetch Platform Analytics ONLY if platform.analytics.read
      if (perms.includes('platform.analytics.read')) {
        try {
          const aRes = await platformApi.analytics.getPlatformAnalytics();
          if (aRes.success && aRes.data) {
            setAnalytics(aRes.data);
          }
        } catch {
          setAnalytics(null);
        }
      } else {
        setAnalytics(null);
      }

      // 5. Fetch Users ONLY if platform.users.read
      if (perms.includes('platform.users.read')) {
        try {
          const uRes = await platformApi.rbac.getPlatformUsers();
          if (uRes.success && uRes.data) {
            setUsersList(
              uRes.data.map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                phone: u.phone || undefined,
                isPlatformStaff: Boolean(u.isPlatformStaff),
                platformRoleName: u.platformRoleName || null,
                isBusinessOwner: Boolean(u.isBusinessOwner),
                storesCount: u.storesCount ?? 0,
                status: u.status,
                suspendedUntil: u.suspendedUntil || null,
                suspensionReason: u.suspensionReason || null,
                subscriptionTier: u.subscriptionTier || 'free',
                subscriptionStatus: u.subscriptionStatus || 'none',
                subscriptionExpiresAt: u.subscriptionExpiresAt || null,
                createdAt: new Date(u.createdAt).toLocaleDateString('uk-UA')
              }))
            );
          }
        } catch {
          setUsersList([]);
        }
      } else {
        setUsersList([]);
      }
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  // Auto-select first permitted tab when permissions finish loading
  useEffect(() => {
    if (!permsLoaded || !myAccess) return;
    const allowedTabs: PlatformTab[] = [];
    if (myAccess.permissions.includes('platform.analytics.read')) {
      allowedTabs.push('metrics', 'analytics');
    }
    if (myAccess.permissions.includes('platform.stores.read')) {
      allowedTabs.push('businesses', 'businesses_pending');
    }
    if (myAccess.permissions.includes('platform.users.read')) allowedTabs.push('users');
    if (myAccess.permissions.includes('platform.disputes.read')) allowedTabs.push('disputes');
    if (myAccess.permissions.includes('platform.support.read')) allowedTabs.push('support');
    if (myAccess.permissions.includes('platform.broadcasts.read')) allowedTabs.push('broadcasts');
    if (myAccess.permissions.includes('platform.staff.read')) allowedTabs.push('staff');
    if (myAccess.permissions.includes('platform.roles.read')) allowedTabs.push('roles');

    if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [permsLoaded, myAccess, activeTab]);

  // Poll pending escalated disputes count for sidebar badge
  const refreshDisputesSummary = useCallback(() => {
    if (!myAccess?.permissions.includes('platform.disputes.read')) {
      setPendingDisputesCount(0);
      return;
    }
    platformApi.orders
      .getPlatformDisputesSummary()
      .then((res) => {
        if (res.success && res.data) {
          setPendingDisputesCount(res.data.pendingEscalatedCount);
        }
      })
      .catch(() => {});
  }, [myAccess]);

  // Poll pending businesses summary every 15s and notify staff when a new store awaits moderation
  const refreshPendingStoresSummary = useCallback(() => {
    if (!myAccess?.permissions.includes('platform.stores.read')) {
      setPendingStoresCount(0);
      return;
    }
    platformApi.stores
      .getPlatformStoresSummary()
      .then((res) => {
        if (res.success && res.data) {
          const nextCount = res.data.pendingCount;
          if (prevPendingStoresRef.current !== null && nextCount > prevPendingStoresRef.current) {
            const diff = nextCount - prevPendingStoresRef.current;
            setNewPendingAlert(diff);
            // Refresh full businesses list in background so the queue has the new store immediately
            platformApi.rbac
              .getPlatformStores()
              .then((stRes) => {
                if (stRes.success && stRes.data) {
                  setBusinesses(
                    stRes.data.map((st) => ({
                      ...st,
                      categoryName: st.categoryName || undefined,
                      ownerName: st.ownerName || undefined,
                      ownerEmail: st.ownerEmail || undefined
                    }))
                  );
                }
              })
              .catch(() => {});
          }
          prevPendingStoresRef.current = nextCount;
          setPendingStoresCount(nextCount);
        }
      })
      .catch(() => {});
  }, [myAccess]);

  const refreshSupportSummary = useCallback(() => {
    if (!myAccess?.permissions.includes('platform.support.read')) {
      setUnreadSupportCount(0);
      return;
    }
    platformApi.broadcasts
      .getPlatformSupportSummary()
      .then((res) => {
        if (res.success && res.data) {
          setUnreadSupportCount(res.data.unreadThreadsCount);
        }
      })
      .catch(() => {});
  }, [myAccess]);

  useEffect(() => {
    refreshDisputesSummary();
    refreshPendingStoresSummary();
    refreshSupportSummary();
    const canDisputes = Boolean(myAccess?.permissions.includes('platform.disputes.read'));
    const canStores = Boolean(myAccess?.permissions.includes('platform.stores.read'));
    const canSupport = Boolean(myAccess?.permissions.includes('platform.support.read'));
    if (!canDisputes && !canStores && !canSupport) return;
    const timer = window.setInterval(() => {
      if (canDisputes) refreshDisputesSummary();
      if (canStores) refreshPendingStoresSummary();
      if (canSupport) refreshSupportSummary();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [myAccess, refreshDisputesSummary, refreshPendingStoresSummary, refreshSupportSummary]);

  // Check auth on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoadingAuth(true);
      try {
        const res = await platformApi.auth.me();
        if (res.success && res.data) {
          setCurrentUser(res.data);
          initPlatformLocale(res.data.preferredLanguage);
          if (res.data.isPlatformStaff) {
            await loadPlatformData();
          }
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    void initAuth();
  }, [loadPlatformData]);

  // Handler: Update Business Status (with optional timed suspension & mandatory reason)
  const handleUpdateBusinessStatus = async (
    id: string,
    payload: BusinessStatusUpdatePayload
  ) => {
    setIsUpdatingBusinessStatus(true);
    setActionError(null);
    try {
      let updatedStore: {
        status?: string;
        suspendedUntil?: string | null;
        suspensionReason?: string | null;
      } | null = null;

      if (payload.status === 'archived') {
        await platformApi.stores.archiveStore(id);
        updatedStore = { status: 'archived', suspendedUntil: null, suspensionReason: null };
      } else {
        const res = await platformApi.stores.updateStore(id, {
          status: payload.status,
          suspensionDays: payload.suspensionDays,
          suspensionReason: payload.suspensionReason ?? undefined
        });
        updatedStore = res.data || { status: payload.status };
      }

      const nextStatus = (updatedStore?.status || payload.status) as ExtendedBusiness['status'];
      const nextUntil =
        payload.status === 'suspended' ? updatedStore?.suspendedUntil ?? null : null;
      const nextReason =
        payload.status === 'suspended'
          ? updatedStore?.suspensionReason ?? payload.suspensionReason ?? null
          : null;

      setBusinesses((prev) => {
        const next = prev.map((b) =>
          b.id === id
            ? {
                ...b,
                status: nextStatus,
                suspendedUntil: nextUntil,
                suspensionReason: nextReason
              }
            : b
        );
        const pCount = next.filter((b) => b.status === 'pending').length;
        prevPendingStoresRef.current = pCount;
        setPendingStoresCount(pCount);
        return next;
      });

      if (selectedBusiness && selectedBusiness.id === id) {
        setSelectedBusiness((prev) =>
          prev
            ? {
                ...prev,
                status: nextStatus,
                suspendedUntil: nextUntil,
                suspensionReason: nextReason
              }
            : null
        );
      }
    } catch (err: any) {
      setActionError(
        err?.data?.message ||
          err?.message ||
          (locale === 'en'
            ? 'Insufficient permissions to update store status'
            : 'Недостатньо прав для зміни статусу закладу')
      );
      throw err;
    } finally {
      setIsUpdatingBusinessStatus(false);
    }
  };

  // Handler: Approve Pending Store (platform.stores.approve)
  const handleApproveStore = async (id: string) => {
    setIsUpdatingBusinessStatus(true);
    setActionError(null);
    try {
      const res = await platformApi.stores.approveStore(id);
      if (res.success) {
        setBusinesses((prev) => {
          const next = prev.map((b) => (b.id === id ? { ...b, status: 'active' as const } : b));
          const pCount = next.filter((b) => b.status === 'pending').length;
          prevPendingStoresRef.current = pCount;
          setPendingStoresCount(pCount);
          return next;
        });
        if (selectedBusiness && selectedBusiness.id === id) {
          setSelectedBusiness((prev) => (prev ? { ...prev, status: 'active' } : null));
        }
      }
    } catch (err: any) {
      setActionError(
        err?.data?.message ||
          err?.message ||
          'Недостатньо прав для підтвердження нового закладу'
      );
    } finally {
      setIsUpdatingBusinessStatus(false);
    }
  };

  // Handler: Reject Pending Store with Reason -> sends official BizX Inbox letter to owner
  const handleRejectStore = async (id: string, reason: string) => {
    setIsUpdatingBusinessStatus(true);
    setActionError(null);
    try {
      const res = await platformApi.stores.rejectStore(id, { reason });
      if (res.success) {
        setBusinesses((prev) => {
          const next = prev.map((b) => (b.id === id ? { ...b, status: 'draft' as const } : b));
          const pCount = next.filter((b) => b.status === 'pending').length;
          prevPendingStoresRef.current = pCount;
          setPendingStoresCount(pCount);
          return next;
        });
        if (selectedBusiness && selectedBusiness.id === id) {
          setSelectedBusiness((prev) => (prev ? { ...prev, status: 'draft' } : null));
        }
      }
    } catch (err: any) {
      setActionError(
        err?.data?.message ||
          err?.message ||
          'Недостатньо прав для відхилення заявки закладу'
      );
      throw err;
    } finally {
      setIsUpdatingBusinessStatus(false);
    }
  };

  // Handler: Open Private Storefront Preview in new tab (works for pending & draft stores!)
  const handlePreviewStore = async (store: { id: string; slug: string }) => {
    setActionError(null);
    try {
      const res = await platformApi.stores.createPreviewToken(store.id);
      if (res.success && res.data?.previewToken) {
        const previewUrl = `http://localhost:3100/store/${encodeURIComponent(store.slug)}?preview=${encodeURIComponent(res.data.previewToken)}`;
        window.open(previewUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      setActionError(
        err?.data?.message || err?.message || 'Не вдалося відкрити попередній перегляд вітрини'
      );
    }
  };

  // Handler: Update User Status (with timed/indefinite suspension & reason)
  const handleUpdateUserStatus = async (
    userId: string,
    dto: UpdatePlatformUserStatusDto
  ) => {
    setActionError(null);
    try {
      const res = await platformApi.rbac.updatePlatformUserStatus(userId, dto);
      const nextStatus = (res.data?.status || dto.status) as PlatformUserRecord['status'];
      const nextUntil = res.data?.suspendedUntil ?? null;
      const nextReason = res.data?.suspensionReason ?? null;

      setUsersList((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                status: nextStatus,
                suspendedUntil: nextUntil,
                suspensionReason: nextReason
              }
            : u
        )
      );
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser((prev) =>
          prev
            ? {
                ...prev,
                status: nextStatus,
                suspendedUntil: nextUntil,
                suspensionReason: nextReason
              }
            : null
        );
      }
    } catch (err: any) {
      setActionError(
        err?.data?.message ||
          err?.message ||
          (locale === 'en'
            ? 'Insufficient permissions to update user status'
            : 'Недостатньо прав для зміни статусу користувача')
      );
      throw err;
    }
  };

  // Handler: Update User Subscription (tier, status, expiration date)
  const handleUpdateUserSubscription = async (
    userId: string,
    dto: UpdatePlatformUserSubscriptionDto
  ) => {
    setActionError(null);
    try {
      const res = await platformApi.rbac.updatePlatformUserSubscription(userId, dto);
      if (res.success && res.data) {
        const patch = {
          subscriptionTier: res.data.subscriptionTier,
          subscriptionStatus: res.data.subscriptionStatus,
          subscriptionExpiresAt: res.data.subscriptionExpiresAt
        };
        setUsersList((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)));
        if (selectedUser && selectedUser.id === userId) {
          setSelectedUser((prev) => (prev ? { ...prev, ...patch } : null));
        }
      }
    } catch (err: any) {
      setActionError(
        err?.data?.message ||
          err?.message ||
          (locale === 'en'
            ? 'Insufficient permissions to update user subscription'
            : 'Недостатньо прав для керування підпискою користувача')
      );
      throw err;
    }
  };

  // Handler: Logout
  const handleLogout = async () => {
    try {
      await platformApi.auth.logout();
    } catch {
      // Ignore
    }
    platformApi.client.setAccessToken(null);
    localStorage.removeItem('bizx_platform_admin_token');
    localStorage.removeItem('bizx_access_token');
    localStorage.removeItem('bizx_admin_access_token');
    setCurrentUser(null);
    setMyAccess(null);
    setPermsLoaded(false);
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-500">{t('common.loading')}</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginView
        onSuccess={(user) => {
          setCurrentUser(user);
          void loadPlatformData();
        }}
      />
    );
  }

  const isStaff = Boolean(currentUser.isPlatformStaff);

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">{t('auth.accessForbidden')}</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {t('auth.staffOnlyError')} ({currentUser.email})
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              {t('common.logout')}
            </button>
            <a
              href="http://localhost:3102"
              className="w-full py-2 px-4 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors text-center"
            >
              {t('nav.businessAdmin')}
            </a>
          </div>
        </div>
      </div>
    );
  }

  const businessesCount = {
    total: businesses.length,
    active: businesses.filter((b) => b.status === 'active').length,
    pending: businesses.filter((b) => b.status === 'pending').length,
    suspended: businesses.filter((b) => b.status === 'suspended').length,
    archived: businesses.filter((b) => b.status === 'archived').length
  };

  return (
    <PlatformLayout
      currentTab={activeTab}
      onTabChange={(nextTab) => {
        setActiveTab(nextTab);
        if (nextTab === 'businesses_pending') setNewPendingAlert(null);
      }}
      currentUser={currentUser}
      myPermissions={myPermissions}
      myRoleName={myAccess?.roleName}
      permsLoaded={permsLoaded}
      pendingStoresCount={pendingStoresCount}
      pendingDisputesCount={pendingDisputesCount}
      unreadSupportCount={unreadSupportCount}
      onLogout={handleLogout}
    >
      {newPendingAlert !== null && newPendingAlert > 0 && (
        <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2.5 font-semibold">
            <Bell className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {newPendingAlert === 1
                ? 'Надійшла нова заявка на підтвердження бізнесу!'
                : `Надійшло ${newPendingAlert} нових заявок на підтвердження бізнесів!`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setNewPendingAlert(null);
                setActiveTab('businesses_pending');
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors"
            >
              <span>Перейти до перевірки</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setNewPendingAlert(null)}
              className="p-1 text-amber-600 hover:text-amber-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {permsLoaded && myPermissions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-2">
          <Lock className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">
            {locale === 'en' ? 'No platform permissions assigned' : 'Немає призначених прав платформи'}
          </h3>
          <p className="text-xs text-slate-500">
            {locale === 'en'
              ? 'Contact the BizX Platform Owner to assign a role or custom permissions.'
              : 'Зверніться до власника платформи BizX для надання ролі або прав доступу.'}
          </p>
        </div>
      ) : (
        <>
          {activeTab === 'metrics' && hasPerm('platform.analytics.read') && (
            <MetricsView
              analytics={analytics}
              totalUsersCount={usersList.length}
              businessesCount={businessesCount}
              isLoading={isDataLoading}
              onOpenDetailedAnalytics={() => setActiveTab('analytics')}
            />
          )}

          {activeTab === 'analytics' && hasPerm('platform.analytics.read') && (
            <PlatformAnalyticsView
              initialAnalytics={analytics}
              businesses={businesses}
              canExport={hasPerm('platform.analytics.export')}
            />
          )}

          {activeTab === 'businesses' && hasPerm('platform.stores.read') && (
            <BusinessesView
              businesses={businesses}
              categories={categories}
              onSelectBusiness={(b) => {
                setSelectedBusiness(b);
                setIsBusinessModalOpen(true);
              }}
              onPreviewStore={handlePreviewStore}
              onOpenPendingQueue={() => setActiveTab('businesses_pending')}
              onRefresh={loadPlatformData}
              isLoading={isDataLoading}
            />
          )}

          {activeTab === 'businesses_pending' && hasPerm('platform.stores.read') && (
            <PendingBusinessesView
              businesses={businesses}
              canApprove={hasPerm('platform.stores.approve')}
              isLoading={isDataLoading}
              onRefresh={loadPlatformData}
              onSelectBusiness={(b) => {
                setSelectedBusiness(b);
                setIsBusinessModalOpen(true);
              }}
            />
          )}

          {activeTab === 'users' && hasPerm('platform.users.read') && (
            <UsersView
              users={usersList}
              onSelectUser={(u) => {
                setSelectedUser(u);
                setIsUserModalOpen(true);
              }}
              isLoading={isDataLoading}
            />
          )}

          {activeTab === 'disputes' && hasPerm('platform.disputes.read') && (
            <DisputesView
              canResolve={hasPerm('platform.disputes.resolve')}
              canIssueStrikes={hasPerm('platform.strikes.issue')}
              canRevokeStrikes={hasPerm('platform.strikes.revoke')}
              onDisputesChanged={() => {
                refreshDisputesSummary();
                void loadPlatformData();
              }}
            />
          )}

          {activeTab === 'support' && hasPerm('platform.support.read') && (
            <SupportView
              canReply={hasPerm('platform.support.reply')}
              onSupportChanged={refreshSupportSummary}
            />
          )}

          {activeTab === 'broadcasts' && hasPerm('platform.broadcasts.read') && (
            <BroadcastsView
              canSend={hasPerm('platform.broadcasts.send')}
              businesses={businesses}
              usersList={usersList}
            />
          )}

          {activeTab === 'staff' && hasPerm('platform.staff.read') && (
            <StaffView currentUserId={currentUser.id} />
          )}

          {activeTab === 'roles' && hasPerm('platform.roles.read') && <PlatformRolesView />}
        </>
      )}

      {/* Business Details Modal */}
      <BusinessDetailsModal
        business={
          selectedBusiness
            ? businesses.find((b) => b.id === selectedBusiness.id) || selectedBusiness
            : null
        }
        isOpen={isBusinessModalOpen}
        onClose={() => {
          setIsBusinessModalOpen(false);
          setSelectedBusiness(null);
        }}
        onUpdateStatus={handleUpdateBusinessStatus}
        onApproveStore={handleApproveStore}
        onRejectStore={handleRejectStore}
        onPreviewStore={handlePreviewStore}
        isUpdating={isUpdatingBusinessStatus}
        canModerate={hasPerm('platform.stores.moderate')}
        canApprove={hasPerm('platform.stores.approve')}
        canUnblock={hasPerm('platform.stores.unblock')}
        canArchive={hasPerm('platform.stores.archive')}
        canIssueStrikes={hasPerm('platform.strikes.issue')}
        canRevokeStrikes={hasPerm('platform.strikes.revoke')}
        onRefresh={loadPlatformData}
      />

      {/* User Details Modal */}
      <UserDetailsModal
        user={
          selectedUser
            ? usersList.find((u) => u.id === selectedUser.id) || selectedUser
            : null
        }
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setSelectedUser(null);
        }}
        onUpdateStatus={handleUpdateUserStatus}
        onUpdateSubscription={handleUpdateUserSubscription}
        canEditStatus={hasPerm('platform.users.edit')}
        canUnblock={hasPerm('platform.users.unblock')}
        canArchive={hasPerm('platform.users.archive')}
        canManageSubscriptions={hasPerm('platform.users.subscriptions')}
      />
    </PlatformLayout>
  );
};
