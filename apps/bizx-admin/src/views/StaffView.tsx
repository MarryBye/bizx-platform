import React, { useState, useEffect } from 'react';
import { useBusinessStore } from '../store/useBusinessStore';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../lib/api';
import { resolveMediaUrl } from '../lib/media';
import { Button, Input, Modal, Select } from '@bizx/ui';
import {
  Users,
  UserPlus,
  Archive,
  ShieldCheck,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Mail,
  User
} from 'lucide-react';
import type { StoreMember, StoreMemberRole } from '@bizx/common-types';

export const StaffView: React.FC = () => {
  const { activeStoreId, stores } = useBusinessStore();
  const { user: currentUser } = useAuthStore();
  const [members, setMembers] = useState<StoreMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<StoreMemberRole>('staff');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Delete modal state
  const [deletingMember, setDeletingMember] = useState<StoreMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeStore = stores.find((s) => s.id === activeStoreId);

  const loadMembers = async () => {
    if (!activeStoreId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.stores.getMembers(activeStoreId);
      if (res.success && res.data) {
        setMembers(res.data);
      }
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Не вдалося завантажити список персоналу');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [activeStoreId]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStoreId || !inviteEmail.trim()) return;

    setIsSubmitting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const res = await api.stores.addMember(activeStoreId, {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole
      });

      if (res.success) {
        setInviteSuccess(`Користувача ${inviteEmail} успішно додано до команди магазину`);
        setInviteEmail('');
        setInviteRole('staff');
        loadMembers();
        setTimeout(() => {
          setIsInviteOpen(false);
          setInviteSuccess(null);
        }, 1500);
      }
    } catch (err: any) {
      setInviteError(err?.data?.message || err?.message || 'Помилка при додаванні співробітника');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!activeStoreId || !deletingMember) return;
    setIsDeleting(true);
    try {
      const res = await api.stores.removeMember(activeStoreId, deletingMember.id);
      if (res.success) {
        setMembers((prev) => prev.filter((m) => m.id !== deletingMember.id));
        setDeletingMember(null);
      }
    } catch (err: any) {
      alert(err?.data?.message || err?.message || 'Помилка при видаленні співробітника');
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleBadge = (role: StoreMemberRole) => {
    switch (role) {
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-900 text-white uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3" /> Власник
          </span>
        );
      case 'manager':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-800 uppercase tracking-wider">
            <Briefcase className="w-3 h-3 text-slate-600" /> Керуючий
          </span>
        );
      case 'staff':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 uppercase tracking-wider border border-slate-200">
            <User className="w-3 h-3 text-slate-400" /> Персонал
          </span>
        );
    }
  };

  if (!activeStoreId) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-base">Оберіть магазин</h3>
        <p className="text-xs text-slate-500 mt-1">
          Для керування співробітниками оберіть активний заклад у бічній панелі
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {activeStore?.name || 'Магазин'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-medium text-slate-500">Команда та ролі</span>
          </div>
          <h1 className="text-xl font-black text-slate-900 mt-1">Персонал магазину</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Керуйте доступами керуючих, касирів та операторів вашого закладу
          </p>
        </div>

        <Button
          onClick={() => {
            setInviteError(null);
            setInviteSuccess(null);
            setIsInviteOpen(true);
          }}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-2.5 rounded-lg shadow-sm font-semibold"
        >
          <UserPlus className="w-4 h-4" /> Запросити співробітника
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={loadMembers} className="ml-auto text-xs py-1">
            Повторити
          </Button>
        </div>
      )}

      {/* Members table card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Список учасників ({members.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Права на замовлення та редагування каталогу
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            Завантаження списку співробітників...
          </div>
        ) : members.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700">У магазині немає доданих співробітників</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Натисніть кнопку «Запросити співробітника», щоб надати доступ за адресою електронної пошти
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Співробітник</th>
                  <th className="py-3 px-4">Електронна пошта</th>
                  <th className="py-3 px-4">Роль у закладі</th>
                  <th className="py-3 px-4">Дата додавання</th>
                  <th className="py-3 px-4 text-right">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {members.map((member) => {
                  const isCurrent = currentUser?.id === member.userId;
                  const isOwner = member.role === 'owner';
                  const avatar = resolveMediaUrl(member.userAvatarUrl);

                  return (
                    <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-slate-200">
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={member.userName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{member.userName?.[0]?.toUpperCase() || 'U'}</span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {member.userName}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] text-blue-600 font-medium">
                                (Це ви)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{member.userEmail}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {getRoleBadge(member.role)}
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {member.createdAt ? new Date(member.createdAt).toLocaleDateString('uk-UA') : '—'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {!isOwner && !isCurrent ? (
                          <button
                            onClick={() => setDeletingMember(member)}
                            className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Архівувати співробітника"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium italic">
                            {isOwner ? 'Основний власник' : 'Поточний акаунт'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Permissions info card */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
        <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-slate-700" /> Рівні доступу в системі BizX
        </h4>
        <ul className="space-y-1 text-[11px] leading-4 text-slate-500">
          <li>
            • <strong className="text-slate-800">Власник (Owner):</strong> Повний контроль над магазином, фінансами, налаштуваннями медіа та керуванням персоналом.
          </li>
          <li>
            • <strong className="text-slate-800">Керуючий (Manager):</strong> Керування каталогом товарів, зміна статусів замовлень, перегляд аналітики та персоналу.
          </li>
          <li>
            • <strong className="text-slate-800">Персонал (Staff):</strong> Обробка нових замовлень, оновлення наявності товарів на складі без доступу до налаштувань.
          </li>
        </ul>
      </div>

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Запросити співробітника до магазину"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Вкажіть email зареєстрованого користувача BizX та призначте відповідну роль у закладі.
          </p>

          {inviteError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          {inviteSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{inviteSuccess}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Email користувача <span className="text-red-500">*</span>
            </label>
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="employee@example.com"
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Роль та рівень доступу</label>
            <Select
              value={inviteRole}
              onChange={(val) => setInviteRole(val as StoreMemberRole)}
              options={[
                { value: 'staff', label: 'Персонал (Обробка замовлень та склад)' },
                { value: 'manager', label: 'Керуючий (Товари, замовлення, аналітика)' }
              ]}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsInviteOpen(false)}
              className="text-xs"
            >
              Скасувати
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
            >
              {isSubmitting ? 'Додавання...' : 'Надіслати запрошення'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Archive Confirmation Modal */}
      <Modal
        isOpen={!!deletingMember}
        onClose={() => setDeletingMember(null)}
        title="Архівувати співробітника магазину"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Ви впевнені, що бажаєте архівувати{' '}
            <strong className="text-slate-900">{deletingMember?.userName}</strong> (
            {deletingMember?.userEmail})? Доступ користувача до кабінету замовлень буде відкликано, але історія його дій та замовлень збережеться в базі даних.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingMember(null)}
              className="text-xs"
            >
              Скасувати
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isDeleting}
              onClick={handleRemoveMember}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold"
            >
              {isDeleting ? 'Архівація...' : 'Архівувати'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
