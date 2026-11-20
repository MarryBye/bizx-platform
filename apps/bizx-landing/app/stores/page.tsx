'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { SiteHeader } from '../components/SiteHeader';
import { api } from '../lib/api';
import { useTranslation } from '../hooks/useTranslation';
import type { Store, StoreCategory } from '@bizx/common-types';
import { Search, Store as StoreIcon, Star, MapPin, ArrowRight, Loader2 } from 'lucide-react';

export default function StoresDirectoryPage() {
  const { locale } = useTranslation();
  const isEn = locale === 'en';

  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const [stRes, catRes] = await Promise.all([
          api.stores.getStores({ page: 1, pageSize: 100 }),
          api.stores.getCategories()
        ]);
        if (!active) return;
        if (stRes.success && stRes.data?.items) setStores(stRes.data.items);
        if (catRes.success && catRes.data) setCategories(catRes.data);
      } catch {
        // ignore
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const filteredStores = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stores.filter((s) => {
      if (selectedCategoryId !== 'all' && s.categoryId !== selectedCategoryId) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.address || '').toLowerCase().includes(q)
      );
    });
  }, [stores, search, selectedCategoryId]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <SiteHeader />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            {isEn ? 'BizX Partner Stores' : 'Заклади та магазини BizX'}
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            {isEn
              ? 'Discover verified local cafes, shops, and services. Order online and subscribe for exclusive store promos.'
              : 'Обирайте перевірені заклади, кав’ярні та магазини платформи BizX. Замовляйте онлайн та підписуйтесь на акції улюблених місць.'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isEn
                  ? 'Search stores by name, city or description...'
                  : 'Пошук за назвою закладу, адресою або описом...'
              }
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-slate-900"
            />
          </div>

          {categories.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedCategoryId('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  selectedCategoryId === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isEn ? `All (${stores.length})` : `Усі (${stores.length})`}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    selectedCategoryId === cat.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-slate-900" />
            <span className="text-xs font-semibold">
              {isEn ? 'Loading stores...' : 'Завантаження закладів...'}
            </span>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-2">
            <StoreIcon className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">
              {isEn ? 'No stores match your search' : 'Закладів за цим запитом не знайдено'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStores.map((st) => (
              <Link
                key={st.id}
                href={`/store/${st.slug}`}
                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col"
              >
                <div className="h-36 bg-slate-900 relative overflow-hidden">
                  {st.bannerUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={api.storage.resolveMediaUrl(st.bannerUrl) || ''}
                      alt={st.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                      <StoreIcon className="w-10 h-10 text-slate-600" />
                    </div>
                  )}
                  {(st.ratingCount ?? 0) > 0 && (
                    <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/95 backdrop-blur-xs text-xs font-black text-slate-900 shadow-xs">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                      <span>{Number(st.ratingAvg || 0).toFixed(1)}</span>
                      <span className="text-[10px] font-medium text-slate-500">
                        ({st.ratingCount})
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {st.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={api.storage.resolveMediaUrl(st.logoUrl) || ''}
                            alt={st.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <StoreIcon className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-black text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {st.name}
                        </h2>
                        <div className="text-[11px] font-mono text-slate-400 truncate">
                          {st.customDomain && st.customDomainVerified
                            ? st.customDomain
                            : `${st.slug}.bizx.ua`}
                        </div>
                      </div>
                    </div>

                    {st.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {st.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 text-slate-500 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{st.address || 'Україна'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-slate-900 group-hover:translate-x-0.5 transition-transform shrink-0">
                      <span>{isEn ? 'Open' : 'Відкрити'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
