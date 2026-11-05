'use client';

import { AuthCard } from '@bizx/ui';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { SiteHeader } from '../components/SiteHeader';
import type { UserProfile, Store, SubscriptionPlan, UserSubscriptionDetails, SubscriptionTier } from '@bizx/common-types';
import {
  User,
  Shield,
  Building2,
  Bell,
  Plug,
  Lock,
  CheckCircle2,
  ExternalLink,
  Save,
  Key,
  LogOut,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';

type AccountTab = 'profile' | 'businesses' | 'subscriptions' | 'security' | 'privacy' | 'integrations';

export default function AccountPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AccountTab>('profile');

  // Profile Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarError, setAvatarError] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  // Privacy toggles
  const [emailOrders, setEmailOrders] = useState(true);
  const [emailMarketing, setEmailMarketing] = useState(false);
  const [smsDelivery, setSmsDelivery] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);

  // Webhook State
  const [webhookUrl, setWebhookUrl] = useState('https://crm.mybusiness.ua/api/webhooks/bizx');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);

  // Stores
  const [myStores, setMyStores] = useState<Store[]>([]);

  // Subscription State
  const [subDetails, setSubDetails] = useState<UserSubscriptionDetails | null>(null);
  const [allPlans, setAllPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<SubscriptionPlan | null>(null);
  const [isActivatingSub, setIsActivatingSub] = useState(false);
  const [subNotice, setSubNotice] = useState<string | null>(null);

  // Create Business State
  const [showCreateStoreModal, setShowCreateStoreModal] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreSlug, setNewStoreSlug] = useState('');
  const [newStoreDesc, setNewStoreDesc] = useState('');
  const [newStorePhone, setNewStorePhone] = useState('');
  const [newStoreEmail, setNewStoreEmail] = useState('');
  const [isCreatingStore, setIsCreatingStore] = useState(false);
  const [createStoreError, setCreateStoreError] = useState<string | null>(null);
  const [moderationNotice, setModerationNotice] = useState<string | null>(null);

  // In-page Auth State for Guests
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await api.auth.me();
      if (res.success && res.data) {
        setUser(res.data);
        setName(res.data.name || '');
        setEmail(res.data.email || '');
        setPhone(res.data.phone || '');
        setAvatarUrl(res.data.avatarUrl || '');

        try {
          const subRes = await api.subscriptions.getMySubscription();
          if (subRes.success && subRes.data) {
            setSubDetails(subRes.data);
          }
        } catch {
          // ignore
        }

        try {
          const plansRes = await api.subscriptions.getPlans();
          if (plansRes.success && plansRes.data) {
            setAllPlans(plansRes.data);
          }
        } catch {
          // ignore
        }

        try {
          const storesRes = await api.stores.getMyStores();
          if (storesRes.success && storesRes.data) {
            setMyStores(storesRes.data);
          }
        } catch {
          setMyStores([]);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUnauthorized = () => {
      setUser(null);
      setMyStores([]);
    };

    window.addEventListener('bizx:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('bizx:unauthorized', handleUnauthorized);
    };
  }, []);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const res = await api.auth.uploadAvatar(file);
      if (res.success && res.data) {
        setUser(res.data);
        setAvatarUrl(res.data.avatarUrl || '');
        setAvatarError(false);
      }
    } catch {
      // Ignore
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setProfileError(null);
    setIsSaved(false);

    try {
      const res = await api.auth.updateProfile({
        name: name.trim(),
        phone: phone.trim()
      });
      if (res.success && res.data) {
        setUser(res.data);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      } else {
        setProfileError('Не вдалося зберегти зміни');
      }
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      setProfileError(errObj.data?.message || errObj.message || 'Помилка оновлення профілю');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordNotice('Новий пароль та підтвердження не співпадають');
      return;
    }
    setPasswordNotice('Пароль успішно оновлено');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordNotice(null), 3000);
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bizx_access_token');
      localStorage.removeItem('bizx_admin_access_token');
    }
    setUser(null);
    setMyStores([]);
    window.location.reload();
  };

    const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim() || !newStoreSlug.trim()) return;
    setIsCreatingStore(true);
    setCreateStoreError(null);

    try {
      const res = await api.stores.createStore({
        name: newStoreName.trim(),
        slug: newStoreSlug.trim().toLowerCase(),
        description: newStoreDesc.trim() || undefined,
        phone: newStorePhone.trim() || undefined,
        email: newStoreEmail.trim() || undefined
      });

      if (res.success && res.data) {
        setShowCreateStoreModal(false);
        setNewStoreName('');
        setNewStoreSlug('');
        setNewStoreDesc('');
        setNewStorePhone('');
        setNewStoreEmail('');
        await loadData();
        return;
      }
      setCreateStoreError('Не вдалося зареєструвати бізнес. Перевірте унікальність slug.');
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      setCreateStoreError(errObj.data?.message || errObj.message || 'Помилка створення бізнесу');
    } finally {
      setIsCreatingStore(false);
    }
  };

  const handleToggleStoreStatus = async (storeId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'suspended' ? 'pending' : 'suspended';
      const res = await api.stores.updateStore(storeId, { status: nextStatus });
      if (res.success) {
        setModerationNotice(
          nextStatus === 'suspended'
            ? 'Заклад успішно призупинено'
            : 'Заклад відправлено на перевірку'
        );
        await loadData();
        setTimeout(() => setModerationNotice(null), 4000);
      }
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      alert(errObj.data?.message || errObj.message || 'Помилка зміни статусу закладу');
    }
  };

  const handleConfirmSubscriptionChange = async () => {
    if (!selectedPlanForUpgrade) return;
    setIsActivatingSub(true);
    try {
      const res = await api.subscriptions.subscribe({
        tier: selectedPlanForUpgrade.id as SubscriptionTier,
        periodDays: 30
      });
      if (res.success) {
        setSubNotice(`Тариф «${selectedPlanForUpgrade.name}» успішно активовано на 30 днів!`);
        setSelectedPlanForUpgrade(null);
        await loadData();
        setTimeout(() => setSubNotice(null), 5000);
      }
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      alert(errObj.data?.message || errObj.message || 'Помилка активації підписки');
    } finally {
      setIsActivatingSub(false);
    }
  };

  const handleSubmitForModeration = async (storeId: string) => {
    try {
      const res = await api.stores.updateStore(storeId, { status: 'pending' });
      if (res.success) {
        setModerationNotice('Заклад успішно відправлено на перевірку модераторам BizX');
        await loadData();
        setTimeout(() => setModerationNotice(null), 4000);
      }
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      alert(errObj.data?.message || errObj.message || 'Помилка надсилання на модерацію');
    }
  };

  const getInitials = (val?: string) => {
    if (!val) return 'U';
    const parts = val.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return val.slice(0, 2).toUpperCase();
  };

  const isBusinessUser = user?.role === 'business_owner' || myStores.length > 0;

  const isPlatformStaff = user?.role === 'admin' || user?.systemRole === 'platform_admin';

  const menuItems = [
    { id: 'profile' as const, label: 'Особисті дані', desc: 'Імʼя, контакти та аватар', icon: User },
    { id: 'businesses' as const, label: 'Мої бізнеси та ролі', desc: 'Заклади та права доступу', icon: Building2 },
    { id: 'subscriptions' as const, label: 'Підписка та тарифи', desc: 'Статус, дні дії та плани', icon: CreditCard },
    { id: 'security' as const, label: 'Безпека та пароль', desc: 'Пароль, 2FA та сесії', icon: Shield },
    { id: 'privacy' as const, label: 'Сповіщення та приватність', desc: 'Email, SMS та маркетинг', icon: Bell },
    { id: 'integrations' as const, label: 'Інтеграції та API', desc: 'CRM вебхуки та ключі', icon: Plug }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <SiteHeader />

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            <div className="text-xs font-semibold text-slate-500">Завантаження облікового запису...</div>
          </div>
        ) : !user ? (
          /* Unauthenticated State: Unified Metro AuthCard */
          <div className="flex justify-center items-center py-10">
            <AuthCard
              badgeText="BIZX ID"
              title="Особистий кабінет BizX"
              subtitle="Увійдіть або зареєструйтесь для доступу до персонального кабінету"
              allowRegister={true}
              onSubmit={async (data) => {
                setAuthError(null);
                setAuthLoading(true);
                try {
                  if (data.mode === 'login') {
                    const res = await api.auth.login({
                      email: data.email,
                      password: data.password
                    });
                    if (res.success && res.data) {
                      await loadData();
                      return;
                    }
                    setAuthError('Невірний логін або пароль');
                  } else {
                    const res = await api.auth.register({
                      name: data.name || '',
                      email: data.email,
                      password: data.password,
                      role: 'client'
                    });
                    if (res.success && res.data) {
                      await loadData();
                      return;
                    }
                    setAuthError('Не вдалося зареєструватися');
                  }
                } catch (err: unknown) {
                  const errObj = err as { data?: { message?: string }; message?: string };
                  setAuthError(errObj.data?.message || errObj.message || 'Помилка авторизації');
                } finally {
                  setAuthLoading(false);
                }
              }}
              isLoading={authLoading}
              error={authError}
              footerNotice="Єдиний обліковий запис для всієї екосистеми BizX"
            />
          </div>
        ) : (
          /* Authenticated Dashboard View */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left Sidebar Menu */}
            <aside className="md:col-span-4 bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-1">
              <div className="p-3 border-b border-slate-100 flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shrink-0 overflow-hidden">
                  {avatarUrl && !avatarError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={api.storage.resolveMediaUrl(avatarUrl) || ''}
                      alt={user.name || ''}
                      className="w-full h-full object-cover"
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    getInitials(user.name)
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-slate-900 truncate">
                    {user.name || 'Користувач'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono truncate">{user.email}</p>
                  <div className="mt-1">
                    {isPlatformStaff ? (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                        BizX Staff
                      </span>
                    ) : isBusinessUser ? (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Бізнес-партнер
                      </span>
                    ) : (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        Клієнт
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold leading-tight">{item.label}</div>
                        <div
                          className={`text-[10px] leading-tight truncate ${
                            isActive ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          {item.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </nav>

              {/* Portal Quick Links */}
              <div className="pt-2 border-t border-slate-100 mt-2 space-y-1">
                {isBusinessUser && (
                  <a
                    href="http://localhost:3102"
                    className="w-full flex items-center justify-between p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-xs font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <StorefrontOutlinedIcon className="w-4 h-4 text-slate-500" />
                      <span>Панель бізнесу</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                )}

                {isPlatformStaff && (
                  <a
                    href="http://localhost:3103"
                    className="w-full flex items-center justify-between p-2 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors text-xs font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldOutlinedIcon className="w-4 h-4 text-blue-600" />
                      <span>BizX Panel</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-xs font-medium"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Вийти з акаунту</span>
                </button>
              </div>
            </aside>

            {/* Right Main Content Panel */}
            <section className="md:col-span-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              {/* Tab: Profile */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-black text-slate-900">Особиста інформація</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Керуйте основними даними вашого профілю у всій екосистемі BizX
                    </p>
                  </div>

                  {isSaved && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Дані профілю успішно оновлено</span>
                    </div>
                  )}

                  {profileError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{profileError}</span>
                    </div>
                  )}

                  <form onSubmit={handleProfileSubmit} className="space-y-4">
                    {/* Avatar Upload Card */}
                    <div className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                      <div className="w-16 h-16 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-lg shrink-0 overflow-hidden border border-slate-200 shadow-sm">
                        {avatarUrl && !avatarError ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={api.storage.resolveMediaUrl(avatarUrl) || ''}
                            alt={name || ''}
                            className="w-full h-full object-cover"
                            onError={() => setAvatarError(true)}
                          />
                        ) : (
                          getInitials(name)
                        )}
                      </div>
                      <div>
                        <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors shadow-sm">
                          <span>{avatarUploading ? 'Завантаження...' : 'Змінити фотографію'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={avatarUploading}
                            onChange={handleAvatarFile}
                            className="hidden"
                          />
                        </label>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Підтримуються формати JPG, PNG, WebP та SVG
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Повне імʼя</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Електронна пошта (логін BizX)
                      </label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                      />
                      <span className="text-[10px] text-slate-400">
                        Електронна пошта привʼязана до вашого BizX ID і не підлягає зміні
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Номер телефону</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+380 50 123 45 67"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        <span>{isSaving ? 'Збереження...' : 'Зберегти зміни'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tab: Businesses */}
              {activeTab === 'businesses' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-lg font-black text-slate-900">Мої заклади та ролі</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Керуйте торговими точками, модерацією та переходом у панель бізнесу
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateStoreModal(true);
                        setCreateStoreError(null);
                      }}
                      className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                    >
                      <StorefrontOutlinedIcon className="w-4 h-4" />
                      <span>Створити бізнес</span>
                    </button>
                  </div>

                  {moderationNotice && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{moderationNotice}</span>
                    </div>
                  )}

                  {myStores.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-3">
                      <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
                      <div className="text-xs font-bold text-slate-800">
                        У вас поки немає зареєстрованих закладів
                      </div>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        Ви зареєстровані як клієнт. Щоб почати продажі та відкрити кабінет партнера, зареєструйте новий заклад.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateStoreModal(true);
                          setCreateStoreError(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
                      >
                        <StorefrontOutlinedIcon className="w-4 h-4" />
                        <span>Створити новий заклад</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {myStores.map((st) => {
                        const isDraft = st.status === 'draft';
                        const isPending = st.status === 'pending';
                        const isActive = st.status === 'active';

                        return (
                          <div
                            key={st.id}
                            className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Торгова точка
                              </span>
                              {isDraft && (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded uppercase">
                                  В розробці
                                </span>
                              )}
                              {isPending && (
                                <span className="text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded uppercase">
                                  На перевірці
                                </span>
                              )}
                              {isActive && (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded uppercase">
                                  Активний
                                </span>
                              )}
                              {!isDraft && !isPending && !isActive && (
                                <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded uppercase">
                                  {st.status}
                                </span>
                              )}
                            </div>

                            <div>
                              <div className="text-sm font-bold text-slate-900">{st.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">/{st.slug}</div>
                              {st.description && (
                                <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                  {st.description}
                                </p>
                              )}
                            </div>

                            {isDraft && (
                              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                                <div className="text-[11px] text-amber-900 leading-tight">
                                  Заклад у статусі чернетки. Надішліть його на перевірку адміністраторам BizX, коли будете готові.
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleSubmitForModeration(st.id)}
                                  className="w-full py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition-colors"
                                >
                                  Відправити на модерацію в BizX
                                </button>
                              </div>
                            )}

                            {isPending && (
                              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 leading-tight">
                                Заявку надіслано на розгляд модераторам BizX. Заклад очікує підтвердження.
                              </div>
                            )}

                            <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold text-slate-700">
                                Власник
                              </span>
                              <div className="flex items-center gap-2">
                                {st.status === 'active' && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStoreStatus(st.id, st.status)}
                                    className="text-[11px] font-bold text-slate-600 hover:text-red-600 transition-colors"
                                  >
                                    Призупинити
                                  </button>
                                )}
                                {st.status === 'suspended' && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStoreStatus(st.id, st.status)}
                                    className="text-[11px] font-bold text-emerald-700 hover:underline transition-colors"
                                  >
                                    Увімкнути
                                  </button>
                                )}
                                <a
                                  href="http://localhost:3102"
                                  className="text-xs font-bold text-slate-900 hover:underline inline-flex items-center gap-1"
                                >
                                  <span>Панель</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

                            {/* Tab: Subscriptions */}
              {activeTab === 'subscriptions' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-black text-slate-900">Підписка та тарифні плани</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Керуйте вашим тарифом BizX, контролюйте залишок днів та ліміти закладів
                      </p>
                    </div>
                    <Link
                      href="/pricing"
                      className="text-xs font-bold text-slate-900 hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
                    >
                      <span>Повна таблиця тарифів</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </Link>
                  </div>

                  {subNotice && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{subNotice}</span>
                    </div>
                  )}

                  {/* Current Active Plan Card */}
                  <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Поточний статус облікового запису
                        </div>
                        <div className="text-2xl font-black mt-0.5">
                          {user?.subscriptionTier === 'free' && 'Базовий клієнт (Free)'}
                          {user?.subscriptionTier === 'client_premium' && 'BizX Premium'}
                          {user?.subscriptionTier === 'business_starter' && 'BizX Business Starter'}
                          {user?.subscriptionTier === 'business_pro' && 'BizX Business Pro'}
                          {user?.subscriptionTier === 'business_enterprise' && 'BizX Business Enterprise'}
                          {!user?.subscriptionTier && 'Базовий'}
                        </div>
                      </div>

                      <div className="self-start sm:self-auto px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20">
                        {user?.subscriptionStatus === 'active' && '🟢 Активна підписка'}
                        {user?.subscriptionStatus === 'expired' && '🔴 Термін дії минув'}
                        {user?.subscriptionStatus === 'cancelled' && '🟡 Скасована'}
                        {(!user?.subscriptionStatus || user?.subscriptionStatus === 'none') && '⚪️ Безкоштовний план'}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs">
                      <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Днів активності</div>
                        <div className="text-base font-black mt-0.5 text-white">
                          {user?.subscriptionDaysLeft ?? 0} днів
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Діє до</div>
                        <div className="text-xs font-bold mt-1 text-slate-200">
                          {user?.subscriptionExpiresAt
                            ? new Date(user.subscriptionExpiresAt).toLocaleDateString('uk-UA')
                            : 'Не обмежено'}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Ліміт закладів</div>
                        <div className="text-base font-black mt-0.5 text-white">
                          {subDetails?.activeStoresCount ?? 0} з {user?.maxAllowedStores ?? 0} бізнесів
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Warning: Exceeded Store Limit */}
                  {subDetails?.hasExceededStoreLimit && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
                      <div className="flex items-center gap-2 font-bold text-amber-950">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Увага: перевищено ліміт активних закладів для вашого тарифу</span>
                      </div>
                      <p className="leading-relaxed">
                        Ви маєте <strong>{subDetails.activeStoresCount}</strong> активних закладів, тоді як поточний тариф дозволяє максимум <strong>{subDetails.maxAllowedStores}</strong>. Будь ласка, перейдіть у вкладку <strong>«Мої бізнеси та ролі»</strong> та призупиніть зайві заклади, або підвищіть тарифний план нижче.
                      </p>
                    </div>
                  )}

                  {/* Upgrade / Change Plan Cards */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-sm font-bold text-slate-900">Змінити тарифний план</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {allPlans
                        .filter((p) => p.target === 'business')
                        .map((plan) => {
                          const isCurrent = user?.subscriptionTier === plan.id;
                          return (
                            <div
                              key={plan.id}
                              className={`p-4 border rounded-xl flex flex-col justify-between space-y-3 ${
                                isCurrent
                                  ? 'border-slate-900 bg-slate-50/70 ring-1 ring-slate-900'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-900">{plan.name}</span>
                                  {plan.badge && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white uppercase">
                                      {plan.badge}
                                    </span>
                                  )}
                                </div>
                                <div className="text-lg font-black text-slate-900 mt-2">
                                  {plan.priceUah} ₴ <span className="text-[10px] text-slate-400 font-normal">/ міс</span>
                                </div>
                                <div className="text-[11px] font-semibold text-slate-600 mt-1">
                                  Ліміт: {plan.maxStores} {plan.maxStores === 1 ? 'заклад' : 'заклади'}
                                </div>
                              </div>

                              <div>
                                {isCurrent ? (
                                  <div className="w-full py-1.5 text-center text-xs font-bold text-slate-500 bg-slate-200/60 rounded-lg">
                                    Поточний план
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPlanForUpgrade(plan)}
                                    className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                                  >
                                    Перейти на цей план
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-black text-slate-900">Безпека облікового запису</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Зміна пароля доступу та контроль сесій входу
                    </p>
                  </div>

                  {passwordNotice && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{passwordNotice}</span>
                    </div>
                  )}

                  <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Поточний пароль</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Новий пароль</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        Підтвердження нового пароля
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                        required
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Оновити пароль</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tab: Privacy */}
              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-black text-slate-900">
                      Сповіщення та конфіденційність
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Налаштуйте канали комунікації та інформування про замовлення
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailOrders}
                        onChange={(e) => setEmailOrders(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          Email сповіщення про зміну статусів замовлень
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Листи при надходженні замовлення, підтвердженні та завершенні доставки
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={smsDelivery}
                        onChange={(e) => setSmsDelivery(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          SMS / Viber інформування
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Термінові повідомлення про оплати та прибуття курʼєра
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={publicProfile}
                        onChange={(e) => setPublicProfile(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          Видимість контактів у каталозі
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Дозволити клієнтам бачити робочий номер телефону на сторінці магазину
                        </div>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailMarketing}
                        onChange={(e) => setEmailMarketing(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          Новини та дайджести платформи BizX
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Оновлення функціоналу, акції та корисні матеріали для розвитку бізнесу
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Tab: Integrations */}
              {activeTab === 'integrations' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-black text-slate-900">Інтеграції та API</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Підключення зовнішніх CRM-систем, облікових програм та REST API токенів
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Plug className="w-4 h-4 text-slate-700" />
                          <h4 className="text-xs font-bold text-slate-900">
                            Webhook URL подій магазину
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                          Активно
                        </span>
                      </div>
                      <input
                        type="url"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:border-slate-900"
                      />
                      <p className="text-[11px] text-slate-400">
                        BizX відправлятиме HTTP POST запити при зміні статусу кожного замовлення.
                      </p>
                    </div>

                    <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Key className="w-4 h-4 text-slate-700" />
                          <h4 className="text-xs font-bold text-slate-900">
                            Персональний API Token
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setApiKeyVisible(!apiKeyVisible)}
                          className="text-[11px] font-bold text-slate-600 hover:text-slate-900"
                        >
                          {apiKeyVisible ? 'Приховати' : 'Показати'}
                        </button>
                      </div>
                      <div className="font-mono text-xs bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-slate-700 select-all">
                        {apiKeyVisible
                          ? 'bizx_live_sec_89f3a92c4b01e74a88301d'
                          : '••••••••••••••••••••••••••••••••••••••••'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}

      {/* Modal: Create Business */}
      {showCreateStoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-extrabold text-[11px] uppercase tracking-wider">
                  BIZX BUSINESS
                </span>
                <span className="text-xs font-bold text-slate-700">Створення нового закладу</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateStoreModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStore} className="p-6 space-y-4">
              {createStoreError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {createStoreError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Назва закладу / бізнесу *</label>
                <input
                  type="text"
                  required
                  value={newStoreName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewStoreName(val);
                    if (!newStoreSlug || newStoreSlug === newStoreName.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
                      setNewStoreSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
                    }
                  }}
                  placeholder="Кав'ярня 'Аромат'"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">URL-ідентифікатор (Slug) *</label>
                <input
                  type="text"
                  required
                  pattern="[a-z0-9-]+"
                  value={newStoreSlug}
                  onChange={(e) => setNewStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="aromat-cafe"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 font-mono"
                />
                <p className="text-[10px] text-slate-400">Тільки малі латинські літери, цифри та дефіси</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Короткий опис</label>
                <textarea
                  rows={2}
                  value={newStoreDesc}
                  onChange={(e) => setNewStoreDesc(e.target.value)}
                  placeholder="Свіжообсмажена кава, випічка та десерти"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Контактний телефон</label>
                  <input
                    type="tel"
                    value={newStorePhone}
                    onChange={(e) => setNewStorePhone(e.target.value)}
                    placeholder="+380 50 123 4567"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Контактний Email</label>
                  <input
                    type="email"
                    value={newStoreEmail}
                    onChange={(e) => setNewStoreEmail(e.target.value)}
                    placeholder="contact@business.ua"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600">
                Створений бізнес спочатку буде збережено в статусі чернетки <strong>«В розробці»</strong>. Ви зможете налаштувати каталог та відправити заклад на модерацію BizX у будь-який зручний момент.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateStoreModal(false)}
                  className="px-3 py-2 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={isCreatingStore}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isCreatingStore ? 'Створення...' : 'Зареєструвати заклад'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upgrade Subscription */}
      {selectedPlanForUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-black text-[10px] tracking-wider uppercase">
                  BIZX PAY
                </span>
                <span className="text-xs font-bold text-slate-700">Зміна тарифного плану</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanForUpgrade(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">Новий тариф:</span>
                  <span className="font-black text-slate-900">{selectedPlanForUpgrade.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">Вартість:</span>
                  <span className="font-black text-slate-900">{selectedPlanForUpgrade.priceUah} ₴ / міс</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">Термін:</span>
                  <span className="font-semibold text-slate-700">30 днів (тестова активація)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">Ліміт закладів:</span>
                  <span className="font-semibold text-slate-700">До {selectedPlanForUpgrade.maxStores} закладів</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                ℹ️ <strong>Тестова оплата:</strong> Справжні кошти не знімаються. Підписку буде миттєво активовано на 30 днів.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlanForUpgrade(null)}
                  className="px-3 py-2 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Скасувати
                </button>
                <button
                  type="button"
                  disabled={isActivatingSub}
                  onClick={handleConfirmSubscriptionChange}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isActivatingSub ? 'Активація...' : 'Підтвердити зміну тарифу'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </main>

      {/* Metro Minimal Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <div>© {new Date().getFullYear()} BizX Commerce Platform. Всі права захищено.</div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-700">
              Головна
            </Link>
            <a href="http://localhost:3102" className="hover:text-slate-700">
              Адміністративна панель
            </a>
            <span className="text-slate-300">•</span>
            <span>Безпека та конфіденційність</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
