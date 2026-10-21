import React, { useState } from 'react';
import { Button, Input, Modal } from '@bizx/ui';
import {
  ShieldAlert,
  Building2,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Archive,
  UserPlus,
  Server,
  TrendingUp,
  Cpu,
  Layers,
  Lock,
  ExternalLink,
  ShieldCheck,
  EyeOff
} from 'lucide-react';

type PlatformTab = 'businesses' | 'users' | 'staff' | 'metrics';

interface MockBusiness {
  id: string;
  name: string;
  slug: string;
  category: string;
  ownerName: string;
  ownerEmail: string;
  ordersCount: number;
  totalGmv: number;
  status: 'active' | 'pending' | 'suspended' | 'archived';
  createdAt: string;
}

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'business_owner' | 'client' | 'staff';
  systemRole: 'user' | 'platform_admin';
  status: 'active' | 'suspended' | 'archived';
  createdAt: string;
}

interface MockStaff {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  accessLevel: 'full_admin' | 'ops_manager' | 'support_lead' | 'compliance';
  status: 'active' | 'on_leave';
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PlatformTab>('businesses');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');

  // Business state
  const [businesses, setBusinesses] = useState<MockBusiness[]>([
    {
      id: 'b-1',
      name: 'Coffee Hub Kyiv',
      slug: 'coffee-hub-kyiv',
      category: 'Кавʼярні та десерти',
      ownerName: 'Олександр Коваленко',
      ownerEmail: 'alex.kovalenko@example.com',
      ordersCount: 428,
      totalGmv: 184500,
      status: 'active',
      createdAt: '12.01.2026'
    },
    {
      id: 'b-2',
      name: 'TechStore Electro',
      slug: 'techstore-electro',
      category: 'Електроніка та гаджети',
      ownerName: 'Марія Мельник',
      ownerEmail: 'maria.melnyk@example.com',
      ordersCount: 912,
      totalGmv: 1420000,
      status: 'active',
      createdAt: '03.02.2026'
    },
    {
      id: 'b-3',
      name: 'Green Bakery Dnipro',
      slug: 'green-bakery',
      category: 'Пекарні та випічка',
      ownerName: 'Ігор Сидоренко',
      ownerEmail: 'igor.sydorenko@example.com',
      ordersCount: 65,
      totalGmv: 24800,
      status: 'pending',
      createdAt: '18.02.2026'
    },
    {
      id: 'b-4',
      name: 'Fashion Boutique Vogue',
      slug: 'vogue-boutique',
      category: 'Одяг та аксесуари',
      ownerName: 'Олена Кравченко',
      ownerEmail: 'elena.kravchenko@example.com',
      ordersCount: 12,
      totalGmv: 8500,
      status: 'suspended',
      createdAt: '01.03.2026'
    }
  ]);

  // Users state
  const [usersList, setUsersList] = useState<MockUser[]>([
    {
      id: 'u-1',
      name: 'Олександр Коваленко',
      email: 'alex.kovalenko@example.com',
      role: 'business_owner',
      systemRole: 'user',
      status: 'active',
      createdAt: '12.01.2026'
    },
    {
      id: 'u-2',
      name: 'Марія Мельник',
      email: 'maria.melnyk@example.com',
      role: 'business_owner',
      systemRole: 'user',
      status: 'active',
      createdAt: '03.02.2026'
    },
    {
      id: 'u-3',
      name: 'Віктор Петренко',
      email: 'victor.petrenko@bizx.ua',
      role: 'business_owner',
      systemRole: 'platform_admin',
      status: 'active',
      createdAt: '01.01.2026'
    },
    {
      id: 'u-4',
      name: 'Дмитро Кравчук',
      email: 'dmitro.kravchuk@gmail.com',
      role: 'client',
      systemRole: 'user',
      status: 'active',
      createdAt: '10.02.2026'
    },
    {
      id: 'u-5',
      name: 'Андрій Швець',
      email: 'suspicious.user@spam.com',
      role: 'client',
      systemRole: 'user',
      status: 'suspended',
      createdAt: '22.02.2026'
    },
    {
      id: 'u-6',
      name: 'Катерина Бойко',
      email: 'k.boyko@coffeehub.ua',
      role: 'staff',
      systemRole: 'user',
      status: 'active',
      createdAt: '25.02.2026'
    }
  ]);

