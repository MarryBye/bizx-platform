import React, { useState } from 'react';
import type { PlatformUserRecord } from '../components/UserDetailsModal';
import {
  Users,
  Search,
  Archive,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface UsersViewProps {
  users: PlatformUserRecord[];
  onSelectUser: (user: PlatformUserRecord) => void;
  isLoading: boolean;
}

export const UsersView: React.FC<UsersViewProps> = ({ users, onSelectUser, isLoading: _isLoading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getInitials = (nameVal: string) => {
    return nameVal
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'business_owner':
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Власник бізнесу
          </span>
        );
      case 'admin':
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Адміністратор
          </span>
        );
      default:
        return (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Клієнт
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Активний</span>
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Заблокований</span>
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
            <Archive className="w-3 h-3" />
            <span>В архіві</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          База користувачів системи
        </span>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-0.5">
          Облікові записи та доступ
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Контроль акаунтів мерчантів, клієнтів та операторів. Безпека паролів збережена (хеші приховані).
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Пошук за ім'ям, email або телефоном..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900 transition-all font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-700"
          >
            <option value="all">Всі ролі</option>
            <option value="business_owner">Власники бізнесу</option>
            <option value="client">Клієнти</option>
            <option value="admin">Адміністратори</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-700"
          >
            <option value="all">Всі статуси</option>
            <option value="active">Активні</option>
            <option value="suspended">Заблоковані</option>
            <option value="archived">В архіві</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Користувач</th>
                <th className="py-3 px-4">Роль</th>
                <th className="py-3 px-4">Системний доступ</th>
                <th className="py-3 px-4">Статус</th>
                <th className="py-3 px-4">Реєстрація</th>
                <th className="py-3 px-4 text-right">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <div className="font-semibold text-xs">Користувачів не знайдено</div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* User Info */}
                    <td className="py-3.5 px-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-xs">{u.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>

                    {/* System Access */}
                    <td className="py-3.5 px-4">
                      {u.systemRole === 'platform_admin' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          <ShieldCheck className="w-3.5 h-3.5" /> BizX Staff
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Звичайний</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">{getStatusBadge(u.status)}</td>

                    {/* Created At */}
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {u.createdAt}
                    </td>

                    {/* Uniform Action Button */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectUser(u)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-900 hover:text-white hover:border-slate-900 text-slate-700 font-bold text-xs transition-all shadow-sm w-28"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Керування</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between px-4">
          <div>Всього облікових записів: {filteredUsers.length}</div>
          <div>Шифрування паролів BCrypt (rounds: 10)</div>
        </div>
      </div>
    </div>
  );
};
