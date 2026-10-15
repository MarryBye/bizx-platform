import type { ApiClient } from './client';
import type {
  ApiResponse,
  StoreAnalytics,
  PlatformAnalytics,
  AnalyticsPeriod
} from '@bizx/common-types';

export class AnalyticsModule {
  constructor(private client: ApiClient) {}

  /**
   * Отримання аналітики магазину (GET /analytics/stores/:storeId)
   */
  async getStoreAnalytics(
    storeId: string,
    period: AnalyticsPeriod = 'month'
  ): Promise<ApiResponse<StoreAnalytics>> {
    return this.client.get<ApiResponse<StoreAnalytics>>(`/analytics/stores/${storeId}`, {
      params: { period }
    });
  }

  /**
   * Отримання платформної аналітики (GET /analytics/platform)
   */
  async getPlatformAnalytics(): Promise<ApiResponse<PlatformAnalytics>> {
    return this.client.get<ApiResponse<PlatformAnalytics>>('/analytics/platform');
  }
}
