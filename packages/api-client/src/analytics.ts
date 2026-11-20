import type { ApiClient } from './client';
import type {
  ApiResponse,
  StoreAnalytics,
  PlatformAnalytics,
  AnalyticsPeriod,
  AnalyticsQuery
} from '@bizx/common-types';

export class AnalyticsModule {
  constructor(private client: ApiClient) {}

  /**
   * Отримання аналітики магазину (GET /analytics/stores/:storeId)
   */
  async getStoreAnalytics(
    storeId: string,
    queryOrPeriod: AnalyticsPeriod | Partial<AnalyticsQuery> = 'month'
  ): Promise<ApiResponse<StoreAnalytics>> {
    const params: Record<string, string | number | boolean | undefined> =
      typeof queryOrPeriod === 'string'
        ? { period: queryOrPeriod }
        : {
            period: queryOrPeriod.period ?? 'month',
            startDate: queryOrPeriod.startDate,
            endDate: queryOrPeriod.endDate,
            status: queryOrPeriod.status,
            minAmount: queryOrPeriod.minAmount,
            maxAmount: queryOrPeriod.maxAmount,
            topLimit: queryOrPeriod.topLimit
          };

    return this.client.get<ApiResponse<StoreAnalytics>>(`/analytics/stores/${storeId}`, {
      params
    });
  }

  /**
   * Отримання платформної аналітики (GET /analytics/platform)
   */
  async getPlatformAnalytics(
    query?: Partial<AnalyticsQuery>
  ): Promise<ApiResponse<PlatformAnalytics>> {
    const params: Record<string, string | number | boolean | undefined> | undefined = query
      ? {
          period: query.period ?? 'all',
          startDate: query.startDate,
          endDate: query.endDate,
          status: query.status,
          minAmount: query.minAmount,
          maxAmount: query.maxAmount,
          storeId: query.storeId,
          topLimit: query.topLimit
        }
      : undefined;

    return this.client.get<ApiResponse<PlatformAnalytics>>('/analytics/platform', {
      params
    });
  }
}
