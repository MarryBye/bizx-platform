import type { ApiClient } from './client';
import type {
  ApiResponse,
  OrderResponse,
  CreateOrderDto,
  UpdateOrderStatusDto
} from '@bizx/common-types';

export interface CustomerOrderSummary {
  id: string;
  orderNumber: string;
  storeId: string;
  storeName: string;
  storeLogoUrl: string | null;
  status: string;
  totalAmount: number;
  itemsCount: number;
  createdAt: string;
}

export class OrdersModule {
  constructor(private client: ApiClient) {}

  /**
   * Створення нового замовлення (POST /orders)
   */
  async createOrder(dto: CreateOrderDto): Promise<ApiResponse<OrderResponse>> {
    return this.client.post<ApiResponse<OrderResponse>>('/orders', dto);
  }

  /**
   * Отримання списку замовлень поточного клієнта (GET /orders/my)
   */
  async getMyOrders(): Promise<ApiResponse<CustomerOrderSummary[]>> {
    return this.client.get<ApiResponse<CustomerOrderSummary[]>>('/orders/my');
  }

  /**
   * Отримання замовлень магазину для бізнес-партнера (GET /orders/store/:storeId)
   */
  async getStoreOrders(storeId: string): Promise<ApiResponse<OrderResponse[]>> {
    return this.client.get<ApiResponse<OrderResponse[]>>(`/orders/store/${storeId}`);
  }

  /**
   * Отримання деталей замовлення за ID (GET /orders/:id)
   */
  async getOrder(id: string): Promise<ApiResponse<OrderResponse>> {
    return this.client.get<ApiResponse<OrderResponse>>(`/orders/${id}`);
  }

  /**
   * Оновлення статусу замовлення або оплати (PATCH /orders/:id/status)
   */
  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto
  ): Promise<ApiResponse<OrderResponse>> {
    return this.client.patch<ApiResponse<OrderResponse>>(`/orders/${id}/status`, dto);
  }
}
