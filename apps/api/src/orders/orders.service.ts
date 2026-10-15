import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { StoresService } from '../stores/stores.service.js';
import {
  orders,
  orderItems,
  products,
  stores,
  eq,
  and,
  inArray,
  desc,
  sql,
  type OrderRecord,
  type OrderItemRecord
} from '@bizx/database';
import type { CreateOrderDto, UpdateOrderStatusDto, UserRole } from '@bizx/common-types';

export interface OrderWithItems extends OrderRecord {
  items: OrderItemRecord[];
}

export interface CustomerOrderSummary extends OrderRecord {
  storeName: string | null;
  storeSlug: string | null;
  storeLogoUrl: string | null;
  items: OrderItemRecord[];
}

export interface OrderDetailWithStore extends OrderRecord {
  storeName: string | null;
  storeOwnerId: string | null;
  items: OrderItemRecord[];
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storesService: StoresService
  ) {}

  private generateOrderNumber(): string {
    const timePart = Date.now().toString(36).toUpperCase();
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${timePart}-${randomPart}`;
  }

  async createOrder(customerId: string, dto: CreateOrderDto): Promise<OrderWithItems> {
    // 1. Проверяем существование и активность магазина
    const [store] = await this.databaseService.db
      .select({ id: stores.id, status: stores.status })
      .from(stores)
      .where(eq(stores.id, dto.storeId));

    if (!store) {
      throw new NotFoundException('Магазин не найден');
    }

    if (store.status !== 'active') {
      throw new BadRequestException('Магазин временно не принимает заказы');
    }

    // 2. Получаем товары из корзины
    const productIds = dto.items.map((item) => item.productId);
    const dbProducts = await this.databaseService.db
      .select()
      .from(products)
      .where(
        and(
          inArray(products.id, productIds),
          eq(products.storeId, dto.storeId),
          eq(products.isActive, true)
        )
      );

    if (dbProducts.length !== productIds.length) {
      throw new BadRequestException(
        'Один или несколько товаров не найдены или недоступны для заказа'
      );
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // 3. Формируем позиции заказа и подсчитываем итоговую сумму
    let totalAmount = 0;
    const orderItemsToInsert: Array<{
      productId: string;
      productName: string;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
    }> = [];

    for (const item of dto.items) {
      const prod = productMap.get(item.productId);
      if (!prod) {
        throw new BadRequestException(`Товар ${item.productId} не найден`);
      }

      // Проверка остатков
      if (prod.inventoryCount < item.quantity) {
        throw new BadRequestException(
          `Недостаточно товара "${prod.name}" на складе (в наличии: ${prod.inventoryCount})`
        );
      }

      const itemTotalPrice = prod.price * item.quantity;
      totalAmount += itemTotalPrice;

      orderItemsToInsert.push({
        productId: prod.id,
        productName: prod.name,
        unitPrice: prod.price,
        quantity: item.quantity,
        totalPrice: itemTotalPrice
      });
    }

    const orderNumber = this.generateOrderNumber();

    // 4. Запись в БД в транзакции
    return await this.databaseService.db.transaction(async (tx) => {
      const [newOrder] = await tx
        .insert(orders)
        .values({
          orderNumber,
          storeId: dto.storeId,
          customerId,
          status: 'pending',
          totalAmount,
          deliveryAddress: dto.deliveryAddress,
          contactPhone: dto.contactPhone,
          contactName: dto.contactName,
          paymentStatus: 'pending',
          paymentMethod: dto.paymentMethod || 'card',
          notes: dto.notes
        })
        .returning();

      const createdItems: OrderItemRecord[] = [];
      for (const item of orderItemsToInsert) {
        const [insertedItem] = await tx
          .insert(orderItems)
          .values({
            orderId: newOrder.id,
            productId: item.productId,
            productName: item.productName,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            totalPrice: item.totalPrice
          })
          .returning();

        createdItems.push(insertedItem);

        // Уменьшаем количество на складе
        await tx
          .update(products)
          .set({
            inventoryCount: sql`${products.inventoryCount} - ${item.quantity}`,
            updatedAt: new Date()
          })
          .where(eq(products.id, item.productId));
      }

      return {
        ...newOrder,
        items: createdItems
      };
    });
  }

  async getMyOrders(customerId: string): Promise<CustomerOrderSummary[]> {
    const userOrders = await this.databaseService.db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        storeId: orders.storeId,
        customerId: orders.customerId,
        status: orders.status,
        totalAmount: orders.totalAmount,
        deliveryAddress: orders.deliveryAddress,
        contactPhone: orders.contactPhone,
        contactName: orders.contactName,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        notes: orders.notes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        storeName: stores.name,
        storeSlug: stores.slug,
        storeLogoUrl: stores.logoUrl
      })
      .from(orders)
      .leftJoin(stores, eq(orders.storeId, stores.id))
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt));

    if (userOrders.length === 0) {
      return [];
    }

    const orderIds = userOrders.map((o) => o.id);
    const items = await this.databaseService.db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    const itemsByOrder = new Map<string, OrderItemRecord[]>();
    for (const item of items) {
      const existing = itemsByOrder.get(item.orderId) || [];
      existing.push(item);
      itemsByOrder.set(item.orderId, existing);
    }

    return userOrders.map((o) => ({
      ...o,
      items: itemsByOrder.get(o.id) || []
    }));
  }

  async getStoreOrders(
    storeId: string,
    userId: string,
    userRole: UserRole
  ): Promise<OrderWithItems[]> {
    await this.storesService.assertStoreOwnership(storeId, userId, userRole);

    const storeOrders = await this.databaseService.db
      .select()
      .from(orders)
      .where(eq(orders.storeId, storeId))
      .orderBy(desc(orders.createdAt));

    if (storeOrders.length === 0) {
      return [];
    }

    const orderIds = storeOrders.map((o) => o.id);
    const items = await this.databaseService.db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));

    const itemsByOrder = new Map<string, OrderItemRecord[]>();
    for (const item of items) {
      const existing = itemsByOrder.get(item.orderId) || [];
      existing.push(item);
      itemsByOrder.set(item.orderId, existing);
    }

    return storeOrders.map((o) => ({
      ...o,
      items: itemsByOrder.get(o.id) || []
    }));
  }

  async getOrderById(
    orderId: string,
    userId: string,
    userRole: UserRole
  ): Promise<OrderDetailWithStore> {
    const [order] = await this.databaseService.db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        storeId: orders.storeId,
        customerId: orders.customerId,
        status: orders.status,
        totalAmount: orders.totalAmount,
        deliveryAddress: orders.deliveryAddress,
        contactPhone: orders.contactPhone,
        contactName: orders.contactName,
        paymentStatus: orders.paymentStatus,
        paymentMethod: orders.paymentMethod,
        notes: orders.notes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        storeName: stores.name,
        storeOwnerId: stores.ownerId
      })
      .from(orders)
      .leftJoin(stores, eq(orders.storeId, stores.id))
      .where(eq(orders.id, orderId));

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    // Проверка прав доступа: покупатель, владелец магазина или админ
    const isCustomer = order.customerId === userId;
    const isOwner = order.storeOwnerId === userId;
    const isAdmin = userRole === 'admin';

    if (!isCustomer && !isOwner && !isAdmin) {
      throw new ForbiddenException('У вас нет доступа к этому заказу');
    }

    const items = await this.databaseService.db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));

    return {
      ...order,
      items
    };
  }

  async updateOrderStatus(
    orderId: string,
    userId: string,
    userRole: UserRole,
    dto: UpdateOrderStatusDto
  ): Promise<OrderRecord> {
    const [order] = await this.databaseService.db
      .select({
        id: orders.id,
        storeId: orders.storeId,
        status: orders.status,
        paymentStatus: orders.paymentStatus
      })
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      throw new NotFoundException('Заказ не найден');
    }

    await this.storesService.assertStoreOwnership(order.storeId, userId, userRole);

    const [updated] = await this.databaseService.db
      .update(orders)
      .set({
        status: dto.status ?? order.status,
        paymentStatus: dto.paymentStatus ?? order.paymentStatus,
        updatedAt: new Date()
      })
      .where(eq(orders.id, orderId))
      .returning();

    return updated;
  }
}
