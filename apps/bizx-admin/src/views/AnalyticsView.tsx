import React, { useEffect, useState } from 'react';
import { useBusinessStore } from '../store/useBusinessStore';
import { useTranslation } from '../hooks/useTranslation';
import { api } from '../lib/api';
import type { StoreReviewsResponse } from '@bizx/common-types';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@bizx/ui';
import { DollarSign, ShoppingBag, TrendingUp, PackageCheck, Calendar, BarChart3, Star } from 'lucide-react';

interface AnalyticsViewProps {
  onOpenDetailed?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onOpenDetailed }) => {
  const { analytics, activeStore, products } = useBusinessStore();
  const { t, locale } = useTranslation();
  const [reviewsData, setReviewsData] = useState<StoreReviewsResponse | null>(null);

  useEffect(() => {
    if (!activeStore?.id) {
      setReviewsData(null);
      return;
    }
    api.stores
      .getReviews(activeStore.id)
      .then((res) => {
        if (res.success && res.data) setReviewsData(res.data);
      })
      .catch(() => {});
  }, [activeStore?.id]);

  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toLocaleString(locale === 'en' ? 'en-US' : 'uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  if (!activeStore) {
    return (
      <div className="p-8 text-center text-slate-500">
        {t('admin.selectStoreForAnalytics')}
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('admin.overviewTitle')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('admin.overviewSubtitle', { name: activeStore.name })}
          </p>
        </div>

        {onOpenDetailed && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDetailed}
            className="self-start sm:self-auto inline-flex items-center gap-2 text-xs font-bold"
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>{t('admin.openDetailedAnalytics')}</span>
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              {t('admin.totalRevenue')}
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatPrice(revenue)} <span className="text-sm font-medium text-slate-500">₴</span>
            </div>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {t('admin.successfulPayments')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              {t('admin.totalOrders')}
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{ordersCount}</div>
            <p className="text-xs text-slate-500 mt-1">{t('admin.processedBySystem')}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              {t('admin.averageOrderValue')}
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatPrice(aov)} <span className="text-sm font-medium text-slate-500">₴</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{t('admin.perOrder')}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              {t('admin.activeProducts')}
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <PackageCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{activeProductsCount}</div>
            <p className="text-xs text-slate-500 mt-1">{t('admin.inStoreCatalog')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Status & Daily Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t('admin.statusBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.statusBreakdown && Object.keys(analytics.statusBreakdown).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(analytics.statusBreakdown).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          status === 'delivered'
                            ? 'success'
                            : status === 'paid'
                              ? 'default'
                              : 'secondary'
                        }
                      >
                        {t(`statuses.order.${status}`)}
                      </Badge>
                    </div>
                    <span className="text-sm font-bold text-slate-700">
                      {count} {t('common.ordersShort')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">{t('admin.noStatusData')}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" /> {t('admin.salesDynamics')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics?.dailySales && analytics.dailySales.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {analytics.dailySales.map((item) => (
                  <div
                    key={item.date}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-xs text-slate-600 font-medium">{item.date}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">
                        {item.ordersCount} {t('common.ordersShort')}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {formatPrice(item.revenue)} ₴
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">{t('admin.noPeriodData')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top-10 Products by Revenue */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">{t('admin.topProductsTitle')}</CardTitle>
          {analytics?.topProducts && analytics.topProducts.length > 0 && (
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
              {t('platform.topCount', { count: Math.min(analytics.topProducts.length, 10) })}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {analytics?.topProducts && analytics.topProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="pb-3">{t('admin.productCol')}</th>
                    <th className="pb-3 text-right">{t('admin.soldQtyCol')}</th>
                    <th className="pb-3 text-right">{t('admin.revenueCol')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analytics.topProducts.slice(0, 10).map((p, index) => (
                    <tr key={p.productId} className="hover:bg-slate-50/50">
                      <td className="py-3 font-medium text-slate-900 flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          {index + 1}
                        </span>
                        <span>{p.productName}</span>
                      </td>
                      <td className="py-3 text-right text-slate-600">
                        {p.totalQuantity} {t('common.pcs')}
                      </td>
                      <td className="py-3 text-right font-semibold text-emerald-600">
                        {formatPrice(p.totalRevenue)} ₴
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">{t('admin.noTopProducts')}</p>
          )}
        </CardContent>
      </Card>
      {/* Store Star Rating & Customer Reviews */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            <span>{locale === 'en' ? 'Store Rating & Reviews' : 'Рейтинг закладу та відгуки'}</span>
          </CardTitle>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <span className="text-xs font-black text-amber-900">
              {(reviewsData?.ratingAvg ?? activeStore.ratingAvg ?? 0).toFixed(1)}
            </span>
            <span className="text-[11px] font-medium text-amber-700">
              ({reviewsData?.ratingCount ?? activeStore.ratingCount ?? 0})
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {reviewsData && reviewsData.reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reviewsData.reviews.slice(0, 4).map((rev) => (
                <div
                  key={rev.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {rev.customerName}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((starIdx) => (
                        <Star
                          key={starIdx}
                          className={`w-3 h-3 ${
                            starIdx <= rev.rating
                              ? 'text-amber-500 fill-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {rev.comment && (
                    <p className="text-xs text-slate-600 leading-relaxed">{rev.comment}</p>
                  )}
                  <p className="text-[10px] text-slate-400">
                    {new Date(rev.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'uk-UA')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">
              {locale === 'en'
                ? 'No customer ratings yet. Reviews appear after delivered orders.'
                : 'Оцінок поки немає. Відгуки з’являються після успішно виконаних замовлень.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
