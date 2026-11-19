import React, { useState, useEffect } from 'react';
import type {
  UpdatePlatformUserStatusDto,
  UpdatePlatformUserSubscriptionDto,
  SubscriptionTier
} from '@bizx/common-types';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Archive,
  CreditCard,
  ShieldAlert,
  Calendar,
  Send,
  Lock,
  SlidersHorizontal
} from 'lucide-react';

export interface PlatformUserRecord {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  isPlatformStaff: boolean;
  platformRoleName?: string | null;
  isBusinessOwner: boolean;
  storesCount: number;
  status: 'active' | 'suspended' | 'archived';
  suspendedUntil?: string | null;
  suspensionReason?: string | null;
  subscriptionTier: string;
  subscriptionStatus: string;
  subscriptionExpiresAt?: string | null;
  createdAt: string;
}

interface UserDetailsModalProps {
  user: PlatformUserRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (userId: string, dto: UpdatePlatformUserStatusDto) => Promise<void>;
  onUpdateSubscription: (
    userId: string,
    dto: UpdatePlatformUserSubscriptionDto
  ) => Promise<void>;
  canEditStatus?: boolean;
  canUnblock?: boolean;
  canArchive?: boolean;
  canManageSubscriptions?: boolean;
}

const DURATION_PRESETS: Array<{ value: number | null; label: string }> = [
  { value: 3, label: '3 дні' },
  { value: 7, label: '7 днів' },
  { value: 14, label: '14 днів' },
  { value: 30, label: '30 днів' },
  { value: 90, label: '90 днів' },
  { value: null, label: 'Назавжди (до ручного зняття)' }
];

const TIER_OPTIONS: Array<{ value: SubscriptionTier; label: string; limit: string }> = [
  { value: 'free', label: 'Базовий (Free)', limit: '0 бізнесів' },
  { value: 'client_premium', label: 'Client Premium', limit: 'Клієнтський' },
  { value: 'business_starter', label: 'Business Starter', limit: 'до 1 закладу' },
  { value: 'business_pro', label: 'Business Pro', limit: 'до 3 закладів' },
  { value: 'business_enterprise', label: 'Business Enterprise', limit: 'до 10 закладів' }
];

const SUB_STATUS_OPTIONS: Array<{
  value: 'none' | 'active' | 'expired' | 'cancelled';
  label: string;
}> = [
  { value: 'active', label: 'Активна' },
  { value: 'none', label: 'Немає' },
  { value: 'expired', label: 'Термін минув' },
  { value: 'cancelled', label: 'Скасована' }
];

type UserConfirmType = null | 'activate' | 'suspend' | 'archive' | 'subscription';

