'use client';

import {
  AuthCard,
  LanguageSelector,
  PhoneInput,
  Modal,
  ConfirmModal,
  CountBadge,
  AlertBanner,
  Button
} from '@bizx/ui';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { SiteHeader } from '../components/SiteHeader';
import { AccountInbox } from './components/AccountInbox';
import { AccountOrders } from './components/AccountOrders';
import { AccountBusinesses } from './components/AccountBusinesses';
import { AccountSubscriptions } from './components/AccountSubscriptions';
import { useTranslation } from '../hooks/useTranslation';
import {
  translateApiError,
  getInitials,
  validateUploadFile,
  UPLOAD_POLICIES,
  type SupportedLocale
} from '@bizx/utils';
import type {
  UserProfile,
  Store,
  SubscriptionPlan,
  UserSubscriptionDetails,
  SubscriptionTier
} from '@bizx/common-types';
import {
  User,
  Shield,
  Building2,
  Lock,
  CheckCircle2,
  ExternalLink,
  Save,
  LogOut,
  AlertCircle,
  CreditCard,
  Store as StoreIcon,
  Mail,
  ShoppingBag
} from 'lucide-react';

type AccountTab = 'profile' | 'orders' | 'inbox' | 'businesses' | 'subscriptions' | 'security';

export default function AccountPage() {
  const { t, locale, setLocale } = useTranslation();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AccountTab>('profile');
  const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
  const [languageNotice, setLanguageNotice] = useState<string | null>(null);

  const handleLanguageChange = async (newLocale: SupportedLocale) => {
    setLocale(newLocale);
    try {
      await api.auth.updateProfile({ preferredLanguage: newLocale });
      setLanguageNotice(t('account.languageUpdated'));
      setTimeout(() => setLanguageNotice(null), 3000);
    } catch {
      // ignore
    }
  };

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
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
  const [storeToSuspend, setStoreToSuspend] = useState<Store | null>(null);
  const [isSuspendingStore, setIsSuspendingStore] = useState(false);

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

        if (res.data.preferredLanguage && (res.data.preferredLanguage === 'uk' || res.data.preferredLanguage === 'en')) {
          setLocale(res.data.preferredLanguage);
        }

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
    if (typeof window !== 'undefined') {
      const tabParam = new URLSearchParams(window.location.search).get('tab');
      if (
        tabParam &&
        ['profile', 'orders', 'inbox', 'businesses', 'subscriptions', 'security'].includes(
          tabParam
        )
      ) {
        setActiveTab(tabParam as AccountTab);
      }
    }

    loadData();

    const handleUnauthorized = () => {
      setUser(null);
      setMyStores([]);
      setSubDetails(null);
      setInboxUnreadCount(0);
    };

    window.addEventListener('bizx:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('bizx:unauthorized', handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setInboxUnreadCount(0);
      return;
    }
    const fetchInboxCount = () => {
      api.inbox
        .getUnreadSummary()
        .then((res) => {
          if (res.success && res.data) {
            setInboxUnreadCount(res.data.totalUnreadMessages || 0);
          }
        })
        .catch(() => {});
    };
    fetchInboxCount();
    const timer = window.setInterval(fetchInboxCount, 15000);
    return () => window.clearInterval(timer);
  }, [user]);

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const check = validateUploadFile(file, UPLOAD_POLICIES.rasterImage);
    if (!check.ok) {
      setProfileError(
        check.code === 'TOO_LARGE'
          ? locale === 'en'
            ? 'Image must be 10 MB or smaller'
            : 'Розмір зображення не повинен перевищувати 10 МБ'
          : locale === 'en'
            ? 'Only JPG, PNG, WebP, or GIF images are allowed'
            : 'Дозволені лише зображення JPG, PNG, WebP або GIF'
      );
      return;
    }
    setProfileError(null);
    setAvatarUploading(true);
    try {
      const res = await api.auth.uploadAvatar(file);
      if (res.success && res.data) {
        setUser(res.data);
        setAvatarUrl(res.data.avatarUrl || '');
        setAvatarError(false);
      }
    } catch {
      setProfileError(
        locale === 'en' ? 'Failed to upload photo' : 'Не вдалося завантажити фотографію'
      );
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
        phone: phone.trim() || null
      });
      if (res.success && res.data) {
        setUser(res.data);
        setPhone(res.data.phone || '');
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      } else {
        setProfileError(t('errors.saveFailed'));
      }
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      setProfileError(translateApiError(errObj.data?.message || errObj.message, 'errors.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError(
        locale === 'en'
          ? 'New password must be at least 8 characters'
          : 'Новий пароль має містити щонайменше 8 символів'
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(
        locale === 'en'
          ? 'New password and confirmation do not match'
          : 'Новий пароль та підтвердження не співпадають'
      );
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await api.auth.changePassword({ currentPassword, newPassword });
      if (res.success) {
        setPasswordNotice(
          locale === 'en'
            ? 'Password updated successfully! Other active sessions have been signed out.'
            : 'Пароль успішно оновлено! Інші активні сесії завершено.'
        );
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      setPasswordError(
        errObj?.data?.message ||
          errObj?.message ||
          (locale === 'en' ? 'Failed to update password' : 'Не вдалося змінити пароль')
      );
    } finally {
      setIsChangingPassword(false);
    }
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
      localStorage.removeItem('bizx_platform_admin_token');
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
      setCreateStoreError(
        locale === 'en'
          ? 'Failed to create store. Please choose a different page URL.'
          : 'Не вдалося створити заклад. Перевірте унікальність адреси сторінки.'
      );
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
            ? locale === 'en'
              ? 'Store suspended. Reactivation will require BizX moderation review.'
              : 'Заклад успішно призупинено. Повторне ввімкнення можливе лише після перевірки в BizX.'
            : locale === 'en'
              ? 'Store submitted for BizX moderation review.'
              : 'Заклад відправлено на перевірку модераторам BizX.'
        );
        await loadData();
        setTimeout(() => setModerationNotice(null), 5000);
      }
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      alert(translateApiError(errObj.data?.message || errObj.message, 'errors.saveFailed'));
    }
  };

  const handleConfirmSuspendStore = async () => {
    if (!storeToSuspend) return;
    setIsSuspendingStore(true);
    try {
      await handleToggleStoreStatus(storeToSuspend.id, storeToSuspend.status);
      setStoreToSuspend(null);
    } finally {
      setIsSuspendingStore(false);
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

  const isBusinessUser = Boolean(user?.hasStoreAccess || user?.isBusinessOwner || myStores.length > 0);

  const isPlatformStaff = Boolean(user?.isPlatformStaff);

  const menuItems = [
    { id: 'profile' as const, label: t('account.profileTab'), desc: t('account.profileTabDesc'), icon: User },
    {
      id: 'orders' as const,
      label: locale === 'en' ? 'My Orders' : 'Мої замовлення',
      desc: locale === 'en' ? 'Purchases across all stores' : 'Покупки в усіх закладах',
      icon: ShoppingBag
    },
    {
      id: 'inbox' as const,
      label: locale === 'en' ? 'Inbox' : 'Пошта',
      desc: locale === 'en' ? 'BizX notices, support & ads' : 'Листи BizX, підтримка та реклама',
      icon: Mail
    },
    { id: 'businesses' as const, label: t('account.businessesTab'), desc: t('account.businessesTabDesc'), icon: Building2 },
    { id: 'subscriptions' as const, label: t('account.subscriptionsTab'), desc: t('account.subscriptionsTabDesc'), icon: CreditCard },
    { id: 'security' as const, label: t('account.securityTab'), desc: t('account.securityTabDesc'), icon: Shield }
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
            <div className="text-xs font-semibold text-slate-500">{t('common.loading')}</div>
          </div>
        ) : !user ? (
          /* Unauthenticated State: Unified Metro AuthCard */
          <div className="flex justify-center items-center py-10">
            <AuthCard
              badgeText="BIZX ID"
              locale={locale}
              title={t('account.title')}
              subtitle={t('account.authRequiredDesc')}
              allowRegister={true}
              onSubmit={async (data) => {
                setAuthError(null);
                setAuthLoading(true);
                try {
                  if (data.mode === 'login') {
                    const res = await api.auth.login(
                      data.loginMethod === 'phone'
                        ? { phone: data.phone, password: data.password }
                        : { email: data.email, password: data.password }
                    );
                    if (res.success && res.data) {
                      await loadData();
                      return;
                    }
                    setAuthError(t('errors.invalidCredentials'));
                  } else {
                    const res = await api.auth.register({
                      name: data.name || '',
                      email: data.email,
                      phone: data.phone || undefined,
                      password: data.password
                    });
                    if (res.success && res.data) {
                      await loadData();
                      return;
                    }
                    setAuthError(t('auth.registerError'));
                  }
                } catch (err: unknown) {
                  const errObj = err as { data?: { message?: string }; message?: string };
                  setAuthError(translateApiError(errObj.data?.message || errObj.message, 'auth.loginError'));
                } finally {
                  setAuthLoading(false);
                }
              }}
              isLoading={authLoading}
              error={authError}
              footerNotice={
                locale === 'en'
                  ? 'Single account across the entire BizX ecosystem'
                  : 'Єдиний обліковий запис для всієї екосистеми BizX'
              }
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
                    {user.name || t('common.user')}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono truncate">{user.email}</p>
                  <div className="mt-1">
                    {isPlatformStaff ? (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                        {t('roles.platformAdmin')}
                      </span>
                    ) : isBusinessUser ? (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {t('roles.businessPartner')}
                      </span>
                    ) : (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {t('roles.client')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  const showBusinessAlert =
                    item.id === 'businesses' &&
                    Boolean(subDetails?.needsStoreSelection || subDetails?.hasExceededStoreLimit);
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between gap-2 p-2.5 rounded-lg text-left transition-colors ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
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
                      </div>
                      {item.id === 'inbox' && (
                        <CountBadge count={inboxUnreadCount} tone="blue" inverted={isActive} />
                      )}
                      {showBusinessAlert && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white">
                          !
                        </span>
                      )}
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
                      <StoreIcon className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>{t('nav.businessAdmin')}</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  </a>
                )}

                {isPlatformStaff && (
                  <a
                    href="http://localhost:3103"
                    className="w-full flex items-center justify-between p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-xs font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>{t('nav.platformAdmin')}</span>
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-xs font-medium"
                >
                  <LogOut className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{t('common.logout')}</span>
                </button>
              </div>
            </aside>

            {/* Right Main Content Panel */}
            <section className="md:col-span-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              {/* Tab: My Orders */}
              {activeTab === 'orders' && <AccountOrders locale={locale} />}

              {/* Tab: Inbox */}
              {activeTab === 'inbox' && (
                <AccountInbox locale={locale} onUnreadChanged={setInboxUnreadCount} />
              )}

              {/* Tab: Profile */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-black text-slate-900">{t('account.personalInfo')}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{t('account.subtitle')}</p>
                  </div>

                  {isSaved && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{t('account.profileUpdated')}</span>
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
                          <span>
                            {avatarUploading
                              ? t('common.loading')
                              : locale === 'en'
                                ? 'Change photo'
                                : 'Змінити фотографію'}
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            disabled={avatarUploading}
                            onChange={handleAvatarFile}
                            className="hidden"
                          />
                        </label>
                        <div className="text-[11px] text-slate-400 mt-1">
                          {locale === 'en'
                            ? 'JPG, PNG and WebP formats supported'
                            : 'Підтримуються формати JPG, PNG та WebP'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">{t('auth.fullName')}</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">{t('auth.email')}</label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                      />
                      <span className="text-[10px] text-slate-400">
                        {t('account.emailReadonlyHint')}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">{t('auth.phone')}</label>
                      <PhoneInput
                        value={phone}
                        onChange={setPhone}
                        locale={locale}
                        disabled={isSaving}
                      />
                      <span className="text-[10px] text-slate-400">{t('account.phoneHint')}</span>
                    </div>

                    {/* Language Preference Dropdown */}
                    <div className="space-y-2 pt-3 border-t border-slate-100">
                      <div>
                        <label className="text-xs font-bold text-slate-700 block">
                          {t('account.language')}
                        </label>
                        <p className="text-[11px] text-slate-500">
                          {t('account.languageDesc')}
                        </p>
                      </div>

                      <div className="max-w-xs pt-1">
                        <LanguageSelector
                          value={locale}
                          onChange={handleLanguageChange}
                          variant="full"
                          align="left"
                        />
                      </div>

                      {languageNotice && (
                        <div className="text-[11px] font-bold text-emerald-600 animate-fade-in mt-1">
                          {languageNotice}
                        </div>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4 shrink-0" />
                        <span>{isSaving ? t('common.saving') : t('account.saveChanges')}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tab: Businesses */}
              {activeTab === 'businesses' && (
                <AccountBusinesses
                  locale={locale}
                  t={t}
                  currentUserId={user?.id}
                  myStores={myStores}
                  subDetails={subDetails}
                  moderationNotice={moderationNotice}
                  onOpenCreateStoreModal={() => {
                    setShowCreateStoreModal(true);
                    setCreateStoreError(null);
                  }}
                  onSubmitForModeration={handleSubmitForModeration}
                  onSelectStoreToSuspend={(st) => {
                    const isOwner = st.isOwner ?? Boolean(user?.id && st.ownerId === user.id);
                    const canManageStatus =
                      isOwner || Boolean(st.myPermissions?.includes('store.status.manage'));
                    if (canManageStatus) {
                      setStoreToSuspend(st);
                    }
                  }}
                  onToggleStoreStatus={handleToggleStoreStatus}
                />
              )}

              {/* Tab: Subscriptions */}
              {activeTab === 'subscriptions' && (
                <AccountSubscriptions
                  t={t}
                  user={user}
                  subDetails={subDetails}
                  allPlans={allPlans}
                  subNotice={subNotice}
                  onSelectPlanForUpgrade={setSelectedPlanForUpgrade}
                />
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-black text-slate-900">{t('account.securityTab')}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t('account.securityTabDesc')}
                    </p>
                  </div>

                  {passwordError && (
                    <AlertBanner tone="danger">{passwordError}</AlertBanner>
                  )}
                  {passwordNotice && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{passwordNotice}</span>
                    </div>
                  )}

                  <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        {locale === 'en' ? 'Current password' : 'Поточний пароль'}
                      </label>
                      <input
                        type="password"
                        autoComplete="current-password"
                        maxLength={128}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        {locale === 'en' ? 'New password' : 'Новий пароль'}
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        maxLength={128}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        minLength={8}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">
                        {locale === 'en' ? 'Confirm new password' : 'Підтвердження нового пароля'}
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        maxLength={128}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        minLength={8}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                        required
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isChangingPassword}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                        <Lock className="w-4 h-4" />
                        <span>
                          {isChangingPassword
                            ? t('common.saving')
                            : locale === 'en'
                              ? 'Update password'
                              : 'Оновити пароль'}
                        </span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </section>
          </div>
        )}

      {/* Modal: Create Business — Unified Light Modal */}
      <Modal
        isOpen={showCreateStoreModal}
        onClose={() => setShowCreateStoreModal(false)}
        size="lg"
        icon={<StoreIcon className="w-4 h-4" />}
        title="Створення нового закладу"
        subtitle="BIZX BUSINESS"
      >
        <form onSubmit={handleCreateStore} className="space-y-4">
          {createStoreError && <AlertBanner tone="danger">{createStoreError}</AlertBanner>}

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
            <label className="text-xs font-bold text-slate-700">Адреса сторінки *</label>
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
              <label className="text-xs font-bold text-slate-700">{t('account.storePhoneLabel')}</label>
              <PhoneInput
                value={newStorePhone}
                onChange={setNewStorePhone}
                locale={locale}
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

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setShowCreateStoreModal(false)}>
              Скасувати
            </Button>
            <Button type="submit" variant="primary" disabled={isCreatingStore}>
              {isCreatingStore ? 'Створення...' : 'Зареєструвати заклад'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Upgrade Subscription — Unified Light ConfirmModal */}
      <ConfirmModal
        isOpen={Boolean(selectedPlanForUpgrade)}
        onClose={() => setSelectedPlanForUpgrade(null)}
        onConfirm={handleConfirmSubscriptionChange}
        nested={false}
        tone="info"
        icon={<CreditCard className="w-4 h-4" />}
        title="Зміна тарифного плану"
        subtitle="BIZX PAY"
        confirmLabel="Підтвердити зміну тарифу"
        cancelLabel="Скасувати"
        confirmVariant="primary"
        isLoading={isActivatingSub}
      >
        {selectedPlanForUpgrade && (
          <>
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
                <span className="font-semibold text-slate-700">30 днів</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600">Ліміт закладів:</span>
                <span className="font-semibold text-slate-700">До {selectedPlanForUpgrade.maxStores} закладів</span>
              </div>
            </div>

            <AlertBanner tone="info">
              Підписку буде активовано одразу після підтвердження на 30 днів.
            </AlertBanner>
          </>
        )}
      </ConfirmModal>

      {/* Modal: Confirm Suspend Store — Unified Light ConfirmModal */}
      <ConfirmModal
        isOpen={Boolean(storeToSuspend)}
        onClose={() => setStoreToSuspend(null)}
        onConfirm={handleConfirmSuspendStore}
        nested={false}
        tone="danger"
        icon={<AlertCircle className="w-4 h-4" />}
        title={locale === 'en' ? 'Suspend store?' : 'Призупинити роботу закладу?'}
        subtitle={storeToSuspend?.name}
        confirmLabel={t('subscriptions.suspendStore')}
        cancelLabel={t('common.cancel')}
        confirmVariant="destructive"
        isLoading={isSuspendingStore}
      >
        {storeToSuspend && (
          <>
            <p className="leading-relaxed text-slate-700">
              {locale === 'en' ? (
                <>
                  You are about to pause <strong>{storeToSuspend.name}</strong>. It will be
                  immediately hidden from customers.
                </>
              ) : (
                <>
                  Ви збираєтесь призупинити роботу закладу <strong>«{storeToSuspend.name}»</strong>.
                  Він буде миттєво прихований від покупців.
                </>
              )}
            </p>
            <AlertBanner tone="warning" title={locale === 'en' ? 'Important' : 'Важливо'}>
              {locale === 'en'
                ? 'You cannot reactivate the store yourself. To turn it back on later, it must be submitted for BizX moderation review.'
                : 'Самостійно повернути заклад в активний стан неможливо — для повторного запуску заклад обов’язково проходитиме перевірку модераторами BizX.'}
            </AlertBanner>
          </>
        )}
      </ConfirmModal>

      </main>

      {/* Metro Minimal Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <div>
            © {new Date().getFullYear()} BizX Commerce Platform. {t('landing.footerRights')}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-700">
              {t('nav.home')}
            </Link>
            <a href="http://localhost:3102" className="hover:text-slate-700">
              {t('nav.businessAdmin')}
            </a>
            <span className="text-slate-300">•</span>
            <span>{t('account.privacyTab')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
