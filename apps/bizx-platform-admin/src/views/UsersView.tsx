import React, { useState } from 'react';
import type { PlatformUserRecord } from '../components/UserDetailsModal';
import { useTranslation } from '../hooks/useTranslation';
import { StatusBadge, Button } from '@bizx/ui';
import { getInitials } from '@bizx/utils';
import {
  Users,
  Search,
  Archive,
  ShieldCheck,
  SlidersHorizontal,
  CreditCard
} from 'lucide-react';

interface UsersViewProps {
  users: PlatformUserRecord[];
  onSelectUser: (user: PlatformUserRecord) => void;
  isLoading: boolean;
}

const TIER_SHORT_LABELS: Record<string, string> = {
  free: 'Free',
  client_premium: 'Client+',
  business_starter: 'Starter',
  business_pro: 'Pro',
  business_enterprise: 'Enterprise'
};

export const UsersView: React.FC<UsersViewProps> = ({ users, onSelectUser, isLoading: _isLoading }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery));

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'platform_staff' && u.isPlatformStaff) ||
      (roleFilter === 'business_owner' && u.isBusinessOwner) ||
      (roleFilter === 'client' && !u.isPlatformStaff && !u.isBusinessOwner);
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getAccountTypeBadge = (u: PlatformUserRecord) => {
    if (u.isPlatformStaff) {
      return (
        <StatusBadge tone="blue" size="xs" icon={<ShieldCheck className="w-3 h-3" />}>
          <span className="truncate max-w-[115px] inline-block align-bottom">
            {u.platformRoleName || t('roles.platformAdmin')}
          </span>
        </StatusBadge>
      );
    }
    if (u.isBusinessOwner) {
      return (
        <StatusBadge tone="emerald" size="xs">
          {t('auth.businessRole')} ({u.storesCount})
        </StatusBadge>
      );
    }
    return (
      <StatusBadge tone="slate" size="xs">
        {t('auth.clientRole')}
      </StatusBadge>
    );
  };

  const getSubscriptionBadge = (u: PlatformUserRecord) => {
    const tier = u.subscriptionTier || 'free';
    const isActive = u.subscriptionStatus === 'active' && tier !== 'free';
    const label = TIER_SHORT_LABELS[tier] || tier;

    return (
      <div className="inline-flex flex-col items-start gap-0.5">
        <StatusBadge
          tone={isActive ? 'amber' : 'slate'}
          size="xs"
          icon={<CreditCard className="w-2.5 h-2.5" />}
          className="rounded"
        >
          {label}
        </StatusBadge>
        {isActive && u.subscriptionExpiresAt && (
          <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
            до {new Date(u.subscriptionExpiresAt).toLocaleDateString('uk-UA')}
          </span>
        )}
      </div>
    );
  };

  const getStatusBadge = (u: PlatformUserRecord) => {
    const label = t(`statuses.user.${u.status}`);
    switch (u.status) {
      case 'active':
        return (
          <StatusBadge tone="emerald" dot>
            {label}
          </StatusBadge>
        );
      case 'suspended':
        return (
          <div className="inline-flex flex-col items-start gap-0.5">
            <StatusBadge tone="rose" dot>
              {label}
            </StatusBadge>
            <span className="text-[10px] text-rose-600/80 font-medium pl-1 whitespace-nowrap">
              {u.suspendedUntil
                ? `до ${new Date(u.suspendedUntil).toLocaleDateString('uk-UA')}`
                : 'безстроково'}
            </span>
          </div>
        );
      case 'archived':
        return (
          <StatusBadge tone="slate" icon={<Archive className="w-3 h-3" />}>
            {label}
          </StatusBadge>
        );
      default:
        return <StatusBadge tone="slate">{label}</StatusBadge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          {t('platform.usersTitle')}
        </h1>
        <p className="text-xs text-slate-500 mt-1">{t('platform.usersSubtitle')}</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row items-center gap-3">
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

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-700"
          >
            <option value="all">Усі типи</option>
            <option value="business_owner">Власники бізнесу</option>
            <option value="client">Клієнти</option>
            <option value="platform_staff">Команда BizX</option>
          </select>

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

      {/* Table with stable column widths */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed min-w-[820px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-[28%]">Користувач</th>
                <th className="py-3 px-4 w-[18%]">Тип / Роль</th>
                <th className="py-3 px-4 w-[16%]">Підписка</th>
                <th className="py-3 px-4 w-[16%]">Статус</th>
                <th className="py-3 px-4 w-[11%]">Реєстрація</th>
                <th className="py-3 px-4 w-[11%] text-right">Дії</th>
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
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-medium align-middle">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                          {getInitials(u.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-slate-900 text-xs truncate">{u.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                      {getAccountTypeBadge(u)}
                    </td>

                    <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                      {getSubscriptionBadge(u)}
                    </td>

                    <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                      {getStatusBadge(u)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] align-middle whitespace-nowrap">
                      {u.createdAt}
                    </td>

                    <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                      <Button
                        variant="neutral"
                        size="sm"
                        title="Керування акаунтом"
                        onClick={() => onSelectUser(u)}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">Керування</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between px-4">
          <div>
            Показано облікових записів: {filteredUsers.length} з {users.length}
          </div>
          <div>● Реєстр акаунтів BizX ID</div>
        </div>
      </div>
    </div>
  );
};
