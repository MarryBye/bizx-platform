import React from 'react';
import type { PlatformAnalytics } from '@bizx/common-types';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Building2,
  Package,
  Users,
  Server,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Archive
} from 'lucide-react';

interface MetricsViewProps {
  analytics: PlatformAnalytics | null;
  totalUsersCount: number;
  businessesCount: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
    archived: number;
  };
  isLoading: boolean;
}

export const MetricsView: React.FC<MetricsViewProps> = ({
  analytics,
  totalUsersCount,
  businessesCount,
  isLoading: _isLoading
}) => {
  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toLocaleString('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const revenue = analytics?.totalPlatformRevenue ?? 0;
  const ordersCount = analytics?.totalOrders ?? 0;
  const aov = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;
  const productsCount = analytics?.totalProducts ?? 0;
  const topStores = analytics?.topStoresByRevenue ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Огляд платформи BizX
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Режим реального часу
          </span>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-0.5">
          Аналітика та системні показники
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Зведений оборот торгівлі, стан підключених бізнесів та навантаження на систему
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* GMV */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Оборот GMV</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 truncate">
            {formatPrice(revenue)} <span className="text-xs font-semibold text-slate-500">₴</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Успішні оплати
          </div>
        </div>

        {/* Orders */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Замовлення</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900">{ordersCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">Оброблено платформою</div>
        </div>

        {/* Average Order Value */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Середній чек</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 truncate">
            {formatPrice(aov)} <span className="text-xs font-semibold text-slate-500">₴</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">По всіх закладах</div>
        </div>

        {/* Total Stores */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Заклади</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900">{businessesCount.total}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            <span className="font-bold text-emerald-600">{businessesCount.active}</span> активних
          </div>
        </div>

        {/* Products */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Товари</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900">{productsCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">В каталогах бізнесу</div>
        </div>

        {/* Total Users */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider">Користувачі</span>
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900">{totalUsersCount}</div>
          <div className="text-[11px] text-slate-500 mt-1">BizX ID акаунтів</div>
        </div>
      </div>

      {/* Two Column Detailed Blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Store Status Breakdown & Top Stores */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top Stores by Volume */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Лідери торгівлі за виручкою
                </h3>
                <p className="text-[11px] text-slate-500">
                  Підключені бізнеси з найбільшим оборотом продажів у системі
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                Топ {topStores.length || 3}
              </span>
            </div>

            {topStores.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                Дані по виручці формуються на основі сплачених замовлень
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Торгова точка</th>
                      <th className="py-2.5 px-3 text-right">Замовлень</th>
                      <th className="py-2.5 px-3 text-right">Виручка</th>
                      <th className="py-2.5 px-3 text-right">Частка обороту</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topStores.map((st, idx) => {
                      const share = revenue > 0 ? Math.round((st.revenue / revenue) * 100) : 0;
                      return (
                        <tr key={st.storeId || idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-5 h-5 rounded bg-slate-900 text-white font-mono text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span>{st.storeName}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {st.ordersCount}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatPrice(st.revenue)} ₴
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-slate-900 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(5, share))}%` }}
                                />
                              </div>
                              <span className="font-mono text-slate-500 text-[11px] w-8">
                                {share}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Infrastructure Health & Tech Stack */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Стан системного оточення та інфраструктури
                </h3>
                <p className="text-[11px] text-slate-500">
                  Моніторинг сервісів бекенду, бази даних, сховища та черг
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Всі системи в нормі</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">NestJS Core API</div>
                    <div className="text-[10px] text-slate-400 font-mono">http://localhost:3101</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                  99.98% Uptime
                </span>
              </div>

              <div className="p-3 border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">PostgreSQL + Drizzle</div>
                    <div className="text-[10px] text-slate-400 font-mono">localhost:5432 / bizx_db</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                  Connected
                </span>
              </div>

              <div className="p-3 border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Cloudflare R2 Storage</div>
                    <div className="text-[10px] text-slate-400 font-mono">bucket: bizx-assets</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                  Operational
                </span>
              </div>

              <div className="p-3 border border-slate-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Merchant Portal</div>
                    <div className="text-[10px] text-slate-400 font-mono">http://localhost:3102</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Business Statuses Distribution Tile */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Розподіл бізнесів за статусами
              </h3>
              <p className="text-[11px] text-slate-500">
                Поточний стан підключених торгових закладів
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {/* Active */}
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Активні магазини</span>
                  </span>
                  <span className="font-bold text-slate-900">{businessesCount.active}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${businessesCount.total > 0 ? (businessesCount.active / businessesCount.total) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>

              {/* Pending */}
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Очікують перевірки</span>
                  </span>
                  <span className="font-bold text-slate-900">{businessesCount.pending}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${businessesCount.total > 0 ? (businessesCount.pending / businessesCount.total) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>

              {/* Suspended */}
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Призупинені</span>
                  </span>
                  <span className="font-bold text-slate-900">{businessesCount.suspended}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{
                      width: `${businessesCount.total > 0 ? (businessesCount.suspended / businessesCount.total) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>

              {/* Archived */}
              <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-800">
                    <Archive className="w-3.5 h-3.5 text-slate-400" />
                    <span>Архівовані</span>
                  </span>
                  <span className="font-bold text-slate-900">{businessesCount.archived}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-400 rounded-full"
                    style={{
                      width: `${businessesCount.total > 0 ? (businessesCount.archived / businessesCount.total) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Notice Tile */}
          <div className="p-4 bg-slate-900 text-white rounded-xl shadow-sm space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Політика модерації
            </div>
            <div className="text-xs leading-relaxed text-slate-200">
              Співробітники BizX мають право змінювати статус активності закладів та блокувати підозрілі акаунти, але не редагують товари та ціни мерчантів.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
