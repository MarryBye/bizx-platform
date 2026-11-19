import React, { useState, useMemo } from 'react';
import type { ExtendedBusiness } from './BusinessesView';
import { platformApi } from '../lib/api';
import {
  Clock,
  Search,
  RefreshCw,
  CheckCircle2,
  Eye,
  ArrowUpDown,
  Package,
  Lock
} from 'lucide-react';

interface PendingBusinessesViewProps {
  businesses: ExtendedBusiness[];
  canApprove: boolean;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onSelectBusiness: (business: ExtendedBusiness) => void;
}

type PendingSortKey = 'oldest' | 'newest' | 'name_asc' | 'products_desc';

export const PendingBusinessesView: React.FC<PendingBusinessesViewProps> = ({
  businesses,
  canApprove,
  isLoading,
  onRefresh,
  onSelectBusiness
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<PendingSortKey>('oldest');

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Черга модерації</span>
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-0.5">
            Очікують підтвердження ({pendingList.length})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Натисніть на заявку, щоб відкрити деталі, переглянути вітрину та прийняти рішення
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Оновити</span>
        </button>
      </div>

      {!canApprove && (
        <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
          <Lock className="w-4 h-4 text-slate-500 shrink-0" />
          <span>
            Режим перегляду: ви можете відкривати деталі та превʼю вітрин, але підтвердження чи відхилення потребує права у ролі.
          </span>
        </div>
      )}

      {/* Search & Sort Bar */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Пошук за назвою, категорією або власником..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900 transition-all font-medium"
          />
        </div>

        <div className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 w-full md:w-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as PendingSortKey)}
            className="text-xs font-semibold bg-transparent focus:outline-none text-slate-700 flex-1"
          >
            <option value="oldest">Спочатку найстаріші</option>
            <option value="newest">Спочатку найновіші</option>
            <option value="name_asc">Назва: А → Я</option>
            <option value="products_desc">Більше товарів</option>
          </select>
        </div>
      </div>

      {/* Compact Applications List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {pendingList.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black text-slate-900">Черга модерації порожня</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Наразі немає закладів, що очікують підтвердження. Нові заявки автоматично зʼявляться тут.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingList.map((b) => {
              const logoSrc = b.logoUrl ? platformApi.storage.resolveMediaUrl(b.logoUrl) : null;
              const productsCount = b.productsCount ?? 0;

              return (
                <div
                  key={b.id}
                  className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                >
                  {/* Left: Compact Identity */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0 overflow-hidden border border-slate-200">
                      {logoSrc ? (
                        <img src={logoSrc} alt={b.name} className="w-full h-full object-cover" />
                      ) : (
                        b.name.slice(0, 2).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900 truncate">{b.name}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>На перевірці</span>
                        </span>
                        {b.categoryName && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold whitespace-nowrap">
                            {b.categoryName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                        <span className="font-semibold text-slate-700 truncate max-w-[180px]">
                          {b.ownerName || b.ownerEmail || 'Власник'}
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-slate-400">/{b.slug}</span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          <Package className="w-3 h-3 text-slate-400" />
                          <span>{productsCount} тов.</span>
                        </span>
                        <span>•</span>
                        <span className="whitespace-nowrap">
                          {b.createdAt
                            ? new Date(b.createdAt).toLocaleDateString('uk-UA', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              })
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Single Clean Details Button with comfortable spacing */}
                  <div className="flex items-center justify-end shrink-0 pl-2">
                    <button
                      type="button"
                      onClick={() => onSelectBusiness(b)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-900 hover:text-white hover:border-slate-900 text-slate-700 font-bold text-xs transition-colors shadow-2xs whitespace-nowrap"
                    >
                      <Eye className="w-3.5 h-3.5 shrink-0" />
                      <span>Розглянути</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
