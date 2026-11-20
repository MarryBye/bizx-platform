import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
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
import { platformApi } from '../lib/api';
import { useTranslation } from '../hooks/useTranslation';
import type { AnalyticsPeriod, OrderStatus, PlatformAnalytics } from '@bizx/common-types';
import type { ExtendedBusiness } from './BusinessesView';
import {
  AnalyticsPageHeader,
  AnalyticsFiltersCard,
  AnalyticsKpiGrid,
  AnalyticsChartCard,
  AnalyticsDataTableShell
} from '@bizx/ui';
import { formatMoney as formatMoneyShared } from '@bizx/utils';
import {
  TrendingUp,
  BarChart3,
  ScatterChart as ScatterIcon,
  Loader2
} from 'lucide-react';

interface PlatformAnalyticsViewProps {
  initialAnalytics: PlatformAnalytics | null;
  businesses: ExtendedBusiness[];
  canExport?: boolean;
}

type TableTab = 'daily' | 'monthly' | 'stores';

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

export const PlatformAnalyticsView: React.FC<PlatformAnalyticsViewProps> = ({
  initialAnalytics,
  businesses,
  canExport = false
}) => {
  const { t, locale } = useTranslation();

  // Filter state
  const [period, setPeriod] = useState<AnalyticsPeriod>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [storeId, setStoreId] = useState('');
  const [minAmountUah, setMinAmountUah] = useState('');
  const [minOrdersFilter, setMinOrdersFilter] = useState('');

  const [data, setData] = useState<PlatformAnalytics | null>(initialAnalytics);
  const [isLoading, setIsLoading] = useState(false);
  const [tableTab, setTableTab] = useState<TableTab>('stores');
  const [topLimit, setTopLimit] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await platformApi.analytics.getPlatformAnalytics({
        period,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: status || undefined,
        storeId: storeId || undefined,
        minAmount: minAmountUah ? Math.round(Number(minAmountUah) * 100) : undefined,
        topLimit
      });
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch {
      // Keep previous / fallback data
    } finally {
      setIsLoading(false);
    }
  }, [period, startDate, endDate, status, storeId, minAmountUah, topLimit]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    setCurrentPage(1);
  }, [tableTab, pageSize, period, startDate, endDate, status, storeId, minAmountUah, minOrdersFilter, topLimit]);

  const handleResetFilters = () => {
    setPeriod('all');
    setStartDate('');
    setEndDate('');
    setStatus('');
    setStoreId('');
    setMinAmountUah('');
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

  const storesChartData = useMemo(() => {
    const totalRev = data?.totalPlatformRevenue || 0;
    return (data?.topStoresByRevenue || [])
      .filter((s) => s.ordersCount >= minOrdersNum)
      .map((s) => ({
        storeId: s.storeId,
        storeName: s.storeName,
        revenueUah: Number((s.revenue / 100).toFixed(2)),
        ordersCount: s.ordersCount,
        aovUah: s.ordersCount > 0 ? Number((s.revenue / s.ordersCount / 100).toFixed(2)) : 0,
        sharePct: totalRev > 0 ? Number(((s.revenue / totalRev) * 100).toFixed(1)) : 0
      }));
  }, [data, minOrdersNum]);

  const statusChartData = useMemo(() => {
    return Object.entries(data?.statusBreakdown || {}).map(([st, count]) => ({
      status: t(`statuses.order.${st}`),
      count
    }));
  }, [data, t]);

  const activeRowsCount =
    tableTab === 'stores'
      ? storesChartData.length
      : tableTab === 'daily'
        ? dailyChartData.length
        : monthlyChartData.length;
  const totalPages = Math.max(1, Math.ceil(activeRowsCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedStores = storesChartData.slice(startIdx, startIdx + pageSize);
  const paginatedDaily = dailyChartData.slice(startIdx, startIdx + pageSize);
  const paginatedMonthly = monthlyChartData.slice(startIdx, startIdx + pageSize);
  const rangeFrom = activeRowsCount === 0 ? 0 : startIdx + 1;
  const rangeTo = Math.min(startIdx + pageSize, activeRowsCount);

  const handleExportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();

    const summaryRows = [
      { Metric: t('platform.gmv'), Value: `${(data.totalPlatformRevenue / 100).toFixed(2)} UAH` },
      { Metric: t('platform.orders'), Value: data.totalOrders },
      { Metric: t('platform.stores'), Value: data.totalStores },
      { Metric: t('platform.activeStores'), Value: data.activeStores },
      { Metric: t('platform.products'), Value: data.totalProducts }
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Summary');

    const storesRows = storesChartData.map((s) => ({
      [t('platform.storeCol')]: s.storeName,
      [t('analytics.ordersAxis')]: s.ordersCount,
      [t('analytics.revenueAxis')]: s.revenueUah,
      [t('analytics.avgCheck')]: s.aovUah,
      [t('analytics.shareOfRevenue')]: `${s.sharePct}%`
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(storesRows), 'Stores');

    const dailyRows = dailyChartData.map((d) => ({
      [t('common.date')]: d.date,
      [t('analytics.ordersAxis')]: d.ordersCount,
      [t('analytics.revenueAxis')]: d.revenueUah,
      [t('analytics.avgCheck')]: d.aovUah
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows), 'Daily');

    const monthlyRows = monthlyChartData.map((m) => ({
      Month: m.month,
      [t('analytics.ordersAxis')]: m.ordersCount,
      [t('analytics.revenueAxis')]: m.revenueUah
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthlyRows), 'Monthly');

    const dateTag = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `bizx-platform-analytics-${dateTag}.xlsx`);
  };

  const handleExportCsv = () => {
    if (!data) return;
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
      rows = storesChartData.map((s) => ({
        Store: s.storeName,
        Orders: s.ordersCount,
        Revenue_UAH: s.revenueUah,
        AOV_UAH: s.aovUah,
        Share_Pct: s.sharePct
      }));
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = '\uFEFF' + XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bizx-platform-${tableTab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRev = data?.totalPlatformRevenue ?? 0;
  const totalOrders = data?.totalOrders ?? 0;
  const aov = totalOrders > 0 ? Math.round(totalRev / totalOrders) : 0;

  return (
    <div className="space-y-6">
      <AnalyticsPageHeader
        eyebrow="BizX Core Analytics"
        title={t('analytics.title')}
        subtitle={t('analytics.platformSubtitle')}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
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
            <label className="text-[10px] font-bold text-slate-500 uppercase">
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
            <label className="text-[10px] font-bold text-slate-500 uppercase">
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
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              {t('analytics.storeFilter')}
            </label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="w-full text-xs px-2.5 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
            >
              <option value="">{t('analytics.allStores')}</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">
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
            <label className="text-[10px] font-bold text-slate-500 uppercase">
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
            <label className="text-[10px] font-bold text-slate-500 uppercase">
              {t('analytics.minOrders')}
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
            columnsClassName="grid-cols-1 sm:grid-cols-4"
            items={[
              {
                label: t('platform.gmv'),
                value: (
                  <>
                    {formatMoney(totalRev)} <span className="text-xs text-slate-500">₴</span>
                  </>
                )
              },
              {
                label: t('platform.orders'),
                value: totalOrders
              },
              {
                label: t('platform.avgCheck'),
                value: (
                  <>
                    {formatMoney(aov)} <span className="text-xs text-slate-500">₴</span>
                  </>
                )
              },
              {
                label: t('platform.stores'),
                value: `${data?.activeStores ?? 0} / ${data?.totalStores ?? 0}`
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
              title={t('analytics.topStoresChart')}
              description={t('platform.topStoresSubtitle')}
              icon={<BarChart3 className="w-4 h-4 text-slate-600" />}
              hasData={storesChartData.length > 0}
              emptyLabel={t('analytics.noChartData')}
              headerRight={
                <select
                  value={topLimit}
                  onChange={(e) => setTopLimit(Number(e.target.value))}
                  className="text-xs font-bold px-2 py-1 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 text-slate-800 shrink-0"
                >
                  {TOP_LIMIT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt === 500
                        ? t('analytics.topAll')
                        : t('platform.topCount', { count: opt })}
                    </option>
                  ))}
                </select>
              }
            >
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={storesChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="storeName" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip />
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
              title={
                monthlyChartData.length > 0
                  ? t('analytics.monthlyComparison')
                  : t('analytics.statusDistribution')
              }
              description={
                monthlyChartData.length > 0
                  ? t('analytics.monthlyComparisonDesc')
                  : t('analytics.statusDistributionDesc')
              }
              icon={<BarChart3 className="w-4 h-4 text-slate-600" />}
              hasData={monthlyChartData.length > 0 || statusChartData.length > 0}
              emptyLabel={t('analytics.noChartData')}
            >
              {monthlyChartData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip />
                      <Bar
                        dataKey="revenueUah"
                        name={t('analytics.revenueAxis')}
                        fill="#2563eb"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
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
                        fill="#2563eb"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </AnalyticsChartCard>
          </div>

          <AnalyticsChartCard
            title={t('analytics.scatterTitle')}
            description={t('analytics.scatterStoresDesc')}
            icon={<ScatterIcon className="w-4 h-4 text-slate-600" />}
            hasData={storesChartData.length > 0}
            emptyLabel={t('analytics.noChartData')}
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    dataKey="ordersCount"
                    name={t('analytics.ordersAxis')}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    type="number"
                    dataKey="revenueUah"
                    name={t('analytics.revenueAxis')}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <ZAxis range={[80, 240]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter
                    name={t('analytics.tabStores')}
                    data={storesChartData}
                    fill="#7c3aed"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </AnalyticsChartCard>

          <AnalyticsDataTableShell
            title={t('analytics.tableTitle')}
            tabs={[
              { key: 'stores', label: t('analytics.tabStores') },
              { key: 'daily', label: t('analytics.tabDaily') },
              { key: 'monthly', label: t('analytics.tabMonthly') }
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
            {tableTab === 'stores' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase">
                    <th className="py-2.5 px-3">{t('platform.storeCol')}</th>
                    <th className="py-2.5 px-3 text-right">{t('analytics.ordersAxis')}</th>
                    <th className="py-2.5 px-3 text-right">{t('analytics.revenueAxis')}</th>
                    <th className="py-2.5 px-3 text-right">{t('analytics.avgCheck')}</th>
                    <th className="py-2.5 px-3 text-right">{t('analytics.shareOfRevenue')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedStores.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        {t('common.noData')}
                      </td>
                    </tr>
                  ) : (
                    paginatedStores.map((s) => (
                      <tr key={s.storeId} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{s.storeName}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {s.ordersCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {s.revenueUah.toFixed(2)} ₴
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {s.aovUah.toFixed(2)} ₴
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {s.sharePct}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

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
                    paginatedDaily.map((d) => (
                      <tr key={d.date} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-900">{d.date}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {d.ordersCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {d.revenueUah.toFixed(2)} ₴
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {d.aovUah.toFixed(2)} ₴
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
                    paginatedMonthly.map((m) => (
                      <tr key={m.month} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-900">{m.month}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {m.ordersCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {m.revenueUah.toFixed(2)} ₴
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
