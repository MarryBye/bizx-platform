import { encodePathSegment } from './path-utils';
import type { ApiClient } from './client';
import type {
  ApiResponse,
  StoreMarketingSubscriptionState,
  UpdateStoreMarketingSubscriptionDto,
  StoreBroadcastSummary,
  UpdateStoreBroadcastSettingsDto,
  SendStoreBroadcastDto,
  BroadcastCampaignItem,
  PlatformBroadcastSummary,
  SendPlatformBroadcastDto,
  PlatformSupportUnreadSummary,
  PlatformSupportThreadItem,
  InboxMessageItem,
  SendInboxMessageDto,
  UploadFileResponse
} from '@bizx/common-types';

function toFormData(fileOrFormData: unknown): unknown {
  if (typeof FormData !== 'undefined' && fileOrFormData instanceof FormData) {
    return fileOrFormData;
  }
  if (typeof FormData !== 'undefined') {
    const fd = new FormData();
    fd.append('file', fileOrFormData as any);
    return fd;
  }
  return fileOrFormData;
}

export class BroadcastsModule {
  constructor(private client: ApiClient) {}

  // ==================== ПІДПИСКИ КОРИСТУВАЧІВ НА ЗАКЛАДИ ====================

  async getStoreMarketingSubscription(
    storeId: string
  ): Promise<ApiResponse<StoreMarketingSubscriptionState>> {
    return this.client.get<ApiResponse<StoreMarketingSubscriptionState>>(
      `/stores/${storeId}/marketing-subscription`
    );
  }

  async updateStoreMarketingSubscription(
    storeId: string,
    dto: UpdateStoreMarketingSubscriptionDto
  ): Promise<ApiResponse<StoreMarketingSubscriptionState>> {
    return this.client.post<ApiResponse<StoreMarketingSubscriptionState>>(
      `/stores/${storeId}/marketing-subscription`,
      dto
    );
  }

  // ==================== РОЗСИЛКИ БІЗНЕСУ ====================

  async getStoreBroadcastSummary(storeId: string): Promise<ApiResponse<StoreBroadcastSummary>> {
    return this.client.get<ApiResponse<StoreBroadcastSummary>>(
      `/stores/${storeId}/broadcasts/summary`
    );
  }

  async updateStoreBroadcastSettings(
    storeId: string,
    dto: UpdateStoreBroadcastSettingsDto
  ): Promise<ApiResponse<{ autoDiscountBroadcastEnabled: boolean }>> {
    return this.client.patch<ApiResponse<{ autoDiscountBroadcastEnabled: boolean }>>(
      `/stores/${storeId}/broadcasts/settings`,
      dto
    );
  }

  async sendStoreBroadcast(
    storeId: string,
    dto: SendStoreBroadcastDto
  ): Promise<ApiResponse<BroadcastCampaignItem>> {
    return this.client.post<ApiResponse<BroadcastCampaignItem>>(
      `/stores/${storeId}/broadcasts`,
      dto
    );
  }

  async uploadStoreBroadcastImage(
    storeId: string,
    fileOrFormData: unknown
  ): Promise<ApiResponse<UploadFileResponse>> {
    return this.client.post<ApiResponse<UploadFileResponse>>(
      `/stores/${storeId}/broadcasts/upload`,
      toFormData(fileOrFormData)
    );
  }

  // ==================== РОЗСИЛКИ ПЛАТФОРМИ BIZX ====================

  async getPlatformBroadcastSummary(): Promise<ApiResponse<PlatformBroadcastSummary>> {
    return this.client.get<ApiResponse<PlatformBroadcastSummary>>('/platform/broadcasts');
  }

  async sendPlatformBroadcast(
    dto: SendPlatformBroadcastDto
  ): Promise<ApiResponse<BroadcastCampaignItem>> {
    return this.client.post<ApiResponse<BroadcastCampaignItem>>('/platform/broadcasts', dto);
  }

  async uploadPlatformBroadcastAttachment(
    fileOrFormData: unknown
  ): Promise<ApiResponse<UploadFileResponse>> {
    return this.client.post<ApiResponse<UploadFileResponse>>(
      '/platform/broadcasts/upload',
      toFormData(fileOrFormData)
    );
  }

  // ==================== КОНСОЛЬ ПІДТРИМКИ BIZX ====================

  async getPlatformSupportSummary(): Promise<ApiResponse<PlatformSupportUnreadSummary>> {
    return this.client.get<ApiResponse<PlatformSupportUnreadSummary>>('/platform/support/summary');
  }

  async getPlatformSupportThreads(): Promise<ApiResponse<PlatformSupportThreadItem[]>> {
    return this.client.get<ApiResponse<PlatformSupportThreadItem[]>>('/platform/support/threads');
  }

  async getPlatformSupportMessages(threadId: string): Promise<ApiResponse<InboxMessageItem[]>> {
    return this.client.get<ApiResponse<InboxMessageItem[]>>(
      `/platform/support/threads/${threadId}/messages`
    );
  }

  async replyToPlatformSupportThread(
    threadId: string,
    dto: SendInboxMessageDto
  ): Promise<ApiResponse<InboxMessageItem>> {
    return this.client.post<ApiResponse<InboxMessageItem>>(
      `/platform/support/threads/${threadId}/messages`,
      dto
    );
  }

  async markPlatformSupportThreadRead(
    threadId: string
  ): Promise<ApiResponse<{ updated: number }>> {
    return this.client.post<ApiResponse<{ updated: number }>>(
      `/platform/support/threads/${threadId}/read`,
      {}
    );
  }

  async uploadPlatformSupportAttachment(
    fileOrFormData: unknown,
    threadId?: string
  ): Promise<ApiResponse<UploadFileResponse>> {
    const url = threadId
      ? `/platform/support/threads/${encodePathSegment(threadId)}/upload`
      : '/platform/support/upload';
    return this.client.post<ApiResponse<UploadFileResponse>>(url, toFormData(fileOrFormData));
  }
}
