import React, { useEffect, useState } from 'react';
import { platformApi } from '../lib/api';
import type { Store, StoreStrikeItem } from '@bizx/common-types';
import {
  X,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Star,
  Zap,
  RotateCcw,
  Eye,
  XCircle,
  Send,
  Plus,
  ShieldAlert,
  Clock,
  Lock
} from 'lucide-react';

export interface BusinessStatusUpdatePayload {
  status: 'active' | 'pending' | 'suspended' | 'archived';
  suspensionDays?: number | null;
  suspensionReason?: string | null;
}

interface BusinessDetailsModalProps {
  business: (Store & {
    categoryName?: string;
    ownerName?: string;
    ownerEmail?: string;
    ownerPhone?: string | null;
    productsCount?: number;
  }) | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, payload: BusinessStatusUpdatePayload) => Promise<void>;
  onApproveStore?: (id: string) => Promise<void>;
  onRejectStore?: (id: string, reason: string) => Promise<void>;
  onPreviewStore?: (
    business: Store & { categoryName?: string; ownerName?: string; ownerEmail?: string }
  ) => Promise<void>;
  isUpdating: boolean;
  canModerate?: boolean;
  canApprove?: boolean;
  canUnblock?: boolean;
  canArchive?: boolean;
  canIssueStrikes?: boolean;
  canRevokeStrikes?: boolean;
  onRefresh?: () => Promise<void>;
}

const DURATION_PRESETS: Array<{ value: number | null; label: string }> = [
  { value: 3, label: '3 дні' },
  { value: 7, label: '7 днів' },
  { value: 14, label: '14 днів' },
  { value: 30, label: '30 днів' },
  { value: 90, label: '90 днів' },
  { value: null, label: 'Назавжди (до ручного зняття)' }
];

type ConfirmDialogType =
  | null
  | { type: 'approve' }
  | { type: 'reject' }
  | { type: 'activate' }
  | { type: 'suspend' }
  | { type: 'archive' }
  | { type: 'issue_strike' }
  | { type: 'revoke_strike'; strike: StoreStrikeItem };

