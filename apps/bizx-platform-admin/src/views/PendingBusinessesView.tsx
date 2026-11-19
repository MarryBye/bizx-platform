import React, { useState, useMemo } from 'react';
import type { ExtendedBusiness } from './BusinessesView';
import { platformApi } from '../lib/api';
import {
  Clock,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Eye,
  SlidersHorizontal,
  MapPin,
  Phone,
  Mail,
  Package,
  User as UserIcon,
  ArrowUpDown,
  Lock,
  X,
  Send
} from 'lucide-react';

interface PendingBusinessesViewProps {
  businesses: ExtendedBusiness[];
  canApprove: boolean;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onSelectBusiness: (business: ExtendedBusiness) => void;
  onPreviewStore: (business: ExtendedBusiness) => Promise<void>;
  onApproveStore: (storeId: string) => Promise<void>;
  onRejectStore: (storeId: string, reason: string) => Promise<void>;
}

type PendingSortKey = 'oldest' | 'newest' | 'name_asc' | 'products_desc';

export const PendingBusinessesView: React.FC<PendingBusinessesViewProps> = ({
  businesses,
  canApprove,
  isLoading,
  onRefresh,
  onSelectBusiness,
  onPreviewStore,
  onApproveStore,
  onRejectStore
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<PendingSortKey>('oldest');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ExtendedBusiness | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const pendingList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = businesses.filter((b) => {
      if (b.status !== 'pending') return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        (b.ownerName && b.ownerName.toLowerCase().includes(q)) ||
        (b.ownerEmail && b.ownerEmail.toLowerCase().includes(q)) ||
        (b.categoryName && b.categoryName.toLowerCase().includes(q))
      );
    });

    return [...filtered].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (sortBy === 'oldest') return timeA - timeB;
      if (sortBy === 'newest') return timeB - timeA;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'uk');
      return (b.productsCount ?? 0) - (a.productsCount ?? 0);
    });
  }, [businesses, searchQuery, sortBy]);

  const handleApprove = async (b: ExtendedBusiness) => {
    setBusyId(b.id);
    try {
      await onApproveStore(b.id);
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    if (rejectReason.trim().length < 5) {
      setRejectError('Вкажіть зрозумілу причину відхилення (мінімум 5 символів)');
      return;
    }
    setBusyId(rejectTarget.id);
    setRejectError(null);
    try {
      await onRejectStore(rejectTarget.id, rejectReason.trim());
      setRejectTarget(null);
      setRejectReason('');
    } catch (err: any) {
      setRejectError(err?.data?.message || err?.message || 'Не вдалося відхилити заявку');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Черга модерації нових бізнесів</span>
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-0.5">
            Очікують підтвердження ({pendingList.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Перевірте заповненість сторінки у режимі попереднього перегляду перед публікацією в каталозі BizX
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Оновити чергу</span>
        </button>
      </div>

      {!canApprove && (
        <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
          <Lock className="w-4 h-4 text-slate-500 shrink-0" />
          <span>
            Режим перегляду: ви можете відкривати попередній перегляд вітрин, але підтвердження та відхилення заявок потребують відповідного права у вашій ролі.
          </span>
        </div>
      )}

      {/* Search & Sort Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Пошук заявки за назвою, категорією або власником..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900 transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as PendingSortKey)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-700"
          >
            <option value="oldest">Найстаріші заявки спочатку</option>
            <option value="newest">Найновіші заявки спочатку</option>
            <option value="name_asc">За назвою (А → Я)</option>
            <option value="products_desc">Більше товарів спочатку</option>
          </select>
        </div>
      </div>

      {/* Pending Applications List */}
      {pendingList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-slate-900">Черга модерації порожня</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Наразі немає жодного нового бізнесу, що очікує підтвердження. Щойно власник надішле заявку, вона автоматично зʼявиться тут.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingList.map((b) => {
            const isBusy = busyId === b.id;
            const logoSrc = b.logoUrl ? platformApi.storage.resolveMediaUrl(b.logoUrl) : null;
            const productsCount = b.productsCount ?? 0;
            const hasDesc = Boolean(b.description && b.description.trim().length >= 10);
            const hasContacts = Boolean(b.phone || b.email);

            return (
              <div
                key={b.id}
                className="bg-white border border-amber-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Left: Identity & Readiness */}
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className="w-14 h-14 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm shrink-0 overflow-hidden border border-slate-200">
                      {logoSrc ? (
                        <img src={logoSrc} alt={b.name} className="w-full h-full object-cover" />
                      ) : (
                        b.name.slice(0, 2).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center flex-wrap gap-2">
                        <h2 className="text-base font-black text-slate-900">{b.name}</h2>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" />
                          <span>Очікує підтвердження</span>
                        </span>
                        {b.categoryName && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {b.categoryName}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 font-mono">
                        {b.slug}.bizx.ua • Подано:{' '}
                        {b.createdAt
                          ? new Date(b.createdAt).toLocaleString('uk-UA', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '—'}
                      </div>

                      {b.description ? (
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                          {b.description}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-700 italic">Опис закладу не заповнено</p>
                      )}

                      {/* Quick Readiness & Contact Metadata */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[11px] text-slate-600">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                          <span>{b.ownerName || 'Власник'}</span>
                        </span>
                        {b.ownerEmail && (
                          <span className="inline-flex items-center gap-1 font-mono text-slate-500">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{b.ownerEmail}</span>
                          </span>
                        )}
                        {(b.phone || b.ownerPhone) && (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{b.phone || b.ownerPhone}</span>
                          </span>
                        )}
                        {b.address && (
                          <span className="inline-flex items-center gap-1 text-slate-500">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{b.address}</span>
                          </span>
                        )}
                      </div>

                      {/* Readiness Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                            productsCount > 0
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <Package className="w-3 h-3" />
                          <span>Товарів у каталозі: {productsCount}</span>
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            hasDesc
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {hasDesc ? '✓ Опис заповнено' : '✕ Без опису'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            hasContacts
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {hasContacts ? '✓ Контакти вказано' : '✕ Без контактів'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Action Buttons */}
                  <div className="flex flex-wrap lg:flex-col items-stretch gap-2 shrink-0 lg:w-52">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => onPreviewStore(b)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Переглянути вітрину</span>
                    </button>

                    {canApprove && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleApprove(b)}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Підтвердити</span>
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            setRejectTarget(b);
                            setRejectReason('');
                            setRejectError(null);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-600 border border-rose-200 text-rose-700 hover:text-white font-bold text-xs transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Відхилити</span>
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectBusiness(b)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-900 hover:text-white text-slate-700 font-bold text-xs transition-all"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Деталі заявки</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setRejectTarget(null)}
        >
          <div
            className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 bg-rose-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-rose-950">
                  Відхилення заявки «{rejectTarget.name}»
                </h3>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  Причина відмови буде автоматично надіслана власнику в особисту Пошту BizX
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="p-5 space-y-4">
              {rejectError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 font-medium">
                  {rejectError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Причина відхилення (обовʼязково) *
                </label>
                <textarea
                  required
                  minLength={5}
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Наприклад: Будь ласка, додайте логотип закладу, детальний опис та щонайменше 3 товари з фотографіями, після чого надішліть заявку повторно."
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-slate-900 resize-none leading-relaxed"
                />
                <p className="text-[11px] text-slate-400">
                  Заклад повернеться у статус чернетки. Власник отримає офіційний лист від BizX без можливості відповіді.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectTarget(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={busyId === rejectTarget.id || rejectReason.trim().length < 5}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Відхилити та надіслати лист</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
