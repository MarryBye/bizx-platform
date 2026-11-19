import React, { useState, useMemo } from 'react';
import type { Store } from '@bizx/common-types';
import { platformApi } from '../lib/api';
import {
  Building2,
  Search,
  Archive,
  SlidersHorizontal,
  RefreshCw,
  ArrowUpDown,
  Star,
  Zap,
  Eye,
  Clock,
  ArrowRight
} from 'lucide-react';

export type ExtendedBusiness = Store & {
  categoryName?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string | null;
  productsCount?: number;
  activeStrikesCount?: number;
  ordersCount?: number;
  totalGmv?: number;
};

type BusinessSortKey =
  | 'newest'
  | 'oldest'
  | 'name_asc'
  | 'name_desc'
  | 'rating_desc'
  | 'strikes_desc'
  | 'status';

interface BusinessesViewProps {
  businesses: ExtendedBusiness[];
  categories: Array<{ id: string; name: string }>;
  onSelectBusiness: (business: ExtendedBusiness) => void;
  onPreviewStore?: (business: ExtendedBusiness) => Promise<void>;
  onOpenPendingQueue?: () => void;
  onRefresh: () => Promise<void>;
  isLoading: boolean;
}

const STATUS_SORT_ORDER: Record<string, number> = {
  pending: 0,
  suspended: 1,
  active: 2,
  draft: 3,
  archived: 4
};