  // Staff state
  const [staffList, setStaffList] = useState<MockStaff[]>([
    {
      id: 's-1',
      name: 'Віктор Петренко',
      email: 'victor.petrenko@bizx.ua',
      department: 'Platform Architecture & Ops',
      role: 'Lead System Operator',
      accessLevel: 'full_admin',
      status: 'active'
    },
    {
      id: 's-2',
      name: 'Анна Васильченко',
      email: 'anna.v@bizx.ua',
      department: 'Merchant Success & Onboarding',
      role: 'Senior Partner Onboarding',
      accessLevel: 'ops_manager',
      status: 'active'
    },
    {
      id: 's-3',
      name: 'Денис Поліщук',
      email: 'denys.p@bizx.ua',
      department: 'Customer Care & Dispute Resolution',
      role: 'Support Lead',
      accessLevel: 'support_lead',
      status: 'active'
    },
    {
      id: 's-4',
      name: 'Юлія Шевченко',
      email: 'yulia.sh@bizx.ua',
      department: 'Financial & KYC Compliance',
      role: 'Compliance Officer',
      accessLevel: 'compliance',
      status: 'active'
    }
  ]);

  // Modals
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffDept, setNewStaffDept] = useState('Customer Care & Support');
  const [newStaffAccess, setNewStaffAccess] = useState<'full_admin' | 'ops_manager' | 'support_lead'>('support_lead');

  // Business status actions (No hard delete: only archive / suspend / activate)
  const setBusinessStatus = (id: string, status: 'active' | 'suspended' | 'archived') => {
    setBusinesses((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status } : b))
    );
  };

  // User status actions
  const setUserStatus = (id: string, status: 'active' | 'suspended' | 'archived') => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === id ? { ...u, status } : u))
    );
  };

  const toggleAdminRole = (userId: string) => {
    setUsersList((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, systemRole: u.systemRole === 'platform_admin' ? 'user' : 'platform_admin' }
          : u
      )
    );
  };

  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim()) return;

    setStaffList((prev) => [
      ...prev,
      {
        id: `s-${Date.now()}`,
        name: newStaffName.trim(),
        email: newStaffEmail.trim(),
        department: newStaffDept,
        role: 'Оператор BizX',
        accessLevel: newStaffAccess,
        status: 'active'
      }
    ]);

    setNewStaffName('');
    setNewStaffEmail('');
    setIsAddStaffOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Metro System Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white text-slate-950 rounded flex items-center justify-center font-black text-sm tracking-wider">
              B
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-tight text-white">BizX Platform Admin</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Internal Staff Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Консоль оператора • Порт :3103 • Авторизований доступ співробітника
              </p>
            </div>
          </div>

          {/* Quick System Telemetry */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <div className="text-[10px]">
                <span className="font-bold text-slate-300">API Cluster :3101</span>
                <span className="text-emerald-400 ml-1.5 font-semibold">Online</span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <div className="text-[10px]">
                <span className="font-bold text-slate-300">PostgreSQL</span>
                <span className="text-blue-400 ml-1.5 font-semibold">12 pools</span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <div className="text-[10px]">
                <span className="font-bold text-slate-300">BullMQ Redis</span>
                <span className="text-amber-400 ml-1.5 font-semibold">Idle</span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

            <a
              href="http://localhost:3102"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-700"
            >
              <span>Бізнес-адмінка (:3102)</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href="http://localhost:3100"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-700"
            >
              <span>Портал (:3100)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Metro Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-2 pt-2 pb-2.5 border-t border-slate-800/80 overflow-x-auto">
          {[
            { id: 'businesses' as const, label: 'Реєстр бізнесів', icon: Building2, count: businesses.length },
            { id: 'users' as const, label: 'Користувачі та ролі', icon: Users, count: usersList.length },
            { id: 'staff' as const, label: 'Штат BizX', icon: ShieldAlert, count: staffList.length },
            { id: 'metrics' as const, label: 'Метрики та аудит', icon: TrendingUp }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      isActive ? 'bg-slate-200 text-slate-900' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1">
        {/* Tab 1: Businesses */}
        {activeTab === 'businesses' && (
          <div className="space-y-4">
            {/* Policy Banner: Zero Unauthorized Editing of Merchant Goods */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300">
                <span className="font-bold text-white block mb-0.5">
                  Політика безпеки: Відсутність прямого редагування даних клієнтів
                </span>
                Співробітники BizX здійснюють нагляд за статусом закладів, комплаєнсом та блокуванням у разі порушень.
                Редагування каталогів товарів, описів чи цін магазину заборонено операторам і виконується виключно власником або уповноваженими менеджерами закладу.
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-xl border border-slate-800">
              <div className="w-full sm:w-80 flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg">
                <Search className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Пошук бізнесу за назвою, slug чи email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400 font-medium">Статус:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs border border-slate-800 rounded-lg px-2.5 py-1.5 bg-slate-950 text-slate-300 font-medium focus:outline-none"
                >
                  <option value="all">Усі заклади</option>
                  <option value="active">Активні</option>
                  <option value="pending">На модерації</option>
                  <option value="suspended">Призупинені</option>
                  <option value="archived">Архівовано</option>
                </select>
              </div>
            </div>

            {/* Businesses Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Бізнес / Заклад</th>
                      <th className="py-3 px-4">Категорія</th>
                      <th className="py-3 px-4">Власник</th>
                      <th className="py-3 px-4">Замовлень</th>
                      <th className="py-3 px-4">Обіг (GMV)</th>
                      <th className="py-3 px-4">Статус</th>
                      <th className="py-3 px-4 text-right">Дії оператора BizX</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {businesses
                      .filter((b) => {
                        const matchesSearch =
                          b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          b.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
                        return matchesSearch && matchesStatus;
                      })
                      .map((biz) => (
                        <tr key={biz.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div>
                              <span className="font-bold text-white text-xs block">{biz.name}</span>
                              <span className="text-[11px] text-slate-500 font-mono">/{biz.slug}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-400">{biz.category}</td>

                          <td className="py-3 px-4">
                            <div>
                              <span className="font-semibold text-slate-200 block">{biz.ownerName}</span>
                              <span className="text-[11px] text-slate-500">{biz.ownerEmail}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-bold text-white">{biz.ordersCount}</td>

                          <td className="py-3 px-4 font-black text-white">
                            {biz.totalGmv.toLocaleString('uk-UA')} ₴
                          </td>

                          <td className="py-3 px-4">
                            {biz.status === 'active' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                                <CheckCircle2 className="w-3 h-3" /> Активний
                              </span>
                            )}
                            {biz.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 uppercase">
                                <AlertTriangle className="w-3 h-3" /> Модерація
                              </span>
                            )}
                            {biz.status === 'suspended' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800 uppercase">
                                <XCircle className="w-3 h-3" /> Призупинено
                              </span>
                            )}
                            {biz.status === 'archived' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                                <Archive className="w-3 h-3" /> Архівовано
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right space-x-1.5">
                            {biz.status !== 'active' && (
                              <button
                                onClick={() => setBusinessStatus(biz.id, 'active')}
                                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950 px-2 py-1 rounded transition-colors"
                              >
                                Активувати
                              </button>
                            )}

                            {biz.status === 'active' && (
                              <button
                                onClick={() => setBusinessStatus(biz.id, 'suspended')}
                                className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-950 px-2 py-1 rounded transition-colors"
                              >
                                Призупинити
                              </button>
                            )}

                            {biz.status !== 'archived' && (
                              <button
                                onClick={() => {
                                  if (confirm(`Архівувати заклад "${biz.name}"? Він буде прихований з платформи, але збережеться в БД.`)) {
                                    setBusinessStatus(biz.id, 'archived');
                                  }
                                }}
                                className="text-[11px] font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 px-2 py-1 rounded transition-colors"
                                title="Архівувати без повного видалення"
                              >
                                Архівувати
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Users */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Header & Filter Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-xl border border-slate-800">
              <div className="w-full sm:w-80 flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg">
                <Search className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Пошук користувача за ім'ям або email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400 font-medium">Роль:</span>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="text-xs border border-slate-800 rounded-lg px-2.5 py-1.5 bg-slate-950 text-slate-300 font-medium focus:outline-none"
                >
                  <option value="all">Усі акаунти</option>
                  <option value="client">Покупці (Clients)</option>
                  <option value="business_owner">Власники бізнесів</option>
                  <option value="staff">Персонал магазинів</option>
                  <option value="platform_admin">Оператори BizX</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Реєстр облікових записів ({usersList.length})
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Керування доступами, призначення системних операторів та блокування порушників
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Користувач</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Роль у сервісі</th>
                      <th className="py-3 px-4">Права BizX</th>
                      <th className="py-3 px-4">Статус</th>
                      <th className="py-3 px-4">Дата реєстрації</th>
                      <th className="py-3 px-4 text-right">Дії оператора</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {usersList
                      .filter((u) => {
                        const matchesSearch =
                          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesRole =
                          userRoleFilter === 'all' ||
                          u.role === userRoleFilter ||
                          (userRoleFilter === 'platform_admin' && u.systemRole === 'platform_admin');
                        return matchesSearch && matchesRole;
                      })
                      .map((user) => (
                        <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{user.name}</div>
                          </td>

                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                            {user.email}
                          </td>

                          <td className="py-3 px-4">
                            {user.role === 'business_owner' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-200 uppercase border border-slate-700">
                                Власник бізнесу
                              </span>
                            )}
                            {user.role === 'staff' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 uppercase border border-slate-700">
                                Персонал магазину
                              </span>
                            )}
                            {user.role === 'client' && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-950 text-slate-400 uppercase border border-slate-800">
                                Покупець (Client)
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {user.systemRole === 'platform_admin' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800 uppercase flex items-center gap-1 w-max">
                                <ShieldAlert className="w-3 h-3 text-purple-400" /> Оператор BizX
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">Користувач</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {user.status === 'active' && (
                              <span className="text-emerald-400 font-bold text-[11px]">Активний</span>
                            )}
                            {user.status === 'suspended' && (
                              <span className="text-rose-400 font-bold text-[11px]">Заблоковано</span>
                            )}
                            {user.status === 'archived' && (
                              <span className="text-slate-500 font-medium text-[11px]">Архівовано</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-slate-500 font-medium">{user.createdAt}</td>

                          <td className="py-3 px-4 text-right space-x-1.5">
                            <button
                              onClick={() => toggleAdminRole(user.id)}
                              className="text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 px-2 py-1 rounded border border-slate-700 transition-colors"
                            >
                              {user.systemRole === 'platform_admin' ? 'Зняти оператора' : 'Зробити оператором'}
                            </button>

                            {user.status === 'active' ? (
                              <button
                                onClick={() => setUserStatus(user.id, 'suspended')}
                                className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2 py-1 rounded transition-colors"
                              >
                                Блокувати
                              </button>
                            ) : (
                              <button
                                onClick={() => setUserStatus(user.id, 'active')}
                                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 px-2 py-1 rounded transition-colors"
                              >
                                Розблокувати
                              </button>
                            )}

                            {user.status !== 'archived' && (
                              <button
                                onClick={() => {
                                  if (confirm(`Архівувати акаунт "${user.name}"? Він буде збережений в базі даних без можливості авторизації.`)) {
                                    setUserStatus(user.id, 'archived');
                                  }
                                }}
                                className="text-[11px] font-semibold text-slate-500 hover:text-slate-300 hover:bg-slate-800 px-2 py-1 rounded transition-colors"
                                title="Архівувати акаунт"
                              >
                                Архівувати
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Staff */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Штат співробітників компанії BizX</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Оператори платформи з доступом до телеметрії, модерації бізнесів та фінансового моніторингу
                </p>
              </div>
              <Button
                onClick={() => setIsAddStaffOpen(true)}
                className="bg-white hover:bg-slate-100 text-slate-950 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5 text-slate-950" /> Додати співробітника BizX
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {staffList.map((st) => (
                <div
                  key={st.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex items-start justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center text-xs shrink-0 border border-slate-700">
                      {st.name[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">{st.name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">{st.email}</p>
                      <p className="text-[11px] text-slate-300 font-semibold mt-1">{st.role}</p>
                      <p className="text-[10px] text-slate-500">{st.department}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 uppercase border border-slate-700">
                      {st.accessLevel === 'full_admin' && 'Full Root Admin'}
                      {st.accessLevel === 'ops_manager' && 'Operations'}
                      {st.accessLevel === 'support_lead' && 'Support Lead'}
                      {st.accessLevel === 'compliance' && 'Compliance & KYC'}
                    </span>
                    <div className="mt-2 text-[10px] text-emerald-400 font-bold flex items-center justify-end gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Активний
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Metrics */}
        {activeTab === 'metrics' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Загальний обіг платформи (GMV)
              </span>
              <div className="text-2xl font-black text-white mt-2">1,637,800 ₴</div>
              <div className="text-xs text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> +24.6% за цей місяць
              </div>
            </div>

            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Підключені заклади
              </span>
              <div className="text-2xl font-black text-white mt-2">{businesses.length} магазини</div>
              <div className="text-xs text-slate-400 font-medium mt-1">
                1 на розгляді модерації
              </div>
            </div>

            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Швидкість відповідей API
              </span>
              <div className="text-2xl font-black text-white mt-2">42 ms</div>
              <div className="text-xs text-slate-400 font-medium mt-1">
                99.98% аптайм сервісів
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Staff Modal */}
      <Modal
        isOpen={isAddStaffOpen}
        onClose={() => setIsAddStaffOpen(false)}
        title="Додати співробітника до штату BizX"
      >
        <form onSubmit={handleAddStaffSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">ПІБ співробітника</label>
            <Input
              type="text"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="Тарас Шевченко"
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Корпоративний email BizX</label>
            <Input
              type="email"
              value={newStaffEmail}
              onChange={(e) => setNewStaffEmail(e.target.value)}
              placeholder="taras.sh@bizx.ua"
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Відділ компанії</label>
            <select
              value={newStaffDept}
              onChange={(e) => setNewStaffDept(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800 font-medium focus:outline-none focus:border-slate-900"
            >
              <option value="Customer Care & Support">Customer Care & Підтримка</option>
              <option value="Merchant Success & Onboarding">Онбординг бізнесів</option>
              <option value="Platform Architecture & Ops">DevOps та інфраструктура</option>
              <option value="Financial & KYC Compliance">Фінансовий моніторинг</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Рівень доступу оператора</label>
            <select
              value={newStaffAccess}
              onChange={(e) => setNewStaffAccess(e.target.value as any)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white text-slate-800 font-medium focus:outline-none focus:border-slate-900"
            >
              <option value="support_lead">Support Operator (Тільки звернення)</option>
              <option value="ops_manager">Operations Manager (Модерація магазинів)</option>
              <option value="full_admin">Full Root Platform Admin (Повний доступ)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddStaffOpen(false)}
              className="text-xs"
            >
              Скасувати
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              Зберегти в штат BizX
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
