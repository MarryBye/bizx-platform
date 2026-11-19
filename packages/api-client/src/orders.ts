import type { ApiClient } from './client';
import type {
  ApiResponse,
  OrderResponse,
  CreateOrderDto,
  UpdateOrderStatusDto,
  OrderMessageItem,
  SendOrderMessageDto,
  OrderMessageAttachmentDto,
  CreateRefundOfferDto,
  RespondRefundOfferDto,
  OrderDisputeItem,
  CreateDisputeDto,
  EscalateDisputeDto,
  ResolveDisputeDto,
  PlatformDisputeListItem,
  StoreStrikeItem,
  RevokeStrikeDto,
  CreateStoreReviewDto,
  StoreReviewItem
} from '@bizx/common-types';

export interface EnrichedOrderResponse extends OrderResponse {
  storeName?: string | null;
  storeSlug?: string | null;
  storeLogoUrl?: string | null;
  itemsCount?: number;
  unreadCount?: number;
  activeDispute?: OrderDisputeItem | null;
  latestDispute?: OrderDisputeItem | null;
  review?: StoreReviewItem | null;
}

export interface CustomerOrderSummary extends EnrichedOrderResponse {
  storeName: string;
  storeSlug?: string | null;
  storeLogoUrl: string | null;
  itemsCount: number;
}

export interface StoreUnreadSummary {
  totalUnreadMessages: number;
  activeDisputesCount: number;
}

export interface CustomerUnreadSummary {
  totalUnreadMessages: number;
  pendingRefundOffersCount: number;
}

export interface PlatformDisputesSummary {
  pendingEscalatedCount: number;
}

export interface PlatformDisputeDetail {
  dispute: PlatformDisputeListItem;
  order: EnrichedOrderResponse;
  messages: OrderMessageItem[];
  storeStrikes: StoreStrikeItem[];
}

export class OrdersModule {
  constructor(private client: ApiClient) {}

  async createOrder(dto: CreateOrderDto): Promise<ApiResponse<OrderResponse>> {
    return this.client.post<ApiResponse<OrderResponse>>('/orders', dto);
  }

  async getMyOrders(storeId?: string): Promise<ApiResponse<CustomerOrderSummary[]>> {
    return this.client.get<ApiResponse<CustomerOrderSummary[]>>('/orders/my', {
      params: storeId ? { storeId } : undefined
    });
  }

  async getMyUnreadSummary(storeId?: string): Promise<ApiResponse<CustomerUnreadSummary>> {
    return this.client.get<ApiResponse<CustomerUnreadSummary>>('/orders/my/unread-summary', {
      params: storeId ? { storeId } : undefined
    });
  }

  async getStoreOrders(storeId: string): Promise<ApiResponse<EnrichedOrderResponse[]>> {
    return this.client.get<ApiResponse<EnrichedOrderResponse[]>>(`/orders/store/${storeId}`);
  }

  async getStoreUnreadSummary(storeId: string): Promise<ApiResponse<StoreUnreadSummary>> {
    return this.client.get<ApiResponse<StoreUnreadSummary>>(
      `/orders/store/${storeId}/unread-summary`
    );
  }

  async getOrder(id: string): Promise<ApiResponse<EnrichedOrderResponse>> {
    return this.client.get<ApiResponse<EnrichedOrderResponse>>(`/orders/${id}`);
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto
  ): Promise<ApiResponse<OrderResponse>> {
    return this.client.patch<ApiResponse<OrderResponse>>(`/orders/${id}/status`, dto);
  }

  // ==================== ORDER CHAT ====================

  async getMessages(orderId: string): Promise<ApiResponse<OrderMessageItem[]>> {
    return this.client.get<ApiResponse<OrderMessageItem[]>>(`/orders/${orderId}/messages`);
  }

  async sendMessage(
    orderId: string,
    dto: SendOrderMessageDto
  ): Promise<ApiResponse<OrderMessageItem>> {
    return this.client.post<ApiResponse<OrderMessageItem>>(`/orders/${orderId}/messages`, dto);
  }

  async markMessagesRead(orderId: string): Promise<ApiResponse<{ updated: number }>> {
    return this.client.post<ApiResponse<{ updated: number }>>(
      `/orders/${orderId}/messages/read`,
      {}
    );
  }

