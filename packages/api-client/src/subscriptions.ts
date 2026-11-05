import type { ApiClient } from './client';
import type {
  ApiResponse,
  SubscriptionPlan,
  SubscribeDto,
  UserSubscriptionDetails
} from '@bizx/common-types';

export class SubscriptionsModule {
  constructor(private client: ApiClient) {}

  /**
   * Отримати публічний список доступних тарифів BizX
   */
  async getPlans(): Promise<ApiResponse<SubscriptionPlan[]>> {
    return this.client.get<ApiResponse<SubscriptionPlan[]>>('/subscriptions/plans');
  }

  /**
   * Отримати поточний стан підписки авторизованого користувача
   */
  async getMySubscription(): Promise<ApiResponse<UserSubscriptionDetails>> {
    return this.client.get<ApiResponse<UserSubscriptionDetails>>('/subscriptions/me');
  }

  /**
   * Оформити або оновити тарифний план (тестова активація підписки)
   */
  async subscribe(dto: SubscribeDto): Promise<ApiResponse<UserSubscriptionDetails>> {
    return this.client.post<ApiResponse<UserSubscriptionDetails>>('/subscriptions/subscribe', dto);
  }

  /**
   * Скасувати діючу підписку
   */
  async cancel(): Promise<ApiResponse<UserSubscriptionDetails>> {
    return this.client.post<ApiResponse<UserSubscriptionDetails>>('/subscriptions/cancel', {});
  }
}
