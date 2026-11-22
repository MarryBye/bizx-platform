import React, { useState, useEffect, useCallback, useMemo } from 'react';
import writeXlsxFile from 'write-excel-file/browser';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { useBusinessStore } from '../store/useBusinessStore';
import { useTranslation } from '../hooks/useTranslation';
import { api } from '../lib/api';
import type { AnalyticsPeriod, OrderStatus, StoreAnalytics } from '@bizx/common-types';
import {
  AnalyticsPageHeader,
  AnalyticsFiltersCard,
  AnalyticsKpiGrid,
  AnalyticsChartCard,
  AnalyticsDataTableShell
} from '@bizx/ui';
import {
  formatMoney as formatMoneyShared,
  buildSafeExcelSheetData,
  serializeSafeCsv,
  sanitizeFilenameSegment
} from '@bizx/utils';
import {
  TrendingUp,
  BarChart3,
  ScatterChart as ScatterIcon,
  Loader2,
  Trophy
} from 'lucide-react';

type DataTab = 'daily' | 'monthly' | 'products';

const TOP_LIMIT_OPTIONS = [5, 10, 20, 50, 500] as const;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'paid',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled'
];

export const DetailedAnalyticsView: React.FC<{ canExport?: boolean }> = ({ canExport = true }) => {
  const { activeStore } = useBusinessStore();
  const { t, locale } = useTranslation();

  // Filter states
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [minAmountUah, setMinAmountUah] = useState('');
  const [maxAmountUah, setMaxAmountUah] = useState('');
  const [minOrdersFilter, setMinOrdersFilter] = useState('');

  const [data, setData] = useState<StoreAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tableTab, setTableTab] = useState<DataTab>('daily');
  const [topLimit, setTopLimit] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const fetchFilteredAnalytics = useCallback(async () => {
    if (!activeStore) return;
    setIsLoading(true);
    try {
      const res = await api.analytics.getStoreAnalytics(activeStore.id, {
        period,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: status || undefined,
        minAmount: minAmountUah ? Math.round(Number(minAmountUah) * 100) : undefined,
        maxAmount: maxAmountUah ? Math.round(Number(maxAmountUah) * 100) : undefined,
        topLimit
      });
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [activeStore, period, startDate, endDate, status, minAmountUah, maxAmountUah, topLimit]);

  useEffect(() => {
    fetchFilteredAnalytics();
  }, [fetchFilteredAnalytics]);

  useEffect(() => {
    setCurrentPage(1);
  }, [tableTab, pageSize, period, startDate, endDate, status, minAmountUah, maxAmountUah, minOrdersFilter, topLimit]);

  const handleResetFilters = () => {
    setPeriod('month');
    setStartDate('');
    setEndDate('');
    setStatus('');
    setMinAmountUah('');
    setMaxAmountUah('');
    setMinOrdersFilter('');
  };

  const formatMoney = (kopecks: number) => formatMoneyShared(kopecks, locale);

  const minOrdersNum = minOrdersFilter ? Number(minOrdersFilter) : 0;

  const dailyChartData = useMemo(() => {
    return (data?.dailySales || [])
      .filter((d) => d.ordersCount >= minOrdersNum)
      .map((d) => ({
        date: d.date,
        revenueUah: Number((d.revenue / 100).toFixed(2)),
        ordersCount: d.ordersCount,
        aovUah: d.ordersCount > 0 ? Number((d.revenue / d.ordersCount / 100).toFixed(2)) : 0
      }));
  }, [data, minOrdersNum]);

  const monthlyChartData = useMemo(() => {
    return (data?.monthlySales || [])
      .filter((m) => m.ordersCount >= minOrdersNum)
      .map((m) => ({
        month: m.month,
        revenueUah: Number((m.revenue / 100).toFixed(2)),
        ordersCount: m.ordersCount
      }));
  }, [data, minOrdersNum]);

  const statusChartData = useMemo(() => {
    return Object.entries(data?.statusBreakdown || {}).map(([st, count]) => ({
      status: t(`statuses.order.${st}`),
      rawStatus: st,
      count
    }));
  }, [data, t]);

  const productsScatterData = useMemo(() => {
    return (data?.topProducts || [])
      .filter((p) => p.totalQuantity >= minOrdersNum)
      .map((p) => ({
        productId: p.productId,
        name: p.productName,
        quantity: p.totalQuantity,
        revenueKopecks: p.totalRevenue,
        revenueUah: Number((p.totalRevenue / 100).toFixed(2)),
        avgPriceUah:
          p.totalQuantity > 0 ? Number((p.totalRevenue / p.totalQuantity / 100).toFixed(2)) : 0
      }));
  }, [data, minOrdersNum]);

  const activeRowsCount =
    tableTab === 'daily'
      ? dailyChartData.length
      : tableTab === 'monthly'
        ? monthlyChartData.length
        : productsScatterData.length;
  const totalPages = Math.max(1, Math.ceil(activeRowsCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedDaily = dailyChartData.slice(startIdx, startIdx + pageSize);
  const paginatedMonthly = monthlyChartData.slice(startIdx, startIdx + pageSize);
  const paginatedProducts = productsScatterData.slice(startIdx, startIdx + pageSize);
  const rangeFrom = activeRowsCount === 0 ? 0 : startIdx + 1;
  const rangeTo = Math.min(startIdx + pageSize, activeRowsCount);

  const handleExportExcel = async () => {
    if (!activeStore || !data) return;

    const summaryData = buildSafeExcelSheetData(
      ['Metric', 'Value'],
      [
        [t('admin.totalRevenue'), `${(data.totalRevenue / 100).toFixed(2)} UAH`],
        [t('admin.totalOrders'), data.totalOrders],
        [t('admin.averageOrderValue'), `${(data.averageOrderValue / 100).toFixed(2)} UAH`]
      ]
    );

    const dailyData = buildSafeExcelSheetData(
      [
        t('common.date'),
        t('analytics.ordersAxis'),
        t('analytics.revenueAxis'),
        t('analytics.avgCheck')
      ],
      dailyChartData.map((d) => [d.date, d.ordersCount, d.revenueUah, d.aovUah])
    );

    const monthlyData = buildSafeExcelSheetData(
      ['Month', t('analytics.ordersAxis'), t('analytics.revenueAxis')],
      monthlyChartData.map((m) => [m.month, m.ordersCount, m.revenueUah])
    );

    const productData = buildSafeExcelSheetData(
      [t('admin.productCol'), t('analytics.quantityAxis'), t('analytics.revenueAxis')],
      productsScatterData.map((p) => [p.name, p.quantity, p.revenueUah])
    );

    const dateTag = new Date().toISOString().slice(0, 10);
    const safeSlug = sanitizeFilenameSegment(activeStore.slug, 'store');
    await writeXlsxFile([
      { sheet: 'Summary', data: summaryData },
      { sheet: 'Daily', data: dailyData },
      { sheet: 'Monthly', data: monthlyData },
      { sheet: 'Products', data: productData }
    ]).toFile(`bizx-store-analytics-${safeSlug}-${dateTag}.xlsx`);
  };

  const handleExportCsv = () => {
    if (!activeStore || !data) return;
    let rows: Record<string, string | number>[] = [];

    if (tableTab === 'daily') {
      rows = dailyChartData.map((d) => ({
        Date: d.date,
        Orders: d.ordersCount,
        Revenue_UAH: d.revenueUah,
        AOV_UAH: d.aovUah
      }));
    } else if (tableTab === 'monthly') {
      rows = monthlyChartData.map((m) => ({
        Month: m.month,
        Orders: m.ordersCount,
        Revenue_UAH: m.revenueUah
      }));
    } else {
      rows = productsScatterData.map((p) => ({
        Product: p.name,
        Quantity: p.quantity,
        Revenue_UAH: p.revenueUah,
        AvgPrice_UAH: p.avgPriceUah
      }));
    }

    const csv = serializeSafeCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeSlug = sanitizeFilenameSegment(activeStore.slug, 'store');
    a.download = `bizx-store-${tableTab}-${safeSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!activeStore) {
    return (
      <div className="p-8 text-center text-slate-500">
        {t('admin.selectStoreForAnalytics')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnalyticsPageHeader
        title={t('analytics.title')}
        subtitle={`${t('analytics.subtitle')} — «${activeStore.name}»`}
        canExport={canExport}
        disableExport={!data}
        exportCsvLabel={t('analytics.exportCsv')}
        exportExcelLabel={t('analytics.exportExcel')}
        onExportCsv={handleExportCsv}
        onExportExcel={handleExportExcel}
      />

      <AnalyticsFiltersCard
        title={t('analytics.filters')}
        resetLabel={t('analytics.resetFilters')}
        onReset={handleResetFilters}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                {t('analytics.period')}
              </label>
              <select
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value as AnalyticsPeriod);
                  setStartDate('');
                  setEndDate('');
                }}
                className="w-full text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              >
                <option value="day">{t('analytics.periodDay')}</option>
                <option value="week">{t('analytics.periodWeek')}</option>
                <option value="month">{t('analytics.periodMonth')}</option>
                <option value="year">{t('analytics.periodYear')}</option>
                <option value="all">{t('analytics.periodAll')}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                {t('analytics.dateFrom')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                {t('analytics.dateTo')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                {t('analytics.orderStatus')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
                className="w-full text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              >
                <option value="">{t('analytics.allStatuses')}</option>
                {ORDER_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {t(`statuses.order.${st}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                {t('analytics.minAmount')}
              </label>
              <input
                type="number"
                min={0}
                value={minAmountUah}
                onChange={(e) => setMinAmountUah(e.target.value)}
                placeholder="0"
                className="w-full text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                {t('analytics.minQty')}
              </label>
              <input
                type="number"
                min={0}
                value={minOrdersFilter}
                onChange={(e) => setMinOrdersFilter(e.target.value)}
                placeholder="0"
                className="w-full text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>
      </AnalyticsFiltersCard>

      {isLoading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-slate-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{t('common.loading')}</span>
        </div>
      ) : (
        <>
          <AnalyticsKpiGrid
            items={[
              {
                label: t('admin.totalRevenue'),
                value: (
                  <>
                    {formatMoney(data?.totalRevenue ?? 0)}{' '}
                    <span className="text-sm font-semibold text-slate-500">₴</span>
                  </>
                )
              },
              {
                label: t('admin.totalOrders'),
                value: data?.totalOrders ?? 0
              },
              {
                label: t('admin.averageOrderValue'),
                value: (
                  <>
                    {formatMoney(data?.averageOrderValue ?? 0)}{' '}
                    <span className="text-sm font-semibold text-slate-500">₴</span>
                  </>
                )
              }
            ]}
          />

          <AnalyticsChartCard
            title={t('analytics.revenueOverTime')}
            description={t('analytics.revenueOverTimeDesc')}
            icon={<TrendingUp className="w-4 h-4 text-slate-600" />}
            hasData={dailyChartData.length > 0}
            emptyLabel={t('analytics.noChartData')}
          >
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenueUah"
                    name={t('analytics.revenueAxis')}
                    stroke="#0f172a"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="ordersCount"
                    name={t('analytics.ordersAxis')}
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsChartCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsChartCard
              title={t('analytics.monthlyComparison')}
              description={t('analytics.monthlyComparisonDesc')}
              icon={<BarChart3 className="w-4 h-4 text-slate-600" />}
              hasData={monthlyChartData.length > 0}
              emptyLabel={t('analytics.noChartData')}
            >
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="revenueUah"
                      name={t('analytics.revenueAxis')}
                      fill="#0f172a"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </AnalyticsChartCard>

            <AnalyticsChartCard
              title={t('analytics.statusDistribution')}
              description={t('analytics.statusDistributionDesc')}
              icon={<BarChart3 className="w-4 h-4 text-slate-600" />}
              hasData={statusChartData.length > 0}
              emptyLabel={t('analytics.noChartData')}
            >
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      name={t('analytics.ordersAxis')}
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </AnalyticsChartCard>
          </div>

          <AnalyticsChartCard
            title={t('analytics.scatterTitle')}
            description={t('analytics.scatterProductsDesc')}
            icon={<ScatterIcon className="w-4 h-4 text-slate-600" />}
            hasData={productsScatterData.length > 0}
            emptyLabel={t('analytics.noChartData')}
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    dataKey="quantity"
                    name={t('analytics.quantityAxis')}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    type="number"
                    dataKey="revenueUah"
                    name={t('analytics.revenueAxis')}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <ZAxis range={[70, 220]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter
                    name={t('analytics.tabProducts')}
                    data={productsScatterData}
                    fill="#7c3aed"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsChartCard>

          <AnalyticsChartCard
            title={t('analytics.topProductsChart')}
            icon={<Trophy className="w-4 h-4 text-amber-500" />}
            hasData={productsScatterData.length > 0}
            emptyLabel={t('admin.noTopProducts')}
            headerRight={
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">
                  {t('analytics.topLimitLabel')}
                </span>
                <select
                  value={topLimit}
                  onChange={(e) => setTopLimit(Number(e.target.value))}
                  className="text-xs font-bold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 text-slate-800"
                >
                  {TOP_LIMIT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === 500
                        ? t('analytics.topAll')
                        : t('platform.topCount', { count: opt })}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <th className="py-2.5 px-3">{t('admin.productCol')}</th>
                    <th className="py-2.5 px-3 text-right">{t('admin.soldQtyCol')}</th>
                    <th className="py-2.5 px-3 text-right">{t('admin.revenueCol')}</th>
                    <th className="py-2.5 px-3 text-right">{t('analytics.shareOfRevenue')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productsScatterData.map((row, index) => {
                    const storeTotalRev = data?.totalRevenue || 0;
                    const share =
                      storeTotalRev > 0
                        ? Math.round((row.revenueKopecks / storeTotalRev) * 100)
                        : 0;
                    return (
                      <tr key={`${row.productId}-${index}`} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <span>{row.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {row.quantity} {t('common.pcs')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {formatMoney(row.revenueKopecks)} ₴
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-slate-900 rounded-full"
                                style={{ width: `${Math.min(100, Math.max(4, share))}%` }}
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
          </AnalyticsChartCard>

          <AnalyticsDataTableShell
            title={t('analytics.tableTitle')}
            tabs={[
              { key: 'daily', label: t('analytics.tabDaily') },
              { key: 'monthly', label: t('analytics.tabMonthly') },
              { key: 'products', label: t('analytics.tabProducts') }
            ]}
            activeTab={tableTab}
            onTabChange={setTableTab}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={setPageSize}
            rowsPerPageLabel={t('analytics.rowsPerPage')}
            totalRows={activeRowsCount}
            showingRangeText={t('analytics.showingRange', {
              from: rangeFrom,
              to: rangeTo,
              total: activeRowsCount
            })}
            pageOfText={t('analytics.pageOf', { page: safePage, pages: totalPages })}
            prevLabel={t('analytics.prevPage')}
            nextLabel={t('analytics.nextPage')}
            canPrev={safePage > 1}
            canNext={safePage < totalPages}
            onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            {tableTab === 'daily' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <th className="py-2.5 px-3">{t('common.date')}</th>
                    <th className="py-2.5 px-3 text-right">{t('analytics.ordersAxis')}</th>
                    <th className="py-2.5 px-3 text-right">{t('analytics.revenueAxis')}</th>
                    <th className="py-2.5 px-3 text-right">{t('analytics.avgCheck')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDaily.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        {t('common.noData')}
                      </td>
                    </tr>
                  ) : (
                    paginatedDaily.map((row) => (
                      <tr key={row.date} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-900">{row.date}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{row.ordersCount}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {row.revenueUah.toFixed(2)} ₴
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {row.aovUah.toFixed(2)} ₴
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {tableTab === 'monthly' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <th className="py-2.5 px-3">{t('analytics.tabMonthly')}</th>
                    <th className="py-2.5 px-3 text-right">{t('analytics.ordersAxis')}</th>
                    <th className="py-2.5 px-3 text-right">{t('analytics.revenueAxis')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedMonthly.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-400">
                        {t('common.noData')}
                      </td>
                    </tr>
                  ) : (
                    paginatedMonthly.map((row) => (
                      <tr key={row.month} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-900">{row.month}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{row.ordersCount}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {row.revenueUah.toFixed(2)} ₴
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {tableTab === 'products' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <th className="py-2.5 px-3">{t('admin.productCol')}</th>
                    <th className="py-2.5 px-3 text-right">{t('analytics.quantityAxis')}</th>
                    <th className="py-2.5 px-3 text-right">{t('analytics.revenueAxis')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-400">
                        {t('common.noData')}
                      </td>
                    </tr>
                  ) : (
                    paginatedProducts.map((row, idx) => (
                      <tr key={`${row.productId}-${idx}`} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-900">{row.name}</td>
                        <td className="py-2.5 px-3 text-right text-slate-600">{row.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {row.revenueUah.toFixed(2)} ₴
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </AnalyticsDataTableShell>
        </>
      )}
    </div>
  );
};