export const BusinessesView: React.FC<BusinessesViewProps> = ({
  businesses,
  categories,
  onSelectBusiness,
  onPreviewStore,
  onOpenPendingQueue,
  onRefresh,
  isLoading
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<BusinessSortKey>('newest');

  const pendingCount = useMemo(
    () => businesses.filter((b) => b.status === 'pending').length,
    [businesses]
  );

  const filteredBusinesses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = businesses.filter((b) => {
      const matchesSearch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        (b.address && b.address.toLowerCase().includes(q)) ||
        (b.ownerName && b.ownerName.toLowerCase().includes(q)) ||
        (b.ownerEmail && b.ownerEmail.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || b.categoryId === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    return [...list].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      switch (sortBy) {
        case 'oldest':
          return timeA - timeB;
        case 'name_asc':
          return a.name.localeCompare(b.name, 'uk');
        case 'name_desc':
          return b.name.localeCompare(a.name, 'uk');
        case 'rating_desc':
          return (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0);
        case 'strikes_desc':
          return (b.activeStrikesCount ?? 0) - (a.activeStrikesCount ?? 0);
        case 'status':
          return (STATUS_SORT_ORDER[a.status] ?? 9) - (STATUS_SORT_ORDER[b.status] ?? 9);
        case 'newest':
        default:
          return timeB - timeA;
      }
    });
  }, [businesses, searchQuery, statusFilter, categoryFilter, sortBy]);

  const getStatusBadge = (b: ExtendedBusiness) => {
    switch (b.status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
            <span>В розробці</span>
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Активний</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>На перевірці</span>
          </span>
        );
      case 'suspended':
        return (
          <div className="inline-flex flex-col items-start gap-0.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>Призупинено</span>
            </span>
            <span className="text-[10px] text-rose-600/80 font-medium pl-1 whitespace-nowrap">
              {b.suspendedUntil
                ? `до ${new Date(b.suspendedUntil).toLocaleDateString('uk-UA')}`
                : 'безстроково'}
            </span>
          </div>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">
            <Archive className="w-3 h-3 shrink-0" />
            <span>В архіві</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">
            {b.status}
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
            База торгових партнерів
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-0.5">
            Усі бізнеси платформи
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Повний реєстр закладів із фільтрацією, сортуванням, рейтингом та контролем статусу
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Оновити дані</span>
        </button>
      </div>

      {/* Pending shortcut banner */}
      {pendingCount > 0 && onOpenPendingQueue && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-amber-900 font-semibold">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {pendingCount === 1
                ? '1 новий заклад очікує на підтвердження модератором'
                : `${pendingCount} нових закладів очікують на підтвердження модератором`}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenPendingQueue}
            className="inline-flex items-center gap-1 text-xs font-black text-amber-900 hover:underline self-start sm:self-auto"
          >
            <span>Відкрити чергу підтвердження</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter, Sort & Search Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col lg:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Пошук за назвою закладу, адресою або власником..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900 transition-all font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-700"
          >
            <option value="all">Всі статуси</option>
            <option value="active">Активні</option>
            <option value="pending">На перевірці</option>
            <option value="draft">В розробці (чернетки)</option>
            <option value="suspended">Призупинені</option>
            <option value="archived">В архіві</option>
          </select>

          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-700 max-w-[165px] truncate"
            >
              <option value="all">Всі категорії</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as BusinessSortKey)}
              className="text-xs font-semibold bg-transparent focus:outline-none text-slate-700"
            >
              <option value="newest">Спочатку новіші</option>
              <option value="oldest">Спочатку старіші</option>
              <option value="name_asc">Назва: А → Я</option>
              <option value="name_desc">Назва: Я → А</option>
              <option value="rating_desc">Найвищий рейтинг</option>
              <option value="strikes_desc">Найбільше страйків</option>
              <option value="status">За статусом</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table with Stable Column Widths (prevents badge shifting on status change) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs table-fixed min-w-[880px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-[25%]">Торгова точка</th>
                <th className="py-3 px-4 w-[14%]">Категорія</th>
                <th className="py-3 px-4 w-[17%]">Власник</th>
                <th className="py-3 px-4 w-[11%]">Рейтинг</th>
                <th className="py-3 px-4 w-[13%]">Статус</th>
                <th className="py-3 px-4 w-[9%]">Дата</th>
                <th className="py-3 px-4 w-[11%] text-right">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <div className="font-semibold text-xs">Закладів не знайдено</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Спробуйте змінити пошуковий запит або параметри фільтрації
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBusinesses.map((b) => {
                  const logoSrc = b.logoUrl ? platformApi.storage.resolveMediaUrl(b.logoUrl) : null;
                  const strikes = b.activeStrikesCount ?? 0;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Store Title */}
                      <td className="py-3.5 px-4 font-medium align-middle">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm overflow-hidden">
                            {logoSrc ? (
                              <img
                                src={logoSrc}
                                alt={b.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              b.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-black text-slate-900 text-xs truncate">{b.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              /{b.slug}
                              {typeof b.productsCount === 'number' && ` · ${b.productsCount} тов.`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium align-middle">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] truncate max-w-full">
                          {b.categoryName || 'Торгівля'}
                        </span>
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="text-slate-900 font-semibold text-xs truncate">
                          {b.ownerName || 'Партнер BizX'}
                        </div>
                        {b.ownerEmail && (
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {b.ownerEmail}
                          </div>
                        )}
                      </td>

                      {/* Rating & Strikes */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                            <span>{(b.ratingAvg ?? 0).toFixed(1)}</span>
                          </span>
                          {strikes > 0 && (
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${
                                strikes >= 2
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              <Zap className="w-2.5 h-2.5 shrink-0" />
                              <span>{strikes}/3</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        {getStatusBadge(b)}
                      </td>

                      {/* Created At */}
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] align-middle whitespace-nowrap">
                        {b.createdAt ? new Date(b.createdAt).toLocaleDateString('uk-UA') : '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right align-middle whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {onPreviewStore && (
                            <button
                              type="button"
                              title="Попередній перегляд вітрини"
                              onClick={() => onPreviewStore(b)}
                              className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-600 hover:text-blue-700 transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Керування закладом"
                            onClick={() => onSelectBusiness(b)}
                            className="inline-flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-900 hover:text-white hover:border-slate-900 text-slate-700 transition-all shadow-2xs"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between px-4">
          <div>
            Показано закладів: {filteredBusinesses.length} з {businesses.length}
          </div>
          <div>● Доступ лише для команди BizX</div>
        </div>
      </div>
    </div>
  );
};
