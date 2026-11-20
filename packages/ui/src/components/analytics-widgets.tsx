import React from 'react';
import {
  Filter,
  Download,
  FileSpreadsheet,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Table2
} from 'lucide-react';
import { Button } from './button';
import { Card, CardHeader, CardTitle, CardContent } from './card';
import { cn } from '../lib/utils';

export interface AnalyticsPageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  canExport?: boolean;
  disableExport?: boolean;
  exportCsvLabel: string;
  exportExcelLabel: string;
  onExportCsv: () => void;
  onExportExcel: () => void;
}

export const AnalyticsPageHeader: React.FC<AnalyticsPageHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  canExport = false,
  disableExport = false,
  exportCsvLabel,
  exportExcelLabel,
  onExportCsv,
  onExportExcel
}) => {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        {eyebrow && (
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {eyebrow}
          </span>
        )}
        <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-0.5">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>

      {canExport && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            disabled={disableExport}
            className="inline-flex items-center gap-1.5 text-xs font-bold"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>{exportCsvLabel}</span>
          </Button>
          <Button
            size="sm"
            onClick={onExportExcel}
            disabled={disableExport}
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>{exportExcelLabel}</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export interface AnalyticsFiltersCardProps {
  title: string;
  resetLabel: string;
  onReset: () => void;
  children: React.ReactNode;
}

export const AnalyticsFiltersCard: React.FC<AnalyticsFiltersCardProps> = ({
  title,
  resetLabel,
  onReset,
  children
}) => {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span>{title}</span>
          </CardTitle>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{resetLabel}</span>
          </button>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export interface AnalyticsKpiItem {
  label: string;
  value: React.ReactNode;
  sublabel?: React.ReactNode;
}

export interface AnalyticsKpiGridProps {
  items: AnalyticsKpiItem[];
  columnsClassName?: string;
}

export const AnalyticsKpiGrid: React.FC<AnalyticsKpiGridProps> = ({
  items,
  columnsClassName = 'grid-cols-1 sm:grid-cols-3'
}) => {
  return (
    <div className={cn('grid gap-4', columnsClassName)}>
      {items.map((item, idx) => (
        <div key={idx} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase">{item.label}</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{item.value}</div>
          {item.sublabel && <div className="text-[11px] text-slate-500 mt-1">{item.sublabel}</div>}
        </div>
      ))}
    </div>
  );
};

export interface AnalyticsChartCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  hasData: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}

export const AnalyticsChartCard: React.FC<AnalyticsChartCardProps> = ({
  title,
  description,
  icon,
  headerRight,
  hasData,
  emptyLabel,
  children
}) => {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {icon}
              <span>{title}</span>
            </CardTitle>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
          {headerRight}
        </div>
      </CardHeader>
      <CardContent>
        {hasData ? (
          children
        ) : (
          <p className="text-xs text-slate-400 py-10 text-center">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  );
};

export interface AnalyticsTableTabOption<T extends string = string> {
  key: T;
  label: string;
}

export interface AnalyticsDataTableShellProps<T extends string = string> {
  title: string;
  tabs: AnalyticsTableTabOption<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  pageSize: number;
  pageSizeOptions: readonly number[];
  onPageSizeChange: (size: number) => void;
  rowsPerPageLabel: string;
  totalRows: number;
  showingRangeText: string;
  pageOfText: string;
  prevLabel: string;
  nextLabel: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  children: React.ReactNode;
}

export function AnalyticsDataTableShell<T extends string = string>({
  title,
  tabs,
  activeTab,
  onTabChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  rowsPerPageLabel,
  totalRows,
  showingRangeText,
  pageOfText,
  prevLabel,
  nextLabel,
  canPrev,
  canNext,
  onPrev,
  onNext,
  children
}: AnalyticsDataTableShellProps<T>) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Table2 className="w-4 h-4 text-slate-600" />
            <span>{title}</span>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-bold">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onTabChange(tab.key)}
                  className={cn(
                    'px-3 py-1 rounded-md transition-colors',
                    activeTab === tab.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">{rowsPerPageLabel}</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="text-xs font-bold px-2 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 text-slate-800"
              >
                {pageSizeOptions.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">{children}</div>

        {totalRows > 0 && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 font-medium">{showingRangeText}</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={!canPrev}
                onClick={onPrev}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>{prevLabel}</span>
              </button>
              <span className="px-2.5 py-1.5 font-semibold text-slate-700">{pageOfText}</span>
              <button
                type="button"
                disabled={!canNext}
                onClick={onNext}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span>{nextLabel}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
