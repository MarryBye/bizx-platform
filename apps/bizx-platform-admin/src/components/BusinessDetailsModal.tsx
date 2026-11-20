import React, { useEffect, useState } from 'react';
import { platformApi } from '../lib/api';
import type { Store, StoreStrikeItem } from '@bizx/common-types';
import {
  Modal,
  ConfirmModal,
  DurationPicker,
  StatusBadge,
  AlertBanner,
  Button
} from '@bizx/ui';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Star,
  Zap,
  RotateCcw,
  Eye,
  XCircle,
  Plus,
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
  const [selectedDays, setSelectedDays] = useState<number | null>(7);
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
  const canActivateCurrent = !canModerate
    ? false
    : business.status === 'suspended'
      ? isThreeStrikeLock
        ? canRevokeStrikes
        : canUnblock || canRevokeStrikes
      : business.status === 'archived'
        ? canUnblock || canArchive
        : business.status === 'draft' || business.status === 'closed'
          ? canApprove
          : false;

  const openDialog = (next: ConfirmDialogType) => {
    setConfirmDialog(next);
    setReasonInput('');
    setSelectedDays(7);
    setModalError(null);
  };

  const handleConfirmAction = async () => {
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
          suspensionDays: selectedDays,
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
          suspensionDays: willBeThird ? selectedDays : undefined
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

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <StatusBadge tone="emerald" dot>
            Активний
          </StatusBadge>
        );
      case 'pending':
        return (
          <StatusBadge tone="amber" icon={<Clock className="w-3 h-3" />}>
            На перевірці
          </StatusBadge>
        );
      case 'suspended':
        return (
          <StatusBadge tone="rose" dot>
            Призупинено
          </StatusBadge>
        );
      case 'archived':
        return (
          <StatusBadge tone="slate" icon={<Archive className="w-3 h-3" />}>
            В архіві
          </StatusBadge>
        );
      default:
        return (
          <StatusBadge tone="slate" dot>
            {status === 'draft' ? 'В розробці' : status}
          </StatusBadge>
        );
    }
  };

  const confirmMeta = (() => {
    if (!confirmDialog) return null;
    switch (confirmDialog.type) {
      case 'approve':
        return { title: 'Підтвердження публікації закладу', tone: 'success' as const };
      case 'reject':
        return { title: 'Відхилення заявки закладу', tone: 'danger' as const };
      case 'activate':
        return { title: 'Підтвердження активації закладу', tone: 'success' as const };
      case 'suspend':
        return { title: 'Призупинення роботи закладу', tone: 'warning' as const };
      case 'archive':
        return { title: 'Архівація закладу', tone: 'warning' as const };
      case 'issue_strike':
        return {
          title:
            activeStrikesCount >= 2
              ? 'Видача 3-го страйку та блокування'
              : `Видача страйку (${activeStrikesCount + 1}/3)`,
          tone: activeStrikesCount >= 2 ? ('danger' as const) : ('warning' as const)
        };
      case 'revoke_strike':
        return { title: 'Зняття страйку закладу', tone: 'default' as const };
    }
  })();

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="2xl"
        icon={<Building2 className="w-5 h-5" />}
        title={business.name}
        badge={renderStatusBadge(business.status)}
        subtitle={
          <span className="font-mono">
            {business.slug}.bizx.ua
            {typeof business.productsCount === 'number' && ` · Товарів: ${business.productsCount}`}
          </span>
        }
        footer={
          <>
            <div>
              {onPreviewStore && (
                <Button variant="neutral" onClick={() => onPreviewStore(business)}>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Переглянути вітрину</span>
                </Button>
              )}
            </div>
            <Button variant="primary" onClick={onClose}>
              Закрити
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Active Suspension Banner */}
          {business.status === 'suspended' && (
            <AlertBanner
              tone="danger"
              title={`Заклад призупинено ${
                business.suspendedUntil
                  ? `до ${new Date(business.suspendedUntil).toLocaleDateString('uk-UA')}`
                  : 'безстроково'
              }`}
            >
              {business.suspensionReason && (
                <p>
                  <strong>Причина:</strong> {business.suspensionReason}
                </p>
              )}
            </AlertBanner>
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
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800">
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  <span>{(business.ratingAvg ?? 0).toFixed(1)}</span>
                  <span className="text-slate-400 font-normal">({business.ratingCount ?? 0})</span>
                </span>
                <StatusBadge
                  tone={activeStrikesCount >= 2 ? 'rose' : 'slate'}
                  size="xs"
                  icon={<Zap className="w-2.5 h-2.5" />}
                >
                  {activeStrikesCount}/3
                </StatusBadge>
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
                  <Button
                    variant="primary"
                    size="lg"
                    className="flex-1"
                    disabled={isUpdating}
                    onClick={() => openDialog({ type: 'approve' })}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Підтвердити та опублікувати</span>
                  </Button>
                  <Button
                    variant="dangerOutline"
                    size="lg"
                    className="flex-1"
                    disabled={isUpdating}
                    onClick={() => openDialog({ type: 'reject' })}
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Відхилити з причиною</span>
                  </Button>
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
                  <button
                    type="button"
                    disabled={isUpdating || business.status === 'active' || !canActivateCurrent}
                    onClick={() => openDialog({ type: 'activate' })}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      business.status === 'active'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold ring-2 ring-emerald-400/20'
                        : 'border-slate-200 hover:border-slate-900 hover:bg-slate-50 text-slate-700'
                    } disabled:opacity-45 disabled:cursor-not-allowed`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-1" />
                    <span className="text-xs font-bold">
                      {business.status === 'suspended' ? 'Розблокувати' : 'Активувати'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {!canActivateCurrent && business.status !== 'active'
                        ? 'Потрібне право'
                        : 'Працює штатно'}
                    </span>
                  </button>

                  {canModerate && (
                    <button
                      type="button"
                      disabled={isUpdating || business.status === 'suspended'}
                      onClick={() => openDialog({ type: 'suspend' })}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        business.status === 'suspended'
                          ? 'border-rose-500 bg-rose-50 text-rose-800 font-bold ring-2 ring-rose-400/20'
                          : 'border-slate-200 hover:border-slate-900 hover:bg-slate-50 text-slate-700'
                      } disabled:opacity-45 disabled:cursor-not-allowed`}
                    >
                      <AlertTriangle className="w-5 h-5 text-rose-500 mb-1" />
                      <span className="text-xs font-bold">Призупинити</span>
                      <span className="text-[10px] text-slate-400">На час або назавжди</span>
                    </button>
                  )}

                  {canArchive && (
                    <button
                      type="button"
                      disabled={isUpdating || business.status === 'archived'}
                      onClick={() => openDialog({ type: 'archive' })}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        business.status === 'archived'
                          ? 'border-slate-400 bg-slate-100 text-slate-900 font-bold ring-2 ring-slate-300'
                          : 'border-slate-200 hover:border-slate-900 hover:bg-slate-50 text-slate-700'
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
                <Button
                  variant="neutral"
                  size="xs"
                  onClick={() => openDialog({ type: 'issue_strike' })}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Видати страйк</span>
                </Button>
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
                        <StatusBadge tone={st.isActive ? 'rose' : 'slate'} size="xs">
                          {st.isActive ? 'Активний' : 'Знято'}
                        </StatusBadge>
                        <span className="text-[10px] text-slate-400">
                          {new Date(st.createdAt).toLocaleDateString('uk-UA')}
                          {st.issuedByName ? ` • ${st.issuedByName}` : ''}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-800">{st.reason}</p>
                      {st.revokeReason && (
                        <p className="text-[11px] text-emerald-700">Знято: {st.revokeReason}</p>
                      )}
                    </div>

                    {st.isActive && canRevokeStrikes && (
                      <Button
                        variant="neutral"
                        size="xs"
                        onClick={() => openDialog({ type: 'revoke_strike', strike: st })}
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Зняти</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Unified Light-Header Nested Confirmation Modal */}
      {confirmDialog && confirmMeta && (
        <ConfirmModal
          isOpen={Boolean(confirmDialog)}
          onClose={() => setConfirmDialog(null)}
          onConfirm={handleConfirmAction}
          title={confirmMeta.title}
          tone={confirmMeta.tone}
          confirmLabel="Підтвердити дію"
          isLoading={isDialogBusy || isUpdating}
          error={modalError}
        >
          {confirmDialog.type === 'approve' && (
            <p className="text-slate-700 leading-relaxed">
              Ви підтверджуєте публікацію закладу <strong>«{business.name}»</strong>? Після
              підтвердження сторінка стане видимою покупцям, а власнику надійде лист у Пошту BizX.
            </p>
          )}

          {confirmDialog.type === 'activate' && (
            <p className="text-slate-700 leading-relaxed">
              Ви дійсно хочете активувати (розблокувати) заклад <strong>«{business.name}»</strong>?
              Поточні обмеження статусу буде знято.
            </p>
          )}

          {confirmDialog.type === 'archive' && (
            <AlertBanner tone="warning" title="Увага! Критична дія">
              Заклад <strong>«{business.name}»</strong> буде приховано з каталогу та переведено в
              архів. Відновити архівований заклад зможе лише співробітник із правом архівації або
              розблокування закладів.
            </AlertBanner>
          )}

          {confirmDialog.type === 'suspend' && (
            <>
              <AlertBanner tone="warning" title="Увага перед блокуванням">
                Достроково розблокувати заклад зможе{' '}
                <strong>лише співробітник BizX із окремим правом «Розблокування закладів»</strong>.
                Власник отримає лист із вашою причиною у Пошту BizX.
              </AlertBanner>
              <DurationPicker
                value={selectedDays}
                onChange={setSelectedDays}
                label="Термін блокування закладу:"
              />
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
            <div className="space-y-2">
              <p className="text-slate-600 leading-relaxed">
                Заклад повернеться в чернетку, а вказана нижче причина надійде власнику офіційним
                листом у Пошту BizX.
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
                <AlertBanner tone="danger" title="Увага: це буде 3-й страйк!">
                  Заклад <strong>«{business.name}»</strong> буде автоматично призупинено. Зняти
                  страйк і розблокувати його достроково зможе лише співробітник із правом «Зняття
                  страйків».
                </AlertBanner>
              )}
              {activeStrikesCount >= 2 && (
                <DurationPicker
                  value={selectedDays}
                  onChange={setSelectedDays}
                  label="Термін блокування закладу:"
                />
              )}
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
                Зняття страйку: <strong>«{confirmDialog.strike.reason}»</strong>. Якщо після зняття
                залишиться менше 3 активних страйків, блокування буде знято автоматично.
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
        </ConfirmModal>
      )}
    </>
  );
};
