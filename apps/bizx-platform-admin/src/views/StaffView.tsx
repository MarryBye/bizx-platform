import React, { useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  X
} from 'lucide-react';

export interface PlatformStaffMember {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  accessLevel: 'full_admin' | 'ops_manager' | 'support_lead' | 'compliance';
  status: 'active' | 'on_leave';
}

interface StaffViewProps {
  staffList: PlatformStaffMember[];
  onAddStaff: (newStaff: Omit<PlatformStaffMember, 'id'>) => void;
}

export const StaffView: React.FC<StaffViewProps> = ({ staffList, onAddStaff }) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Операційний відділ');
  const [role, setRole] = useState('Менеджер операцій');
  const [accessLevel, setAccessLevel] = useState<'full_admin' | 'ops_manager' | 'support_lead' | 'compliance'>('ops_manager');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    onAddStaff({
      name: name.trim(),
      email: email.trim(),
      department,
      role,
      accessLevel,
      status: 'active'
    });

    setName('');
    setEmail('');
    setIsInviteModalOpen(false);
  };

  const getInitials = (val: string) => {
    return val
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  };

  const getAccessBadge = (level: string) => {
    switch (level) {
      case 'full_admin':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
            Full Admin
          </span>
        );
      case 'ops_manager':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            Operations
          </span>
        );
      case 'compliance':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
            Compliance
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
            Support
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Внутрішня команда платформи
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-0.5">
            Співробітники BizX Core
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Команда операторів, комплаєнсу та підтримки з доступом до керування платформою
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsInviteModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm self-start sm:self-auto"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Додати співробітника</span>
        </button>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staffList.map((st) => (
          <div
            key={st.id}
            className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-colors space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                  {getInitials(st.name)}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">{st.name}</h3>
                  <div className="text-[11px] text-slate-400 font-mono">{st.email}</div>
                </div>
              </div>
              {getAccessBadge(st.accessLevel)}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">{st.department}</span>
              <span className="font-semibold text-slate-800">{st.role}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Новий співробітник BizX</h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Ім&apos;я та прізвище</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Олена Коваль"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Корпоративний Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@bizx.ua"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Відділ</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                >
                  <option value="Операційний відділ">Операційний відділ</option>
                  <option value="Відділ комплаєнсу">Відділ комплаєнсу</option>
                  <option value="Служба підтримки">Служба підтримки</option>
                  <option value="Інженерна група">Інженерна група</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Посада</label>
                <input
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Менеджер операцій"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Рівень доступу</label>
                <select
                  value={accessLevel}
                  onChange={(e) =>
                    setAccessLevel(
                      e.target.value as 'full_admin' | 'ops_manager' | 'support_lead' | 'compliance'
                    )
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                >
                  <option value="ops_manager">Operations Manager (Торгові точки)</option>
                  <option value="support_lead">Support Lead (Користувачі та звернення)</option>
                  <option value="compliance">Compliance Officer (Модерація та блокування)</option>
                  <option value="full_admin">Full Platform Admin (Повний доступ)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                Надати доступ до консолі
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
