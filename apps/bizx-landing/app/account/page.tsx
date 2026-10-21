'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createApiClient } from '@bizx/api-client';
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
  ArrowLeft
} from 'lucide-react';

type AccountTab = 'profile' | 'businesses' | 'security' | 'privacy' | 'integrations';

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<AccountTab>('profile');

  // Profile Form State
  const [name, setName] = useState('Олександр Коваленко');
  const [email, setEmail] = useState('alex.kovalenko@example.com');
  const [phone, setPhone] = useState('+380 67 123 45 67');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaved, setIsSaved] = useState(false);

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

  // My Businesses
  const [myStores, setMyStores] = useState<
    Array<{
      id: string;
      name: string;
      slug: string;
      role: 'owner' | 'manager' | 'staff';
      status: string;
      category: string;
    }>
  >([
    {
      id: 'store-1',
      name: 'Coffee Hub Kyiv',
      slug: 'coffee-hub-kyiv',
      role: 'owner',
      status: 'active',
      category: 'Кавʼярні та десерти'
    },
    {
      id: 'store-2',
      name: 'Green Bakery Dnipro',
      slug: 'green-bakery',
      role: 'manager',
      status: 'active',
      category: 'Пекарні та випічка'
    }
  ]);

  useEffect(() => {
    // Try to load user profile and stores if access token exists in localStorage
    try {
      const token = localStorage.getItem('bizx_admin_access_token');
      if (token) {
        const client = createApiClient({
          baseUrl: 'http://localhost:3101',
          getAccessToken: () => token
        });

        client.auth.me().then((res) => {
          if (res.success && res.data) {
            setName(res.data.name || '');
            setEmail(res.data.email || '');
            setPhone(res.data.phone || '');
            setAvatarUrl(res.data.avatarUrl || '');
          }
        }).catch(() => {});

        client.stores.getMyStores().then((res) => {
          if (res.success && res.data && res.data.length > 0) {
            setMyStores(
              res.data.map((s) => ({
                id: s.id,
                name: s.name,
                slug: s.slug,
                role: (s as unknown as { memberRole?: 'owner' | 'manager' | 'staff' }).memberRole || 'owner',
                status: s.status,
                category: (s as unknown as { categoryName?: string }).categoryName || 'Торгівля'
              }))
            );
          }
        }).catch(() => {});
      }
    } catch {
      // Keep defaults
    }
  }, []);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
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

  const menuItems = [
    { id: 'profile' as const, label: 'Особисті дані', desc: 'Імʼя, контакти та аватар', icon: User },
    { id: 'businesses' as const, label: 'Мої бізнеси та ролі', desc: 'Заклади та права доступу', icon: Building2 },
    { id: 'security' as const, label: 'Безпека та пароль', desc: 'Пароль, 2FA та сесії', icon: Shield },
    { id: 'privacy' as const, label: 'Сповіщення та приватність', desc: 'Email, SMS та маркетинг', icon: Bell },
    { id: 'integrations' as const, label: 'Інтеграції та API', desc: 'CRM вебхуки та ключі', icon: Plug }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Metro Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> На головну
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-900 text-white rounded flex items-center justify-center font-bold text-xs tracking-wider">
                B
              </div>
              <span className="font-extrabold text-sm tracking-tight text-slate-900">BizX</span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">
                Обліковий запис
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="http://localhost:3102"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-200"
            >
              <span>Панель бізнесу</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Account Container */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar Menu */}
          <aside className="md:col-span-4 bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-1">
            <div className="p-3 border-b border-slate-100 flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shrink-0">
                {name[0] || 'U'}
              </div>
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 truncate">{name}</h3>
                <p className="text-[11px] text-slate-500 font-mono truncate">{email}</p>
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
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <div className="text-xs font-bold leading-tight">{item.label}</div>
                      <div className={`text-[10px] leading-tight truncate ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
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
                    <span>Дані профілю успішно збережено</span>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Email (Ідентифікатор)</label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Контактний телефон</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">URL аватара</label>
                    <input
                      type="text"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                      <Save className="w-3.5 h-3.5" /> Зберегти зміни
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab: Businesses */}
            {activeTab === 'businesses' && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-black text-slate-900">Мої бізнеси та ролі</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Список магазинів та торговельних точок, до яких привʼязано ваш обліковий запис
                  </p>
                </div>

                <div className="space-y-3">
                  {myStores.map((store) => (
                    <div
                      key={store.id}
                      className="p-4 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{store.name}</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-slate-900 text-white">
                            {store.role === 'owner' ? 'Власник' : store.role === 'manager' ? 'Керуючий' : 'Персонал'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">/{store.slug} • {store.category}</p>
                      </div>

                      <a
                        href="http://localhost:3102"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors shadow-sm self-start sm:self-auto"
                      >
                        <span>Кабінет бізнесу</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                  <div className="font-bold text-slate-800 mb-1">Потрібно створити новий заклад?</div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Для реєстрації нового бізнесу або підключення філії скористайтесь панеллю керування BizX Admin.
                  </p>
                </div>
              </div>
            )}

            {/* Tab: Security */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-black text-slate-900">Безпека та пароль</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Захист вашого облікового запису BizX та керування активними сесіями
                  </p>
                </div>

                {passwordNotice && (
                  <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-800 flex items-center gap-2">
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
                      placeholder="Мінімум 8 символів"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Підтвердження нового пароля</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Повторіть новий пароль"
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" /> Змінити пароль
                  </button>
                </form>

                {/* 2FA Section */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Двофакторна автентифікація (2FA)</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Підтвердження входу за допомогою одноразового коду в додатку
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                      Скоро
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Privacy & Notifications */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-black text-slate-900">Сповіщення та приватність</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Налаштуйте канали отримання системних оновлень та приватність профілю
                  </p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailOrders}
                      onChange={(e) => setEmailOrders(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">Email-сповіщення про замовлення</div>
                      <div className="text-[11px] text-slate-400">
                        Отримувати миттєвий лист при надходженні нового замовлення або зміні статусу
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
                      <div className="text-xs font-bold text-slate-800">SMS / Viber інформування</div>
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
                      <div className="text-xs font-bold text-slate-800">Видимість контактів у каталозі</div>
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
                      <div className="text-xs font-bold text-slate-800">Новини та дайджести платформи BizX</div>
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
                        <h4 className="text-xs font-bold text-slate-900">Webhook URL подій магазину</h4>
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
                        <h4 className="text-xs font-bold text-slate-900">Персональний API Token</h4>
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
                      {apiKeyVisible ? 'bizx_live_sec_89f3a92c4b01e74a88301d' : '••••••••••••••••••••••••••••••••••••••••'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Metro Minimal Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <div>© {new Date().getFullYear()} BizX Commerce Platform. Всі права захищено.</div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-700">Головна</Link>
            <a href="http://localhost:3102" className="hover:text-slate-700">Адміністративна панель</a>
            <span className="text-slate-300">•</span>
            <span>Безпека та конфіденційність</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
