import React from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Archive
} from 'lucide-react';

export interface PlatformUserRecord {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'business_owner' | 'client' | 'admin';
  systemRole: 'user' | 'platform_admin';
  status: 'active' | 'suspended' | 'archived';
  createdAt: string;
}

interface UserDetailsModalProps {
  user: PlatformUserRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (userId: string, newStatus: 'active' | 'suspended' | 'archived') => void;
  onTogglePlatformRole: (userId: string, newSystemRole: 'user' | 'platform_admin') => void;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  isOpen,
  onClose,
  onUpdateStatus,
  onTogglePlatformRole
}) => {
  if (!isOpen || !user) return null;

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
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            Власник бізнесу
          </span>
        );
      case 'admin':
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
            Адміністратор
          </span>
        );
      default:
        return (
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
            Клієнт
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shrink-0">
              {getInitials(user.name || 'U')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">{user.name}</h2>
                {getRoleBadge(user.role)}
              </div>
              <p className="text-xs text-slate-500 font-mono">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                ID Користувача
              </span>
              <div className="text-xs font-mono text-slate-800 truncate select-all">{user.id}</div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Телефон
              </span>
              <div className="text-xs font-bold text-slate-800 truncate">
                {user.phone || 'Не вказано'}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Системний статус
              </span>
              <div className="text-xs font-bold text-slate-800">
                {user.systemRole === 'platform_admin' ? (
                  <span className="text-blue-700 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> BizX Staff
                  </span>
                ) : (
                  <span className="text-slate-600">Звичайний користувач</span>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Дата реєстрації
              </span>
              <div className="text-xs font-bold text-slate-800">{user.createdAt}</div>
            </div>
          </div>

          {/* Account Status Control */}
          <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Керування статусом облікового запису
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Блокування або архівація акаунта у всій системі
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => onUpdateStatus(user.id, 'active')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  user.status === 'active'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold ring-2 ring-emerald-400/20'
                    : 'border-slate-200 hover:border-emerald-300 text-slate-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1" />
                <span className="text-xs font-bold">Активний</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateStatus(user.id, 'suspended')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  user.status === 'suspended'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 font-bold ring-2 ring-rose-400/20'
                    : 'border-slate-200 hover:border-rose-300 text-slate-700'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-500 mb-1" />
                <span className="text-xs font-bold">Заблокований</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateStatus(user.id, 'archived')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  user.status === 'archived'
                    ? 'border-slate-400 bg-slate-100 text-slate-900 font-bold ring-2 ring-slate-300'
                    : 'border-slate-200 hover:border-slate-400 text-slate-700'
                }`}
              >
                <Archive className="w-4 h-4 text-slate-500 mb-1" />
                <span className="text-xs font-bold">В архів</span>
              </button>
            </div>
          </div>

          {/* System Role Privilege Grant */}
          <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900">
                Привілеї співробітника BizX Staff
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Надає доступ до цієї внутрішньої адмін-панелі на порту :3103
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                onTogglePlatformRole(
                  user.id,
                  user.systemRole === 'platform_admin' ? 'user' : 'platform_admin'
                )
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                user.systemRole === 'platform_admin'
                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                  : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              {user.systemRole === 'platform_admin' ? 'Відкликати доступ' : 'Надати права Staff'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
};