function toDateInputValue(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  isOpen,
  onClose,
  onUpdateStatus,
  onUpdateSubscription,
  canEditStatus = false,
  canUnblock = false,
  canArchive = false,
  canManageSubscriptions = false
}) => {
  const [confirmType, setConfirmType] = useState<UserConfirmType>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [durationMode, setDurationMode] = useState<'preset' | 'custom'>('preset');
  const [selectedDays, setSelectedDays] = useState<number | null>(7);
  const [customDaysInput, setCustomDaysInput] = useState('14');
  const [isBusy, setIsBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Subscription editor state
  const [isEditingSub, setIsEditingSub] = useState(false);
  const [subTier, setSubTier] = useState<SubscriptionTier>('free');
  const [subStatus, setSubStatus] = useState<'none' | 'active' | 'expired' | 'cancelled'>('none');
  const [subExpiresDate, setSubExpiresDate] = useState('');
  const [subNote, setSubNote] = useState('');

  useEffect(() => {
    if (!isOpen || !user) {
      setConfirmType(null);
      setIsEditingSub(false);
      setModalError(null);
      return;
    }
    setSubTier((user.subscriptionTier as SubscriptionTier) || 'free');
    setSubStatus(
      (user.subscriptionStatus as 'none' | 'active' | 'expired' | 'cancelled') || 'none'
    );
    setSubExpiresDate(toDateInputValue(user.subscriptionExpiresAt));
    setSubNote('');
    setIsEditingSub(false);
    setConfirmType(null);
    setModalError(null);
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const getInitials = (nameVal: string) =>
    nameVal
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');

  const addDaysPreset = (days: number) => {
    const base =
      subExpiresDate && new Date(subExpiresDate).getTime() > Date.now()
        ? new Date(subExpiresDate)
        : new Date();
    const next = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    setSubExpiresDate(next.toISOString().slice(0, 10));
    if (subStatus !== 'active') setSubStatus('active');
  };

  const resolveChosenDays = (): number | null => {
    if (durationMode === 'custom') {
      const parsed = parseInt(customDaysInput, 10);
      return Number.isFinite(parsed) && parsed >= 1 ? Math.min(3650, parsed) : 7;
    }
    return selectedDays;
  };

  const openConfirm = (type: UserConfirmType) => {
    setConfirmType(type);
    setReasonInput('');
    setDurationMode('preset');
    setSelectedDays(7);
    setCustomDaysInput('14');
    setModalError(null);
  };

  const handleExecuteConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmType) return;
    setModalError(null);
    setIsBusy(true);
    try {
      if (confirmType === 'activate') {
        await onUpdateStatus(user.id, { status: 'active' });
      } else if (confirmType === 'suspend') {
        if (reasonInput.trim().length < 5) {
          setModalError('Вкажіть причину блокування користувача (мінімум 5 символів)');
          return;
        }
        await onUpdateStatus(user.id, {
          status: 'suspended',
          suspensionDays: resolveChosenDays(),
          suspensionReason: reasonInput.trim()
        });
      } else if (confirmType === 'archive') {
        await onUpdateStatus(user.id, { status: 'archived' });
      } else if (confirmType === 'subscription') {
        const expiresIso = subExpiresDate
          ? new Date(`${subExpiresDate}T23:59:59.000Z`).toISOString()
          : null;
        await onUpdateSubscription(user.id, {
          subscriptionTier: subTier,
          subscriptionStatus: subStatus,
          subscriptionExpiresAt: expiresIso,
          note: subNote.trim() || undefined
        });
        setIsEditingSub(false);
      }
      setConfirmType(null);
      setReasonInput('');
    } catch (err: any) {
      setModalError(err?.data?.message || err?.message || 'Не вдалося виконати дію');
    } finally {
      setIsBusy(false);
    }
  };

  const currentTierMeta =
    TIER_OPTIONS.find((t) => t.value === user.subscriptionTier) || TIER_OPTIONS[0];
  const daysLeft =
    user.subscriptionExpiresAt && user.subscriptionStatus === 'active'
      ? Math.max(
          0,
          Math.ceil(
            (new Date(user.subscriptionExpiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
          )
        )
      : null;

  const canActivateUser =
    user.status === 'suspended' || user.status === 'archived' ? canUnblock : canEditStatus;

  const renderAccountBadge = (u: PlatformUserRecord) => {
    if (u.isPlatformStaff) {
      return (
        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
          {u.platformRoleName || 'BizX Staff'}
        </span>
      );
    }
    if (u.isBusinessOwner) {
      return (
        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
          Власник бізнесу ({u.storesCount})
        </span>
      );
    }
    return (
      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
        Клієнт
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shrink-0">
              {getInitials(user.name || 'U')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-900 truncate">{user.name}</h2>
                {renderAccountBadge(user)}
              </div>
              <p className="text-xs text-slate-500 font-mono truncate">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Active Block Banner */}
          {user.status === 'suspended' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs">
              <div className="font-black text-rose-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  Обліковий запис заблоковано{' '}
                  {user.suspendedUntil
                    ? `до ${new Date(user.suspendedUntil).toLocaleDateString('uk-UA')}`
                    : 'безстроково'}
                </span>
              </div>
              {user.suspensionReason && (
                <p className="text-rose-800 leading-relaxed">
                  <strong>Причина:</strong> {user.suspensionReason}
                </p>
              )}
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                Дата реєстрації
              </span>
              <div className="text-xs font-bold text-slate-800">{user.createdAt}</div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Доступ до консолі
              </span>
              <div className="text-xs font-bold text-slate-800">
                {user.isPlatformStaff ? (
                  <span className="text-blue-700 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> {user.platformRoleName || 'BizX Staff'}
                  </span>
                ) : (
                  <span className="text-slate-600">Звичайний користувач</span>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Власні заклади
              </span>
              <div className="text-xs font-bold text-slate-800">
                {user.storesCount > 0 ? `${user.storesCount} шт.` : 'Немає'}
              </div>
            </div>
          </div>

          {/* Subscription Management Section */}
          <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Підписка та тарифний план
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {currentTierMeta.label} ({currentTierMeta.limit}) • Статус:{' '}
                    <strong className="text-slate-800">
                      {SUB_STATUS_OPTIONS.find((s) => s.value === user.subscriptionStatus)?.label ||
                        user.subscriptionStatus}
                    </strong>
                    {user.subscriptionExpiresAt && (
                      <>
                        {' '}
                        • до{' '}
                        <strong className="text-slate-800">
                          {new Date(user.subscriptionExpiresAt).toLocaleDateString('uk-UA')}
                        </strong>
                        {daysLeft !== null && ` (${daysLeft} дн.)`}
                      </>
                    )}
                  </p>
                </div>
              </div>

              {canManageSubscriptions && (
                <button
                  type="button"
                  onClick={() => setIsEditingSub((v) => !v)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-900 hover:text-white hover:border-slate-900 text-slate-800 text-[11px] font-bold transition-colors shrink-0"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{isEditingSub ? 'Згорнути' : 'Налаштувати'}</span>
                </button>
              )}
            </div>

            {!canManageSubscriptions && (
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Lock className="w-3 h-3 shrink-0" />
                <span>Лише перегляд: редагування підписок вимагає права керування підписками.</span>
              </div>
            )}

            {canManageSubscriptions && isEditingSub && (
              <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">Тарифний план</label>
                    <select
                      value={subTier}
                      onChange={(e) => {
                        const next = e.target.value as SubscriptionTier;
                        setSubTier(next);
                        if (next === 'free') {
                          setSubStatus('none');
                          setSubExpiresDate('');
                        } else if (subStatus === 'none') {
                          setSubStatus('active');
                        }
                      }}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:border-slate-900"
                    >
                      {TIER_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label} ({t.limit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">Статус підписки</label>
                    <select
                      value={subStatus}
                      onChange={(e) =>
                        setSubStatus(
                          e.target.value as 'none' | 'active' | 'expired' | 'cancelled'
                        )
                      }
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:border-slate-900"
                    >
                      {SUB_STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Дата закінчення підписки</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={subExpiresDate}
                      onChange={(e) => setSubExpiresDate(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800 focus:outline-none focus:border-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => addDaysPreset(7)}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700"
                    >
                      +7 дн.
                    </button>
                    <button
                      type="button"
                      onClick={() => addDaysPreset(30)}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700"
                    >
                      +30 дн.
                    </button>
                    <button
                      type="button"
                      onClick={() => addDaysPreset(90)}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700"
                    >
                      +90 дн.
                    </button>
                    <button
                      type="button"
                      onClick={() => addDaysPreset(365)}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700"
                    >
                      +1 рік
                    </button>
                    {subExpiresDate && (
                      <button
                        type="button"
                        onClick={() => setSubExpiresDate('')}
                        className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-[11px] font-bold text-rose-700"
                      >
                        Очистити
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Причина / коментар для користувача (необовʼязково)
                  </label>
                  <input
                    type="text"
                    value={subNote}
                    onChange={(e) => setSubNote(e.target.value)}
                    placeholder="Наприклад: Компенсація 14 днів через технічний збій оплати"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:bg-white focus:border-slate-900"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => openConfirm('subscription')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Застосувати зміни підписки</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Account Status Control */}
          {canEditStatus || canUnblock || canArchive ? (
            <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Керування статусом облікового запису
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Тимчасове або безстрокове блокування та архівація акаунту з підтвердженням
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={user.status === 'active' || !canActivateUser}
                  onClick={() => openConfirm('activate')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    user.status === 'active'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold ring-2 ring-emerald-400/20'
                      : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-slate-700'
                  } disabled:opacity-45 disabled:cursor-not-allowed`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1" />
                  <span className="text-xs font-bold">
                    {user.status === 'suspended' ? 'Розблокувати' : 'Активний'}
                  </span>
                  {!canActivateUser && user.status !== 'active' && (
                    <span className="text-[10px] text-slate-400 mt-0.5">Потрібне право</span>
                  )}
                </button>

                {canEditStatus && (
                  <button
                    type="button"
                    disabled={user.status === 'suspended'}
                    onClick={() => openConfirm('suspend')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      user.status === 'suspended'
                        ? 'border-rose-500 bg-rose-50 text-rose-800 font-bold ring-2 ring-rose-400/20'
                        : 'border-slate-200 hover:border-rose-400 hover:bg-rose-50/40 text-slate-700'
                    } disabled:opacity-45 disabled:cursor-not-allowed`}
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-500 mb-1" />
                    <span className="text-xs font-bold">Заблокувати</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">На час або назавжди</span>
                  </button>
                )}

                {canArchive && (
                  <button
                    type="button"
                    disabled={user.status === 'archived'}
                    onClick={() => openConfirm('archive')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      user.status === 'archived'
                        ? 'border-slate-400 bg-slate-100 text-slate-900 font-bold ring-2 ring-slate-300'
                        : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700'
                    } disabled:opacity-45 disabled:cursor-not-allowed`}
                  >
                    <Archive className="w-4 h-4 text-slate-500 mb-1" />
                    <span className="text-xs font-bold">Архівувати</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">В архів платформи</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50 text-[11px] text-slate-500">
              Режим перегляду: у вас немає прав на зміну статусу або архівацію користувачів.
            </div>
          )}

          <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/70 text-[11px] text-slate-600 leading-relaxed">
            Надання або зміна платформних ролей виконується через розділ{' '}
            <strong className="text-slate-900">«Команда BizX»</strong> з урахуванням ієрархії ролей.
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

      {/* Confirmation Sub-Modal */}
      {confirmType && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
          onClick={() => setConfirmType(null)}
        >
          <div
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {confirmType === 'activate' && 'Розблокування користувача'}
                  {confirmType === 'suspend' && 'Блокування користувача'}
                  {confirmType === 'archive' && 'Архівація облікового запису'}
                  {confirmType === 'subscription' && 'Підтвердження змін підписки'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setConfirmType(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteConfirm} className="p-5 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
                  {modalError}
                </div>
              )}

              {confirmType === 'activate' && (
                <p className="text-slate-700 leading-relaxed">
                  Ви підтверджуєте розблокування користувача <strong>{user.name}</strong> ({user.email})?
                  Доступ до всіх сервісів BizX буде відновлено, а користувачу надійде сповіщення.
                </p>
              )}

              {confirmType === 'archive' && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1.5 leading-relaxed">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Увага! Архівація акаунту</span>
                  </p>
                  <p>
                    Обліковий запис <strong>{user.name}</strong> буде архівовано, а всі активні сесії
                    розірвано. Відновити його зможе лише співробітник із правом розблокування користувачів.
                  </p>
                </div>
              )}

              {confirmType === 'suspend' && (
                <>
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1.5 leading-relaxed">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Увага перед блокуванням</span>
                    </p>
                    <p>
                      Достроково розблокувати користувача зможе{' '}
                      <strong>
                        лише співробітник BizX із окремим правом «Розблокування користувачів»
                      </strong>
                      . Усі активні сесії користувача буде завершено.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800 block">
                      Термін блокування:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {DURATION_PRESETS.map((opt) => {
                        const active = durationMode === 'preset' && selectedDays === opt.value;
                        return (
                          <button
                            key={String(opt.value)}
                            type="button"
                            onClick={() => {
                              setDurationMode('preset');
                              setSelectedDays(opt.value);
                            }}
                            className={`px-2.5 py-2 rounded-lg border text-xs font-semibold transition-all text-center ${
                              active
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setDurationMode('custom')}
                        className={`px-2.5 py-2 rounded-lg border text-xs font-semibold transition-all text-center ${
                          durationMode === 'custom'
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        Свій термін
                      </button>
                    </div>
                    {durationMode === 'custom' && (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="number"
                          min={1}
                          max={3650}
                          value={customDaysInput}
                          onChange={(e) => setCustomDaysInput(e.target.value)}
                          className="w-28 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900 font-bold"
                        />
                        <span className="text-xs text-slate-500">днів</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      Причина блокування (обовʼязково) *
                    </label>
                    <textarea
                      required
                      minLength={5}
                      rows={3}
                      value={reasonInput}
                      onChange={(e) => setReasonInput(e.target.value)}
                      placeholder="Опишіть причину блокування користувача..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900 resize-none"
                    />
                  </div>
                </>
              )}

              {confirmType === 'subscription' && (
                <div className="space-y-2 text-slate-700 leading-relaxed">
                  <p>
                    Оновити підписку користувача <strong>{user.name}</strong>?
                  </p>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div>
                      Тариф: <strong>{TIER_OPTIONS.find((t) => t.value === subTier)?.label}</strong>
                    </div>
                    <div>
                      Статус:{' '}
                      <strong>
                        {SUB_STATUS_OPTIONS.find((s) => s.value === subStatus)?.label}
                      </strong>
                    </div>
                    <div>
                      Діє до: <strong>{subExpiresDate || 'Не встановлено'}</strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Ліміт активних закладів користувача синхронізується автоматично, а в Пошту надійде офіційне сповіщення.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmType(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isBusy ? 'Збереження...' : 'Підтвердити'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
