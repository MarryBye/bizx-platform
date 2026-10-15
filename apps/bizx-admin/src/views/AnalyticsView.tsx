import React from 'react';
import { useBusinessStore } from '../store/useBusinessStore';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@bizx/ui';
import { DollarSign, ShoppingBag, TrendingUp, PackageCheck, Calendar } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { analytics, activeStore, products, isLoading } = useBusinessStore();

  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toLocaleString('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  if (!activeStore) {
    return (
      <div className="p-8 text-center text-slate-500">
        Оберіть або створіть магазин для перегляду аналітики
      </div>
    );
  }

  const revenue = analytics?.totalRevenue ?? 0;
  const ordersCount = analytics?.totalOrders ?? 0;
  const aov = analytics?.averageOrderValue ?? 0;
  const activeProductsCount = products.filter((p) => p.isActive).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Аналітика та показники продажів
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Зведені дані та динаміка для магазину «{activeStore.name}»
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Загальна виручка</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatPrice(revenue)} <span className="text-sm font-medium text-slate-500">₴</span>
            </div>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Успішні оплати
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Всього замовлень</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{ordersCount}</div>
            <p className="text-xs text-slate-500 mt-1">Оброблено системою</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Середній чек (AOV)</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatPrice(aov)} <span className="text-sm font-medium text-slate-500">₴</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">На одне замовлення</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Активні товари</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <PackageCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{activeProductsCount}</div>
            <p className="text-xs text-slate-500 mt-1">В каталозі магазину</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Status & Daily Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Розподіл за статусами замовлень</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.statusBreakdown && Object.keys(analytics.statusBreakdown).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(analytics.statusBreakdown).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Badge variant={status === 'delivered' ? 'success' : status === 'paid' ? 'default' : 'secondary'}>
                        {status}
                      </Badge>
                    </div>
                    <span className="text-sm font-bold text-slate-700">{count} зам.</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">Немає даних по статусах</p>
            )}
          </CardContent>
        </Card>

        {/* Daily Sales */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" /> Динаміка продажів
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.dailySales && analytics.dailySales.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {analytics.dailySales.map((item) => (
                  <div key={item.date} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <span className="text-xs text-slate-600 font-medium">{item.date}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{item.ordersCount} зам.</span>
                      <span className="text-xs font-bold text-slate-900">{formatPrice(item.revenue)} ₴</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">Дані за поточний період відсутні</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Топ найпопулярніших товарів за виручкою</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics?.topProducts && analytics.topProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="pb-3">Товар</th>
                    <th className="pb-3 text-right">Продано шт.</th>
                    <th className="pb-3 text-right">Виручка</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.topProducts.map((p, index) => (
                    <tr key={p.productId} className="hover:bg-slate-50/50">
                      <td className="py-3 font-medium text-slate-900 flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-4">{index + 1}.</span>
                        {p.productName}
                      </td>
                      <td className="py-3 text-right text-slate-600">{p.totalQuantity} шт.</td>
                      <td className="py-3 text-right font-semibold text-emerald-600">
                        {formatPrice(p.totalRevenue)} ₴
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">Топ-товари поки відсутні</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
