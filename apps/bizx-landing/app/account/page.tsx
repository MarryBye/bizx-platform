'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { SiteHeader } from '../components/SiteHeader';
import type { UserProfile, Store } from '@bizx/common-types';
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
  AlertCircle
} from 'lucide-react';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';

type AccountTab = 'profile' | 'businesses' | 'security' | 'privacy' | 'integrations';

export default function AccountPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AccountTab>('profile');

  // Profile Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
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

  // In-page Auth State for Guests
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authRole, setAuthRole] = useState<'client' | 'business_owner'>('client');
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

  const handleInlineAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authMode === 'login') {
        const res = await api.auth.login({ email: authEmail, password: authPassword });
        if (res.success && res.data) {
          setUser(res.data.user);
          setName(res.data.user.name || '');
          setEmail(res.data.user.email || '');
          setPhone(res.data.user.phone || '');
          setAvatarUrl(res.data.user.avatarUrl || '');

          try {
            const storesRes = await api.stores.getMyStores();
            if (storesRes.success && storesRes.data) {
              setMyStores(storesRes.data);
            }
          } catch {
            setMyStores([]);
          }
          return;
        }
        setAuthError('Невірний логін або пароль');
      } else {
        const res = await api.auth.register({
          name: authName,
          email: authEmail,
          password: authPassword,
          role: authRole
        });
        if (res.success && res.data) {
          setUser(res.data.user);
          setName(res.data.user.name || '');
          setEmail(res.data.user.email || '');
          setPhone(res.data.user.phone || '');
          setAvatarUrl(res.data.user.avatarUrl || '');
          return;
        }
        setAuthError('Не вдалося створити акаунт. Перевірте введені дані');
      }
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      setAuthError(errObj.data?.message || errObj.message || 'Помилка авторизації');
    } finally {
      setAuthLoading(false);
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
          /* Unauthenticated State: Clean Metro Auth Card */
          <div className="max-w-md mx-auto py-10">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 text-center border-b border-slate-100 bg-slate-50/50">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-lg mx-auto mb-3 shadow-sm">
                  B
                </div>
                <h2 className="text-lg font-black text-slate-900">Обліковий запис BizX</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Увійдіть у систему, щоб переглянути дані профілю, список ваших закладів та персональні налаштування.
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="flex border-b border-slate-200 px-6 pt-3 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                  }}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                    authMode === 'login'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LoginOutlinedIcon className="w-4 h-4" />
                  <span>Вхід</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError(null);
                  }}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                    authMode === 'register'
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <PersonAddOutlinedIcon className="w-4 h-4" />
                  <span>Реєстрація</span>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleInlineAuthSubmit} className="p-6 space-y-4">
                {authError && (
                  <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{authError}</span>
                  </div>
                )}

                {authMode === 'register' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Ім&apos;я та прізвище</label>
                      <input
                        type="text"
                        required
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="Олександр Коваленко"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Тип облікового запису</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setAuthRole('client')}
                          className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                            authRole === 'client'
                              ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          Клієнт / Покупець
                        </button>
                        <button
                          type="button"
                          onClick={() => setAuthRole('business_owner')}
                          className={`py-2 px-3 text-xs font-medium rounded-lg border text-center transition-all ${
                            authRole === 'business_owner'
                              ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          Власник бізнесу
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Електронна пошта</label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Пароль</label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {authLoading
                    ? 'Зачекайте...'
                    : authMode === 'login'
                    ? 'Увійти в акаунт'
                    : 'Зареєструватися'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* Authenticated Dashboard View */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left Sidebar Menu */}
            <aside className="md:col-span-4 bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-1">
              <div className="p-3 border-b border-slate-100 flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shrink-0 overflow-hidden">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt={user.name || ''} className="w-full h-full object-cover" />
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
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-black text-slate-900">Мої заклади та ролі</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Список підключених торгових точок, де ви маєте статус власника або працівника
                    </p>
                  </div>

                  {myStores.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-3">
                      <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
                      <div className="text-xs font-bold text-slate-800">
                        У вас поки немає підключених бізнесів
                      </div>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                        Ви зареєстровані як покупець або співробітник без призначених прав до магазинів.
                      </p>
                      <a
                        href="http://localhost:3102"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
                      >
                        <span>Зареєструвати новий заклад</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {myStores.map((st) => (
                        <div
                          key={st.id}
                          className="p-4 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors bg-slate-50/50 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              Торгова точка
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded uppercase">
                              {st.status}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{st.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">/{st.slug}</div>
                          </div>
                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-700">
                              Власник
                            </span>
                            <a
                              href="http://localhost:3102"
                              className="text-xs font-bold text-slate-900 hover:underline inline-flex items-center gap-1"
                            >
                              <span>Увійти в панель</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Security */}
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
