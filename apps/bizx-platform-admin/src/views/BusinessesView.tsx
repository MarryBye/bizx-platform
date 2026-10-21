import React, { useState } from 'react';
import type { Store } from '@bizx/common-types';
import {
  Building2,
  Search,
  Archive,
  SlidersHorizontal,
  RefreshCw
} from 'lucide-react';

export type ExtendedBusiness = Store & {
  categoryName?: string;
  ownerName?: string;
  ownerEmail?: string;
  ordersCount?: number;
  totalGmv?: number;
};

interface BusinessesViewProps {
  businesses: ExtendedBusiness[];
  categories: Array<{ id: string; name: string }>;
  onSelectBusiness: (business: ExtendedBusiness) => void;
  onRefresh: () => Promise<void>;
  isLoading: boolean;
}

export const BusinessesView: React.FC<BusinessesViewProps> = ({
  businesses,
  categories,
  onSelectBusiness,
  onRefresh,
  isLoading
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredBusinesses = businesses.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.ownerName && b.ownerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.ownerEmail && b.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || b.categoryId === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Активний</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>На перевірці</span>
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Призупинено</span>
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
            <Archive className="w-3 h-3" />
            <span>В архіві</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
            {status}
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
            Торгові точки та бізнеси
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Керування статусом підключених закладів, модерація та перегляд параметрів точок
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

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Пошук за назвою закладу, slug або власником..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900 transition-all font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-700"
          >
            <option value="all">Всі статуси</option>
            <option value="active">Активні</option>
            <option value="pending">На перевірці</option>
            <option value="suspended">Призупинені</option>
            <option value="archived">В архіві</option>
          </select>

          {/* Category Filter */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-slate-700 max-w-[160px] truncate"
            >
              <option value="all">Всі категорії</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Торгова точка</th>
                <th className="py-3 px-4">Категорія</th>
                <th className="py-3 px-4">Власник</th>
                <th className="py-3 px-4">Статус</th>
                <th className="py-3 px-4">Дата реєстрації</th>
                <th className="py-3 px-4 text-right">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <div className="font-semibold text-xs">Закладів не знайдено</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Спробуйте змінити пошуковий запит або параметри фільтрації
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBusinesses.map((b) => (
                  <tr
                    key={b.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Store Title */}
                    <td className="py-3.5 px-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm overflow-hidden">
                          {b.logoUrl ? (
                            <img
                              src={b.logoUrl}
                              alt={b.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            b.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                            <span>{b.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">/{b.slug}</div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                        {b.categoryName || 'Торгівля'}
                      </span>
                    </td>

                    {/* Owner */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-900 font-semibold text-xs">
                        {b.ownerName || 'Партнер BizX'}
                      </div>
                      {b.ownerEmail && (
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                          {b.ownerEmail}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">{getStatusBadge(b.status)}</td>

                    {/* Created At */}
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {b.createdAt ? new Date(b.createdAt).toLocaleDateString('uk-UA') : '—'}
                    </td>

                    {/* Uniform Action Button */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectBusiness(b)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-900 hover:text-white hover:border-slate-900 text-slate-700 font-bold text-xs transition-all shadow-sm w-28"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Керування</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between px-4">
          <div>Всього закладів у базі: {filteredBusinesses.length}</div>
          <div className="flex items-center gap-2">
            <span>● Доступ лише для BizX Staff</span>
          </div>
        </div>
      </div>
    </div>
  );
};
