import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../lib/api';
import { useBusinessStore } from '../store/useBusinessStore';
import { useTranslation } from '../hooks/useTranslation';
import type { StoreCustomerSummaryItem } from '@bizx/common-types';
import { Button, Input, StatusBadge } from '@bizx/ui';
import { Users, Search, RefreshCw, ShoppingBag, Bell, Phone, Mail, Clock } from 'lucide-react';

export const CustomersView: React.FC = () => {
  const { activeStore, activeStoreId } = useBusinessStore();
  const { locale } = useTranslation();
  const isEn = locale === 'en';

  const [customers, setCustomers] = useState<StoreCustomerSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'subscribed'>('all');

  const loadCustomers = useCallback(async () => {
    if (!activeStoreId) return;
    setIsLoading(true);
    try {
      const res = await api.orders.getStoreCustomers(activeStoreId);
      if (res.success && res.data) {
        setCustomers(res.data);
      }
    } catch {
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeStoreId]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (filterMode === 'subscribed' && !c.marketingSubscribed) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      );
    });
  }, [customers, search, filterMode]);

  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
  const subscribedCount = customers.filter((c) => c.marketingSubscribed).length;

  const formatPrice = (kopecks: number) =>
    (kopecks / 100).toLocaleString(isEn ? 'en-US' : 'uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  if (!activeStore) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            {isEn ? 'Store Customers (CRM)' : 'Клієнти закладу (CRM)'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isEn
              ? `Buyers history, LTV & promo subscription status — «${activeStore.name}»`
              : `Історія покупців, сума чеків та статус підписки на акції — «${activeStore.name}»`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadCustomers()}
          disabled={isLoading}
          className="gap-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isEn ? 'Refresh' : 'Оновити'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">
            {isEn ? 'Unique Customers' : 'Унікальних клієнтів'}
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{customers.length}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">
            {isEn ? 'Subscribed to Promos' : 'Підписані на акції'}
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{subscribedCount}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-500">
            {isEn ? 'Total Customer LTV' : 'Сумарні покупки'}
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {formatPrice(totalRevenue)} ₴
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isEn ? 'Search by name, phone or email...' : 'Пошук за ім’ям, телефоном чи email...'}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterMode === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {isEn ? `All (${customers.length})` : `Усі (${customers.length})`}
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('subscribed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterMode === 'subscribed'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {isEn ? `Promo Opt-In (${subscribedCount})` : `Підписники (${subscribedCount})`}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-slate-400">
            {isEn ? 'Loading customers...' : 'Завантаження клієнтів...'}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            {isEn ? 'No customers found.' : 'Клієнтів не знайдено.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((c) => (
              <div
                key={c.customerId}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-extrabold text-slate-900">{c.name}</span>
                    {c.marketingSubscribed && (
                      <StatusBadge tone="emerald" size="xs" icon={<Bell className="w-3 h-3" />}>
                        {isEn ? 'Promo subscriber' : 'Підписник акцій'}
                      </StatusBadge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {c.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {c.phone}
                      </span>
                    )}
                    {c.email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {c.email}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {isEn ? 'Last order:' : 'Останнє замовлення:'}{' '}
                      {new Date(c.lastOrderAt).toLocaleDateString(isEn ? 'en-US' : 'uk-UA')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-slate-500 inline-flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3" />
                      {c.ordersCount} {isEn ? 'orders' : 'зам.'}
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {formatPrice(c.totalSpent)} ₴
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