  async uploadChatAttachment(
    orderId: string,
    fileOrFormData: unknown
  ): Promise<ApiResponse<OrderMessageAttachmentDto>> {
    let body: unknown;
    if (typeof FormData !== 'undefined' && fileOrFormData instanceof FormData) {
      body = fileOrFormData;
    } else if (typeof FormData !== 'undefined') {
      const fd = new FormData();
      fd.append('file', fileOrFormData as any);
      body = fd;
    } else {
      body = fileOrFormData;
    }
    return this.client.post<ApiResponse<OrderMessageAttachmentDto>>(
      `/orders/${orderId}/messages/upload`,
      body
    );
  }

  // ==================== QUICK REFUND OFFER (BUSINESS -> CUSTOMER) ====================

  async createRefundOffer(
    orderId: string,
    dto: CreateRefundOfferDto
  ): Promise<ApiResponse<EnrichedOrderResponse>> {
    return this.client.post<ApiResponse<EnrichedOrderResponse>>(
      `/orders/${orderId}/refund-offer`,
      dto
    );
  }

  async respondRefundOffer(
    orderId: string,
    dto: RespondRefundOfferDto
  ): Promise<ApiResponse<EnrichedOrderResponse>> {
    return this.client.post<ApiResponse<EnrichedOrderResponse>>(
      `/orders/${orderId}/refund-offer/respond`,
      dto
    );
  }

  // ==================== DISPUTES (CUSTOMER <-> STORE <-> BIZX PLATFORM) ====================

  async openDispute(
    orderId: string,
    dto: CreateDisputeDto
  ): Promise<ApiResponse<OrderDisputeItem>> {
    return this.client.post<ApiResponse<OrderDisputeItem>>(`/orders/${orderId}/disputes`, dto);
  }

  async withdrawDispute(
    orderId: string,
    disputeId: string
  ): Promise<ApiResponse<OrderDisputeItem>> {
    return this.client.post<ApiResponse<OrderDisputeItem>>(
      `/orders/${orderId}/disputes/${disputeId}/withdraw`,
      {}
    );
  }

  async escalateDispute(
    orderId: string,
    disputeId: string,
    dto?: EscalateDisputeDto
  ): Promise<ApiResponse<OrderDisputeItem>> {
    return this.client.post<ApiResponse<OrderDisputeItem>>(
      `/orders/${orderId}/disputes/${disputeId}/escalate`,
      dto || {}
    );
  }

  // ==================== STORE REVIEWS (STAR RATING) ====================

  async createReview(
    orderId: string,
    dto: CreateStoreReviewDto
  ): Promise<ApiResponse<StoreReviewItem>> {
    return this.client.post<ApiResponse<StoreReviewItem>>(`/orders/${orderId}/review`, dto);
  }

  // ==================== PLATFORM ARBITRATION & STRIKES ====================

  async getPlatformDisputes(status?: string): Promise<ApiResponse<PlatformDisputeListItem[]>> {
    return this.client.get<ApiResponse<PlatformDisputeListItem[]>>('/platform/disputes', {
      params: status ? { status } : undefined
    });
  }

  async getPlatformDisputesSummary(): Promise<ApiResponse<PlatformDisputesSummary>> {
    return this.client.get<ApiResponse<PlatformDisputesSummary>>('/platform/disputes/summary');
  }

  async getPlatformDisputeDetail(disputeId: string): Promise<ApiResponse<PlatformDisputeDetail>> {
    return this.client.get<ApiResponse<PlatformDisputeDetail>>(`/platform/disputes/${disputeId}`);
  }

  async resolvePlatformDispute(
    disputeId: string,
    dto: ResolveDisputeDto
  ): Promise<ApiResponse<{ dispute: OrderDisputeItem; strikeIssued: boolean; storeSuspended: boolean }>> {
    return this.client.post<
      ApiResponse<{ dispute: OrderDisputeItem; strikeIssued: boolean; storeSuspended: boolean }>
    >(`/platform/disputes/${disputeId}/resolve`, dto);
  }

  async getStoreStrikes(storeId: string): Promise<ApiResponse<StoreStrikeItem[]>> {
    return this.client.get<ApiResponse<StoreStrikeItem[]>>(`/platform/stores/${storeId}/strikes`);
  }

  async revokeStrike(
    strikeId: string,
    dto: RevokeStrikeDto
  ): Promise<ApiResponse<{ strike: StoreStrikeItem; storeSuspensionLifted: boolean }>> {
    return this.client.post<
      ApiResponse<{ strike: StoreStrikeItem; storeSuspensionLifted: boolean }>
    >(`/platform/strikes/${strikeId}/revoke`, dto);
  }
}