export const BusinessDetailsModal: React.FC<BusinessDetailsModalProps> = ({
  business,
  isOpen,
  onClose,
  onUpdateStatus,
  onApproveStore,
  onRejectStore,
  onPreviewStore,
  isUpdating,
  canModerate = false,
  canApprove = false,
  canUnblock = false,
  canArchive = false,
  canIssueStrikes = false,
  canRevokeStrikes = false,
  onRefresh
}) => {
  const [strikes, setStrikes] = useState<StoreStrikeItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogType>(null);
  const [reasonInput, setReasonInput] = useState('');
  const [durationMode, setDurationMode] = useState<'preset' | 'custom'>('preset');
  const [selectedDays, setSelectedDays] = useState<number | null>(7);
  const [customDaysInput, setCustomDaysInput] = useState('10');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isDialogBusy, setIsDialogBusy] = useState(false);

  const loadStrikes = async (storeId: string) => {
    try {
      const res = await platformApi.orders.getStoreStrikes(storeId);
      if (res.success && res.data) setStrikes(res.data);
    } catch {
      setStrikes([]);
    }
  };

  useEffect(() => {
    if (!isOpen || !business?.id) {
      setStrikes([]);
      setConfirmDialog(null);
      setModalError(null);
      return;
    }
    void loadStrikes(business.id);
  }, [isOpen, business?.id]);

  if (!isOpen || !business) return null;

  const activeStrikesCount = strikes.filter((s) => s.isActive).length;
  const isThreeStrikeLock = business.status === 'suspended' && activeStrikesCount >= 3;
  const canActivateCurrent =
    business.status === 'suspended'
      ? isThreeStrikeLock
        ? canRevokeStrikes
        : canUnblock || canRevokeStrikes
      : business.status === 'archived'
      ? canUnblock || canArchive
      : canModerate;

  const resolveChosenDays = (): number | null => {
    if (durationMode === 'custom') {
      const parsed = parseInt(customDaysInput, 10);
      return Number.isFinite(parsed) && parsed >= 1 ? Math.min(3650, parsed) : 7;
    }
    return selectedDays;
  };

  const openDialog = (next: ConfirmDialogType) => {
    setConfirmDialog(next);
    setReasonInput('');
    setDurationMode('preset');
    setSelectedDays(7);
    setCustomDaysInput('10');
    setModalError(null);
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmDialog || !business) return;
    setModalError(null);
    setIsDialogBusy(true);

    try {
      if (confirmDialog.type === 'approve') {
        await onApproveStore?.(business.id);
      } else if (confirmDialog.type === 'reject') {
        if (reasonInput.trim().length < 5) {
          setModalError('Вкажіть причину відхилення (мінімум 5 символів)');
          return;
        }
        await onRejectStore?.(business.id, reasonInput.trim());
      } else if (confirmDialog.type === 'activate') {
        await onUpdateStatus(business.id, { status: 'active' });
      } else if (confirmDialog.type === 'suspend') {
        if (reasonInput.trim().length < 5) {
          setModalError('Вкажіть причину призупинення закладу (мінімум 5 символів)');
          return;
        }
        await onUpdateStatus(business.id, {
          status: 'suspended',
          suspensionDays: resolveChosenDays(),
          suspensionReason: reasonInput.trim()
        });
      } else if (confirmDialog.type === 'archive') {
        await onUpdateStatus(business.id, { status: 'archived' });
      } else if (confirmDialog.type === 'issue_strike') {
        if (reasonInput.trim().length < 5) {
          setModalError('Вкажіть причину видачі страйку (мінімум 5 символів)');
          return;
        }
        const willBeThird = activeStrikesCount >= 2;
        const res = await platformApi.orders.issueStoreStrike(business.id, {
          reason: reasonInput.trim(),
          suspensionDays: willBeThird ? resolveChosenDays() : undefined
        });
        if (!res.success) {
          setModalError(res.error || 'Не вдалося видати страйк');
          return;
        }
        await loadStrikes(business.id);
        await onRefresh?.();
      } else if (confirmDialog.type === 'revoke_strike') {
        if (reasonInput.trim().length < 3) {
          setModalError('Вкажіть причину зняття страйку (мінімум 3 символи)');
          return;
        }
        const res = await platformApi.orders.revokeStrike(confirmDialog.strike.id, {
          revokeReason: reasonInput.trim(),
          liftSuspension: true
        });
        if (!res.success) {
          setModalError(res.error || 'Не вдалося зняти страйк');
          return;
        }
        await loadStrikes(business.id);
        await onRefresh?.();
      }

      setConfirmDialog(null);
      setReasonInput('');
    } catch (err: any) {
      setModalError(err?.data?.message || err?.message || 'Помилка виконання дії');
    } finally {
      setIsDialogBusy(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Активний</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5" />
            <span>На перевірці</span>
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Призупинено</span>
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
            <Archive className="w-3.5 h-3.5" />
            <span>В архіві</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 whitespace-nowrap">
            {status === 'draft' ? 'В розробці' : status}
          </span>
        );
    }
  };

  const renderDurationPicker = () => (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-800 block">
        Термін блокування закладу:
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
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-slate-900 truncate">{business.name}</h2>
                {getStatusBadge(business.status)}
              </div>
              <p className="text-xs text-slate-500 font-mono truncate">
                {business.slug}.bizx.ua
                {typeof business.productsCount === 'number' && ` · Товарів: ${business.productsCount}`}
              </p>
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
          {/* Active Suspension Banner */}
          {business.status === 'suspended' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs">
              <div className="font-black text-rose-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  Заклад призупинено{' '}
                  {business.suspendedUntil
                    ? `до ${new Date(business.suspendedUntil).toLocaleDateString('uk-UA')}`
                    : 'безстроково'}
                </span>
              </div>
              {business.suspensionReason && (
                <p className="text-rose-800 leading-relaxed">
                  <strong>Причина:</strong> {business.suspensionReason}
                </p>
              )}
            </div>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Категорія та адреса
              </span>
              <div className="text-xs font-bold text-slate-800 truncate">
                {business.categoryName || 'Роздрібна торгівля'}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {business.address || 'Адресу не вказано'}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Власник та контакти
              </span>
              <div className="text-xs font-bold text-slate-800 truncate">
                {business.ownerName || 'Партнер BizX'}
              </div>
              <div className="text-[11px] text-slate-500 font-mono truncate">
                {business.ownerEmail || business.email || '—'}
                {(business.phone || business.ownerPhone) &&
                  ` · ${business.phone || business.ownerPhone}`}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Рейтинг та страйки
              </span>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-800">
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  <span>{(business.ratingAvg ?? 0).toFixed(1)}</span>
                  <span className="text-slate-400 font-normal">({business.ratingCount ?? 0})</span>
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] border ${
                    activeStrikesCount >= 2
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>{activeStrikesCount}/3</span>
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Дата реєстрації
              </span>
              <div className="text-xs font-bold text-slate-800">
                {business.createdAt
                  ? new Date(business.createdAt).toLocaleString('uk-UA', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })
                  : '—'}
              </div>
            </div>
          </div>

          {/* Description */}
          {business.description && (
            <div className="p-3.5 bg-slate-50/60 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Опис закладу
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">{business.description}</p>
            </div>
          )}

          {/* Pending Application Approval / Rejection Section */}
          {business.status === 'pending' && (
            <div className="p-4 border border-amber-200 rounded-xl bg-amber-50/50 space-y-3">
              <div>
                <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                  Рішення по заявці нового закладу
                </h3>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Перед підтвердженням перевірте заповненість сторінки через попередній перегляд вітрини.
                </p>
              </div>

              {canApprove ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => openDialog({ type: 'approve' })}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Підтвердити та опублікувати</span>
                  </button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => openDialog({ type: 'reject' })}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-white border border-rose-300 hover:bg-rose-600 text-rose-700 hover:text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Відхилити з причиною</span>
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-amber-900 bg-white/70 border border-amber-200 rounded-lg p-2.5 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>У вашій ролі немає права підтвердження або відхилення нових бізнесів.</span>
                </div>
              )}
            </div>
          )}

          {/* Status Actions Group (Non-Pending) */}
          {business.status !== 'pending' && (
            <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Керування статусом закладу
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Усі зміни статусу вимагають підтвердження; призупинення — обовʼязкової причини та терміну
                </p>
              </div>

              {canModerate || canArchive || canUnblock || canRevokeStrikes ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Activate / Unblock */}
                  <button
                    type="button"
                    disabled={isUpdating || business.status === 'active' || !canActivateCurrent}
                    onClick={() => openDialog({ type: 'activate' })}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      business.status === 'active'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold ring-2 ring-emerald-400/20'
                        : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-slate-700'
                    } disabled:opacity-45 disabled:cursor-not-allowed`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-1" />
                    <span className="text-xs font-bold">
                      {business.status === 'suspended' ? 'Розблокувати' : 'Активувати'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {!canActivateCurrent && business.status === 'suspended'
                        ? 'Потрібне право розблокування'
                        : 'Працює штатно'}
                    </span>
                  </button>

                  {/* Suspend */}
                  {canModerate && (
                    <button
                      type="button"
                      disabled={isUpdating || business.status === 'suspended'}
                      onClick={() => openDialog({ type: 'suspend' })}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                        business.status === 'suspended'
                          ? 'border-rose-500 bg-rose-50 text-rose-800 font-bold ring-2 ring-rose-400/20'
                          : 'border-slate-200 hover:border-rose-400 hover:bg-rose-50/40 text-slate-700'
                      } disabled:opacity-45 disabled:cursor-not-allowed`}
                    >
                      <AlertTriangle className="w-5 h-5 text-rose-500 mb-1" />
                      <span className="text-xs font-bold">Призупинити</span>
                      <span className="text-[10px] text-slate-400">На час або назавжди</span>
                    </button>
                  )}

                  {/* Archive */}
                  {canArchive && (
                    <button
                      type="button"
                      disabled={isUpdating || business.status === 'archived'}
                      onClick={() => openDialog({ type: 'archive' })}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                        business.status === 'archived'
                          ? 'border-slate-400 bg-slate-100 text-slate-900 font-bold ring-2 ring-slate-300'
                          : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700'
                      } disabled:opacity-45 disabled:cursor-not-allowed`}
                    >
                      <Archive className="w-5 h-5 text-slate-500 mb-1" />
                      <span className="text-xs font-bold">Архівувати</span>
                      <span className="text-[10px] text-slate-400">Приховати в архів</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>У вас немає прав на зміну статусу або архівацію закладу.</span>
                </div>
              )}
            </div>
          )}

          {/* Strikes Management Section */}
          <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Страйки закладу ({activeStrikesCount}/3 активних)</span>
              </div>

              {canIssueStrikes && (
                <button
                  type="button"
                  onClick={() => openDialog({ type: 'issue_strike' })}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-900 hover:text-white hover:border-slate-900 text-slate-800 text-[11px] font-bold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Видати страйк</span>
                </button>
              )}
            </div>

            {strikes.length === 0 ? (
              <p className="text-xs text-slate-400">У цього закладу немає жодного страйку.</p>
            ) : (
              <div className="space-y-2">
                {strikes.map((st) => (
                  <div
                    key={st.id}
                    className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                      st.isActive
                        ? 'bg-rose-50/50 border-rose-200'
                        : 'bg-slate-50 border-slate-200 opacity-75'
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            st.isActive
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {st.isActive ? 'Активний' : 'Знято'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(st.createdAt).toLocaleDateString('uk-UA')}
                          {st.issuedByName ? ` • ${st.issuedByName}` : ''}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800">{st.reason}</p>
                      {st.revokeReason && (
                        <p className="text-[11px] text-emerald-700">
                          Знято: {st.revokeReason}
                        </p>
                      )}
                    </div>

                    {st.isActive && canRevokeStrikes && (
                      <button
                        type="button"
                        onClick={() => openDialog({ type: 'revoke_strike', strike: st })}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-900 hover:text-white text-[11px] font-bold text-slate-700 transition-colors shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Зняти</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Clean Footer (No broken Business Panel link) */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <div>
            {onPreviewStore && (
              <button
                type="button"
                onClick={() => onPreviewStore(business)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Переглянути вітрину</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Закрити
          </button>
        </div>
      </div>

      {/* Sub-Confirmation Modal (for every status change & strike operation) */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm"
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-black flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {confirmDialog.type === 'approve' && 'Підтвердження публікації закладу'}
                  {confirmDialog.type === 'reject' && 'Відхилення заявки закладу'}
                  {confirmDialog.type === 'activate' && 'Підтвердження активації закладу'}
                  {confirmDialog.type === 'suspend' && 'Призупинення роботи закладу'}
                  {confirmDialog.type === 'archive' && 'Архівація закладу'}
                  {confirmDialog.type === 'issue_strike' &&
                    (activeStrikesCount >= 2
                      ? 'Видача 3-го страйку та блокування'
                      : `Видача страйку (${activeStrikesCount + 1}/3)`)}
                  {confirmDialog.type === 'revoke_strike' && 'Зняття страйку закладу'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAction} className="p-5 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 font-medium">
                  {modalError}
                </div>
              )}

              {confirmDialog.type === 'approve' && (
                <p className="text-slate-700 leading-relaxed">
                  Ви підтверджуєте публікацію закладу <strong>«{business.name}»</strong>? Після
                  підтвердження сторінка стане видимою покупцям, а власнику надійде лист у Пошту BizX.
                </p>
              )}

              {confirmDialog.type === 'activate' && (
                <p className="text-slate-700 leading-relaxed">
                  Ви дійсно хочете активувати (розблокувати) заклад{' '}
                  <strong>«{business.name}»</strong>? Поточні обмеження статусу буде знято.
                </p>
              )}

              {confirmDialog.type === 'archive' && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1.5 leading-relaxed">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Увага! Критична дія</span>
                  </p>
                  <p>
                    Заклад <strong>«{business.name}»</strong> буде приховано з каталогу та
                    переведено в архів. Відновити архівований заклад зможе лише співробітник із
                    правом архівації або розблокування закладів.
                  </p>
                </div>
              )}

              {confirmDialog.type === 'suspend' && (
                <>
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1.5 leading-relaxed">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Увага перед блокуванням</span>
                    </p>
                    <p>
                      Достроково розблокувати заклад зможе{' '}
                      <strong>
                        лише співробітник BizX із окремим правом «Розблокування закладів»
                      </strong>
                      . Власник отримає лист із вашою причиною у Пошту BizX.
                    </p>
                  </div>
                  {renderDurationPicker()}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      Причина призупинення (обовʼязково) *
                    </label>
                    <textarea
                      required
                      minLength={5}
                      rows={3}
                      value={reasonInput}
                      onChange={(e) => setReasonInput(e.target.value)}
                      placeholder="Детально опишіть причину блокування..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900 resize-none"
                    />
                  </div>
                </>
              )}

              {confirmDialog.type === 'reject' && (
                <div className="space-y-1.5">
                  <p className="text-slate-600 leading-relaxed mb-2">
                    Заклад повернеться в чернетку, а вказана нижче причина надійде власнику офіційним листом у Пошту BizX.
                  </p>
                  <label className="text-xs font-bold text-slate-800 block">
                    Причина відхилення (обовʼязково) *
                  </label>
                  <textarea
                    required
                    minLength={5}
                    rows={4}
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    placeholder="Наприклад: додайте логотип, опис та щонайменше 3 активні товари..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900 resize-none"
                  />
                </div>
              )}

              {confirmDialog.type === 'issue_strike' && (
                <>
                  {activeStrikesCount >= 2 && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 space-y-1.5 leading-relaxed">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Увага: це буде 3-й страйк!</span>
                      </p>
                      <p>
                        Заклад <strong>«{business.name}»</strong> буде автоматично призупинено.
                        Зняти страйк і розблокувати його достроково зможе лише співробітник із
                        правом «Зняття страйків».
                      </p>
                    </div>
                  )}
                  {activeStrikesCount >= 2 && renderDurationPicker()}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 block">
                      Причина видачі страйку (обовʼязково) *
                    </label>
                    <textarea
                      required
                      minLength={5}
                      rows={3}
                      value={reasonInput}
                      onChange={(e) => setReasonInput(e.target.value)}
                      placeholder="Вкажіть порушення або підставу для видачі страйку..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900 resize-none"
                    />
                  </div>
                </>
              )}

              {confirmDialog.type === 'revoke_strike' && (
                <div className="space-y-2">
                  <p className="text-slate-600 leading-relaxed">
                    Зняття страйку: <strong>«{confirmDialog.strike.reason}»</strong>. Якщо після
                    зняття залишиться менше 3 активних страйків, блокування буде знято автоматично.
                  </p>
                  <label className="text-xs font-bold text-slate-800 block">
                    Причина зняття страйку (обовʼязково) *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    placeholder="Наприклад: Апеляцію задоволено / помилковий страйк..."
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={isDialogBusy || isUpdating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isDialogBusy || isUpdating ? 'Збереження...' : 'Підтвердити дію'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
