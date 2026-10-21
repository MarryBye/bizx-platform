import React, { useState } from 'react';
import { Button, Input, Modal, Select } from '@bizx/ui';
import {
  ShieldAlert,
  Building2,
  Users,
  Search,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  UserCheck,
  UserPlus,
  Server,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  Layers,
  Filter
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
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
}

interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'business_owner' | 'client';
  systemRole: 'user' | 'platform_admin';
  isBlocked: boolean;
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

export const PlatformAdminView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<PlatformTab>('businesses');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Mock data for prototype
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

  const [usersList, setUsersList] = useState<MockUser[]>([
    {
      id: 'u-1',
      name: 'Олександр Коваленко',
      email: 'alex.kovalenko@example.com',
      role: 'business_owner',
      systemRole: 'user',
      isBlocked: false,
      createdAt: '12.01.2026'
    },
    {
      id: 'u-2',
      name: 'Марія Мельник',
      email: 'maria.melnyk@example.com',
      role: 'business_owner',
      systemRole: 'user',
      isBlocked: false,
      createdAt: '03.02.2026'
    },
    {
      id: 'u-3',
      name: 'Віктор Петренко',
      email: 'victor.petrenko@bizx.ua',
      role: 'business_owner',
      systemRole: 'platform_admin',
      isBlocked: false,
      createdAt: '01.01.2026'
    },
    {
      id: 'u-4',
      name: 'Дмитро Кравчук',
      email: 'dmitro.kravchuk@gmail.com',
      role: 'client',
      systemRole: 'user',
      isBlocked: false,
      createdAt: '10.02.2026'
    },
    {
      id: 'u-5',
      name: 'Андрій Швець (Підозріла активність)',
      email: 'suspicious.user@spam.com',
      role: 'client',
      systemRole: 'user',
      isBlocked: true,
      createdAt: '22.02.2026'
    }
  ]);

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

  const toggleBusinessStatus = (id: string, newStatus: 'active' | 'suspended') => {
    setBusinesses((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
    );
  };

  const toggleUserBlock = (userId: string) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isBlocked: !u.isBlocked } : u))
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
        role: 'Оператор підтримки BizX',
        accessLevel: newStaffAccess,
        status: 'active'
      }
    ]);

    setNewStaffName('');
    setNewStaffEmail('');
    setIsAddStaffOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Metro System Header */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase">
                BizX Staff Console • Internal Operator
              </span>
            </div>
            <h1 className="text-xl font-black tracking-tight mt-1">Центральний пульт управління платформою</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Глобальний нагляд за клієнтськими бізнесами, обліковими записами та співробітниками BizX
            </p>
          </div>

          {/* Quick System Telemetry */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <div className="text-[10px]">
                <div className="font-bold text-slate-200">API Cluster</div>
                <div className="text-emerald-400 font-semibold">Online :3101</div>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <div className="text-[10px]">
                <div className="font-bold text-slate-200">PostgreSQL</div>
                <div className="text-blue-400 font-semibold">12 pools connected</div>
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-amber-400" />
              <div className="text-[10px]">
                <div className="font-bold text-slate-200">BullMQ Redis</div>
                <div className="text-amber-400 font-semibold">0 failed jobs</div>
              </div>
            </div>
          </div>
        </div>

        {/* Console Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800 overflow-x-auto">
          {[
            { id: 'businesses' as const, label: 'Реєстр бізнесів', icon: Building2, count: businesses.length },
            { id: 'users' as const, label: 'Акаунти користувачів', icon: Users, count: usersList.length },
            { id: 'staff' as const, label: 'Штат співробітників BizX', icon: ShieldAlert, count: staffList.length },
            { id: 'metrics' as const, label: 'Метрики платформи', icon: TrendingUp }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 shadow'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      isActive ? 'bg-slate-200 text-slate-800' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab: Businesses */}
      {activeSubTab === 'businesses' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="w-full sm:w-72 flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Пошук бізнесу за назвою, slug чи email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-medium">Статус:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium"
              >
                <option value="all">Усі бізнеси</option>
                <option value="active">Активні</option>
                <option value="pending">На модерації</option>
                <option value="suspended">Заблоковані</option>
              </select>
            </div>
          </div>

          {/* Businesses Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Бізнес / Магазин</th>
                    <th className="py-3 px-4">Категорія</th>
                    <th className="py-3 px-4">Власник акаунту</th>
                    <th className="py-3 px-4">Замовлень</th>
                    <th className="py-3 px-4">Обіг (GMV)</th>
                    <th className="py-3 px-4">Статус</th>
                    <th className="py-3 px-4 text-right">Дії модератора</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {businesses
                    .filter((b) => {
                      const matchesSearch =
                        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        b.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
                      return matchesSearch && matchesStatus;
                    })
                    .map((biz) => (
                      <tr key={biz.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <span className="font-bold text-slate-900 text-xs block">{biz.name}</span>
                            <span className="text-[11px] text-slate-400 font-mono">/{biz.slug}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600 font-medium">{biz.category}</td>

                        <td className="py-3 px-4">
                          <div>
                            <span className="font-semibold text-slate-800 block">{biz.ownerName}</span>
                            <span className="text-[11px] text-slate-400">{biz.ownerEmail}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900">{biz.ordersCount}</td>

                        <td className="py-3 px-4 font-black text-slate-900">
                          {biz.totalGmv.toLocaleString('uk-UA')} ₴
                        </td>

                        <td className="py-3 px-4">
                          {biz.status === 'active' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                              <CheckCircle2 className="w-3 h-3" /> Активний
                            </span>
                          )}
                          {biz.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                              <AlertTriangle className="w-3 h-3" /> Модерація
                            </span>
                          )}
                          {biz.status === 'suspended' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                              <XCircle className="w-3 h-3" /> Заблоковано
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {biz.status === 'active' ? (
                            <button
                              onClick={() => toggleBusinessStatus(biz.id, 'suspended')}
                              className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
                            >
                              Призупинити
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleBusinessStatus(biz.id, 'active')}
                              className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded transition-colors"
                            >
                              Активувати
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

      {/* Tab: Users */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Всі зареєстровані користувачі ({usersList.length})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Керування правами доступу, операторськими повноваженнями та блокуванням акаунтів
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Користувач</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Роль у додатку</th>
                    <th className="py-3 px-4">Системний статус</th>
                    <th className="py-3 px-4">Дата реєстрації</th>
                    <th className="py-3 px-4 text-right">Дії адміністратора</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {usersList.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{user.name}</div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                        {user.email}
                      </td>

                      <td className="py-3 px-4">
                        {user.role === 'business_owner' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 uppercase border border-slate-200">
                            Власник бізнесу
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-600 uppercase border border-slate-200">
                            Покупець (Client)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {user.systemRole === 'platform_admin' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 uppercase flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" /> Оператор BizX
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 uppercase">
                              Користувач
                            </span>
                          )}

                          {user.isBlocked && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase">
                              Заблоковано
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-400 font-medium">{user.createdAt}</td>

                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => toggleAdminRole(user.id)}
                          className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 transition-colors"
                        >
                          {user.systemRole === 'platform_admin' ? 'Зняти адміна' : 'Зробити оператором'}
                        </button>

                        <button
                          onClick={() => toggleUserBlock(user.id)}
                          className={`text-[11px] font-semibold px-2 py-1 rounded transition-colors ${
                            user.isBlocked
                              ? 'text-emerald-700 hover:bg-emerald-50'
                              : 'text-rose-600 hover:bg-rose-50'
                          }`}
                        >
                          {user.isBlocked ? 'Розблокувати' : 'Блокувати'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Staff */}
      {activeSubTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Внутрішній штат BizX (Platform Staff)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Співробітники компанії з доступом до телеметрії, модерації закладів та фінансового комплаєнсу
              </p>
            </div>
            <Button
              onClick={() => setIsAddStaffOpen(true)}
              className="bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" /> Додати співробітника BizX
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staffList.map((st) => (
              <div
                key={st.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-start justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {st.name[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{st.name}</h4>
                    <p className="text-[11px] text-slate-500 font-mono">{st.email}</p>
                    <p className="text-[11px] text-slate-700 font-semibold mt-1">{st.role}</p>
                    <p className="text-[10px] text-slate-400">{st.department}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase border border-slate-200">
                    {st.accessLevel === 'full_admin' && 'Full Root Admin'}
                    {st.accessLevel === 'ops_manager' && 'Operations'}
                    {st.accessLevel === 'support_lead' && 'Support Lead'}
                    {st.accessLevel === 'compliance' && 'Compliance & KYC'}
                  </span>
                  <div className="mt-2 text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Активний
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Metrics */}
      {activeSubTab === 'metrics' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Загальний обіг платформи (GMV)
            </span>
            <div className="text-2xl font-black text-slate-900 mt-2">1,637,800 ₴</div>
            <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> +24.6% за цей місяць
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Підключені заклади
            </span>
            <div className="text-2xl font-black text-slate-900 mt-2">{businesses.length} магазини</div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              1 на розгляді модерації
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Швидкість відповідей API
            </span>
            <div className="text-2xl font-black text-slate-900 mt-2">42 ms</div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              99.98% аптайм сервісів
            </div>
          </div>
        </div>
      )}

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
            <Select
              value={newStaffDept}
              onChange={(val) => setNewStaffDept(val)}
              options={[
                { value: 'Customer Care & Support', label: 'Customer Care & Підтримка' },
                { value: 'Merchant Success & Onboarding', label: 'Онбординг бізнесів' },
                { value: 'Platform Architecture & Ops', label: 'DevOps та інфраструктура' },
                { value: 'Financial & KYC Compliance', label: 'Фінансовий моніторинг' }
              ]}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Рівень доступу оператора</label>
            <Select
              value={newStaffAccess}
              onChange={(val) => setNewStaffAccess(val as any)}
              options={[
                { value: 'support_lead', label: 'Support Operator (Тільки перегляд та звернення)' },
                { value: 'ops_manager', label: 'Operations Manager (Модерація магазинів)' },
                { value: 'full_admin', label: 'Full Root Platform Admin (Повний доступ)' }
              ]}
            />
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
