import React, { useState, useEffect } from 'react';
import { platformApi } from './lib/api';
import type { UserProfile, PlatformAnalytics, StoreCategory } from '@bizx/common-types';
import { ShieldAlert } from 'lucide-react';
import { PlatformLayout, type PlatformTab } from './components/PlatformLayout';
import { MetricsView } from './views/MetricsView';
import { BusinessesView, type ExtendedBusiness } from './views/BusinessesView';
import { UsersView } from './views/UsersView';
import { StaffView, type PlatformStaffMember } from './views/StaffView';
import { LoginView } from './views/LoginView';
import { BusinessDetailsModal } from './components/BusinessDetailsModal';
import { UserDetailsModal, type PlatformUserRecord } from './components/UserDetailsModal';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState<PlatformTab>('metrics');

  // Platform Data State
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [businesses, setBusinesses] = useState<ExtendedBusiness[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Modals & Active Selections
  const [selectedBusiness, setSelectedBusiness] = useState<ExtendedBusiness | null>(null);
  const [isBusinessModalOpen, setIsBusinessModalOpen] = useState(false);
  const [isUpdatingBusinessStatus, setIsUpdatingBusinessStatus] = useState(false);

  const [selectedUser, setSelectedUser] = useState<PlatformUserRecord | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Users State
  const [usersList, setUsersList] = useState<PlatformUserRecord[]>([
    {
      id: 'u-1',
      name: 'Олександр Коваленко',
      email: 'admin@bizx.ua',
      phone: '+380 50 123 45 67',
      role: 'admin',
      systemRole: 'platform_admin',
      status: 'active',
      createdAt: '12.01.2026'
    },
    {
      id: 'u-2',
      name: 'Тарас Шевчук',
      email: 'owner.coffee@bizx.ua',
      phone: '+380 67 111 22 33',
      role: 'business_owner',
      systemRole: 'user',
      status: 'active',
      createdAt: '15.01.2026'
    },
    {
      id: 'u-3',
      name: 'Ірина Мельник',
      email: 'owner.tech@bizx.ua',
      phone: '+380 93 444 55 66',
      role: 'business_owner',
      systemRole: 'user',
      status: 'active',
      createdAt: '22.01.2026'
    },
    {
      id: 'u-4',
      name: 'Богдан Кравченко',
      email: 'owner.bakery@bizx.ua',
      phone: '+380 66 777 88 99',
      role: 'business_owner',
      systemRole: 'user',
      status: 'active',
      createdAt: '01.02.2026'
    },
    {
      id: 'u-5',
      name: 'Марія Бондаренко',
      email: 'client@bizx.ua',
      phone: '+380 99 123 98 76',
      role: 'client',
      systemRole: 'user',
      status: 'active',
      createdAt: '10.02.2026'
    },
    {
      id: 'u-6',
      name: 'Дмитро Кравчук',
      email: 'suspicious.actor@spam.ua',
      phone: '+380 50 999 88 77',
      role: 'client',
      systemRole: 'user',
      status: 'suspended',
      createdAt: '18.02.2026'
    }
  ]);

  // Staff State
  const [staffList, setStaffList] = useState<PlatformStaffMember[]>([
    {
      id: 'st-1',
      name: 'Олександр Коваленко',
      email: 'admin@bizx.ua',
      department: 'Керівництво',
      role: 'Head of Platform',
      accessLevel: 'full_admin',
      status: 'active'
    },
    {
      id: 'st-2',
      name: 'Юлія Шевченко',
      email: 'yulia.shevchenko@bizx.ua',
      department: 'Операційний відділ',
      role: 'Lead Ops Manager',
      accessLevel: 'ops_manager',
      status: 'active'
    },
    {
      id: 'st-3',
      name: 'Сергій Бондар',
      email: 'sergiy.bondar@bizx.ua',
      department: 'Відділ комплаєнсу',
      role: 'Compliance Officer',
      accessLevel: 'compliance',
      status: 'active'
    },
    {
      id: 'st-4',
      name: 'Анна Ткаченко',
      email: 'anna.tkachenko@bizx.ua',
      department: 'Служба підтримки',
      role: 'Support Lead',
      accessLevel: 'support_lead',
      status: 'active'
    }
  ]);

  // Load Real Data from Backend API
  const loadPlatformData = async () => {
    setIsDataLoading(true);
    try {
      // 1. Fetch Categories
      let fetchedCategories: Array<{ id: string; name: string }> = [];
      try {
        const catRes = await platformApi.stores.getCategories();
        if (catRes.success && catRes.data) {
          fetchedCategories = catRes.data.map((c: StoreCategory) => ({ id: c.id, name: c.name }));
          setCategories(fetchedCategories);
        }
      } catch {
        // Fallback categories
        fetchedCategories = [
          { id: 'cat-1', name: 'Кавʼярні та десерти' },
          { id: 'cat-2', name: 'Електроніка та гаджети' },
          { id: 'cat-3', name: 'Пекарні та випічка' }
        ];
        setCategories(fetchedCategories);
      }

      // 2. Fetch Real Stores
      try {
        const storesRes = await platformApi.stores.getStores({ page: 1, pageSize: 100 });
        if (storesRes.success && storesRes.data?.items && storesRes.data.items.length > 0) {
          const categoryMap = new Map(fetchedCategories.map((c) => [c.id, c.name]));

          const mappedStores: ExtendedBusiness[] = storesRes.data.items.map((st) => ({
            ...st,
            categoryName: (st.categoryId && categoryMap.get(st.categoryId)) || 'Торгівля',
            ownerName:
              st.slug === 'lviv-coffee'
                ? 'Тарас Шевчук'
                : st.slug === 'cybertech-ukraine'
                ? 'Ірина Мельник'
                : st.slug === 'khlibna-maisternia'
                ? 'Богдан Кравченко'
                : 'Партнер BizX',
            ownerEmail:
              st.slug === 'lviv-coffee'
                ? 'owner.coffee@bizx.ua'
                : st.slug === 'cybertech-ukraine'
                ? 'owner.tech@bizx.ua'
                : st.slug === 'khlibna-maisternia'
                ? 'owner.bakery@bizx.ua'
                : undefined
          }));
          setBusinesses(mappedStores);
        } else {
          // Fallback seed stores
          setBusinesses([
            {
              id: 'store-1',
              name: 'Львівська Кавова Мануфактура',
              slug: 'lviv-coffee',
              status: 'active',
              ownerId: 'u-2',
              ownerName: 'Тарас Шевчук',
              ownerEmail: 'owner.coffee@bizx.ua',
              categoryName: 'Кавʼярні та десерти',
              createdAt: new Date().toISOString()
            },
            {
              id: 'store-2',
              name: 'CyberTech Ukraine',
              slug: 'cybertech-ukraine',
              status: 'active',
              ownerId: 'u-3',
              ownerName: 'Ірина Мельник',
              ownerEmail: 'owner.tech@bizx.ua',
              categoryName: 'Електроніка та гаджети',
              createdAt: new Date().toISOString()
            },
            {
              id: 'store-3',
              name: 'Хлібна Майстерня',
              slug: 'khlibna-maisternia',
              status: 'active',
              ownerId: 'u-4',
              ownerName: 'Богдан Кравченко',
              ownerEmail: 'owner.bakery@bizx.ua',
              categoryName: 'Пекарні та випічка',
              createdAt: new Date().toISOString()
            }
          ]);
        }
      } catch {
        // Fallback stores
      }

      // 3. Fetch Platform Analytics
      try {
        const aRes = await platformApi.analytics.getPlatformAnalytics();
        if (aRes.success && aRes.data) {
          setAnalytics(aRes.data);
        } else {
          setAnalytics({
            totalPlatformRevenue: 24500000,
            totalOrders: 1420,
            totalStores: 3,
            activeStores: 3,
            totalProducts: 12,
            topStoresByRevenue: [
              {
                storeId: 'store-2',
                storeName: 'CyberTech Ukraine',
                revenue: 16500000,
                ordersCount: 420
              },
              {
                storeId: 'store-1',
                storeName: 'Львівська Кавова Мануфактура',
                revenue: 5600000,
                ordersCount: 780
              },
              {
                storeId: 'store-3',
                storeName: 'Хлібна Майстерня',
                revenue: 2400000,
                ordersCount: 220
              }
            ]
          });
        }
      } catch {
        // Fallback analytics
        setAnalytics({
          totalPlatformRevenue: 24500000,
          totalOrders: 1420,
          totalStores: 3,
          activeStores: 3,
          totalProducts: 12,
          topStoresByRevenue: [
            {
              storeId: 'store-2',
              storeName: 'CyberTech Ukraine',
              revenue: 16500000,
              ordersCount: 420
            },
            {
              storeId: 'store-1',
              storeName: 'Львівська Кавова Мануфактура',
              revenue: 5600000,
              ordersCount: 780
            },
            {
              storeId: 'store-3',
              storeName: 'Хлібна Майстерня',
              revenue: 2400000,
              ordersCount: 220
            }
          ]
        });
      }
    } finally {
      setIsDataLoading(false);
    }
  };

  // Check auth on mount
  useEffect(() => {
    const initAuth = async () => {
      setIsLoadingAuth(true);
      try {
        const res = await platformApi.auth.me();
        if (res.success && res.data) {
          setCurrentUser(res.data);
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    initAuth();
    loadPlatformData();
  }, []);

  // Handler: Update Business Status
  const handleUpdateBusinessStatus = async (
    id: string,
    newStatus: 'active' | 'pending' | 'suspended' | 'archived'
  ) => {
    setIsUpdatingBusinessStatus(true);
    try {
      if (newStatus === 'archived') {
        await platformApi.stores.archiveStore(id);
      } else {
        await platformApi.stores.updateStore(id, { status: newStatus });
      }

      // Update local state
      setBusinesses((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
      );

      if (selectedBusiness && selectedBusiness.id === id) {
        setSelectedBusiness((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch {
      // Still update UI optimistically
      setBusinesses((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
      );
      if (selectedBusiness && selectedBusiness.id === id) {
        setSelectedBusiness((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } finally {
      setIsUpdatingBusinessStatus(false);
    }
  };

  // Handler: Update User Status
  const handleUpdateUserStatus = (
    userId: string,
    newStatus: 'active' | 'suspended' | 'archived'
  ) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
    );
    if (selectedUser && selectedUser.id === userId) {
      setSelectedUser((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  // Handler: Toggle Platform Role
  const handleTogglePlatformRole = (
    userId: string,
    newSystemRole: 'user' | 'platform_admin'
  ) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, systemRole: newSystemRole } : u))
    );
    if (selectedUser && selectedUser.id === userId) {
      setSelectedUser((prev) => (prev ? { ...prev, systemRole: newSystemRole } : null));
    }
  };

  // Handler: Add Staff
  const handleAddStaff = (newStaff: Omit<PlatformStaffMember, 'id'>) => {
    const created: PlatformStaffMember = {
      ...newStaff,
      id: `st-${Date.now()}`
    };
    setStaffList((prev) => [...prev, created]);
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
    setCurrentUser(null);
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-500">Завантаження консолі BizX Core...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onSuccess={(user) => setCurrentUser(user)} />;
  }

  const isStaff = currentUser.systemRole === 'platform_admin' || currentUser.role === 'admin';

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Доступ заборонено</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Консоль BizX Core призначена виключно для співробітників компанії BizX.
              Ваш поточний обліковий запис <strong>{currentUser.email}</strong> ({currentUser.name}) не має привілеїв адміністратора платформи.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Увійти під службовим акаунтом BizX
            </button>
            <a
              href="http://localhost:3102"
              className="w-full py-2 px-4 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors text-center"
            >
              Перейти в кабінет мерчанта (:3102)
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Count businesses by status
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
      onTabChange={setActiveTab}
      currentUser={currentUser}
      onLogout={handleLogout}
    >
      {/* View: Metrics */}
      {activeTab === 'metrics' && (
        <MetricsView
          analytics={analytics}
          totalUsersCount={usersList.length}
          businessesCount={businessesCount}
          isLoading={isDataLoading}
        />
      )}

      {/* View: Businesses */}
      {activeTab === 'businesses' && (
        <BusinessesView
          businesses={businesses}
          categories={categories}
          onSelectBusiness={(b) => {
            setSelectedBusiness(b);
            setIsBusinessModalOpen(true);
          }}
          onRefresh={loadPlatformData}
          isLoading={isDataLoading}
        />
      )}

      {/* View: Users */}
      {activeTab === 'users' && (
        <UsersView
          users={usersList}
          onSelectUser={(u) => {
            setSelectedUser(u);
            setIsUserModalOpen(true);
          }}
          isLoading={isDataLoading}
        />
      )}

      {/* View: Staff */}
      {activeTab === 'staff' && (
        <StaffView staffList={staffList} onAddStaff={handleAddStaff} />
      )}

      {/* Business Details Slide-over / Modal */}
      <BusinessDetailsModal
        business={selectedBusiness}
        isOpen={isBusinessModalOpen}
        onClose={() => {
          setIsBusinessModalOpen(false);
          setSelectedBusiness(null);
        }}
        onUpdateStatus={handleUpdateBusinessStatus}
        isUpdating={isUpdatingBusinessStatus}
      />

      {/* User Details Modal */}
      <UserDetailsModal
        user={selectedUser}
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setSelectedUser(null);
        }}
        onUpdateStatus={handleUpdateUserStatus}
        onTogglePlatformRole={handleTogglePlatformRole}
      />
    </PlatformLayout>
  );
};
