import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { StoresService } from '../stores/stores.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import { StorageService } from '../storage/storage.service.js';
import { validateChatAttachmentFile, type UploadedFileDto } from '../common/file-upload.utils.js';
import {
  orders,
  orderItems,
  orderMessages,
  orderDisputes,
  storeReviews,
  products,
  stores,
  users,
  eq,
  and,
  ne,
  isNull,
  inArray,
  desc,
  asc,
  sql,
  count,
  type OrderRecord,
  type OrderItemRecord
} from '@bizx/database';
import type {
  CreateOrderDto,
  UpdateOrderStatusDto,
  SendOrderMessageDto,
  OrderMessageItem,
  OrderMessageAttachmentDto,
  CreateRefundOfferDto,
  RespondRefundOfferDto,
  CreateStoreReviewDto,
  StoreReviewItem,
  OrderDisputeItem,
  DisputeCategory,
  DisputeStatus,
  OrderMessageSenderType
} from '@bizx/common-types';

export interface EnrichedOrder extends OrderRecord {
  items: OrderItemRecord[];
  itemsCount: number;
  storeName?: string | null;
  storeSlug?: string | null;
  storeLogoUrl?: string | null;
  unreadCount: number;
  activeDispute: OrderDisputeItem | null;
  latestDispute: OrderDisputeItem | null;
  review: StoreReviewItem | null;
}

function serializeDispute(d: typeof orderDisputes.$inferSelect): OrderDisputeItem {
  return {
    id: d.id,
    orderId: d.orderId,
    storeId: d.storeId,
    customerId: d.customerId,
    category: d.category as DisputeCategory,
    description: d.description,
    status: d.status as DisputeStatus,
    escalatedAt: d.escalatedAt ? d.escalatedAt.toISOString() : null,
    escalationReason: d.escalationReason,
    resolvedAt: d.resolvedAt ? d.resolvedAt.toISOString() : null,
    resolvedByUserId: d.resolvedByUserId,
    resolutionNote: d.resolutionNote,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString()
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly storesService: StoresService,
    private readonly rbacService: RbacService,
    private readonly storageService: StorageService
  ) {}

  private generateOrderNumber(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `BX-${datePart}-${randomPart}`;
  }

  private async enrichOrdersBatch(
    baseOrders: Array<
      OrderRecord & {
        storeName?: string | null;
        storeSlug?: string | null;
        storeLogoUrl?: string | null;
      }
    >,
    viewerRole: 'customer' | 'store' | 'platform'
  ): Promise<EnrichedOrder[]> {
    if (baseOrders.length === 0) return [];
    const orderIds = baseOrders.map((o) => o.id);

    const [itemsRows, disputesRows, reviewsRows, unreadRows] = await Promise.all([
      this.databaseService.db
        .select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds)),
      this.databaseService.db
        .select()
        .from(orderDisputes)
        .where(inArray(orderDisputes.orderId, orderIds))
        .orderBy(desc(orderDisputes.createdAt)),
      this.databaseService.db
        .select({
          id: storeReviews.id,
          storeId: storeReviews.storeId,
          orderId: storeReviews.orderId,
          customerId: storeReviews.customerId,
          customerName: users.name,
          rating: storeReviews.rating,
          comment: storeReviews.comment,
          createdAt: storeReviews.createdAt
        })
        .from(storeReviews)
        .leftJoin(users, eq(storeReviews.customerId, users.id))
        .where(inArray(storeReviews.orderId, orderIds)),
      viewerRole === 'platform'
        ? Promise.resolve([] as Array<{ orderId: string; cnt: number }>)
        : viewerRole === 'store'
          ? this.databaseService.db
              .select({ orderId: orderMessages.orderId, cnt: count() })
              .from(orderMessages)
              .where(
                and(
                  inArray(orderMessages.orderId, orderIds),
                  eq(orderMessages.senderType, 'customer'),
                  isNull(orderMessages.readByStoreAt)
                )
              )
              .groupBy(orderMessages.orderId)
          : this.databaseService.db
              .select({ orderId: orderMessages.orderId, cnt: count() })
              .from(orderMessages)
              .where(
                and(
                  inArray(orderMessages.orderId, orderIds),
                  inArray(orderMessages.senderType, ['store', 'platform']),
                  isNull(orderMessages.readByCustomerAt)
                )
              )
              .groupBy(orderMessages.orderId)
    ]);

    const itemsByOrder = new Map<string, OrderItemRecord[]>();
    for (const item of itemsRows) {
      const list = itemsByOrder.get(item.orderId) || [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    const activeDisputeByOrder = new Map<string, OrderDisputeItem>();
    const latestDisputeByOrder = new Map<string, OrderDisputeItem>();
    for (const d of disputesRows) {
      const serialized = serializeDispute(d);
      if (!latestDisputeByOrder.has(d.orderId)) {
        latestDisputeByOrder.set(d.orderId, serialized);
      }
      if (
        (d.status === 'open_store' || d.status === 'escalated_platform') &&
        !activeDisputeByOrder.has(d.orderId)
      ) {
        activeDisputeByOrder.set(d.orderId, serialized);
      }
    }

    const reviewByOrder = new Map<string, StoreReviewItem>();
    for (const r of reviewsRows) {
      reviewByOrder.set(r.orderId, {
        id: r.id,
        storeId: r.storeId,
        orderId: r.orderId,
        customerId: r.customerId,
        customerName: r.customerName || 'Покупець',
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString()
      });
    }

    const unreadByOrder = new Map<string, number>();
    for (const u of unreadRows) {
      unreadByOrder.set(u.orderId, Number(u.cnt));
    }

    return baseOrders.map((o) => {
      const items = itemsByOrder.get(o.id) || [];
      return {
        ...o,
        items,
        itemsCount: items.reduce((sum, i) => sum + i.quantity, 0),
        unreadCount: unreadByOrder.get(o.id) || 0,
        activeDispute: activeDisputeByOrder.get(o.id) || null,
        latestDispute: latestDisputeByOrder.get(o.id) || null,
        review: reviewByOrder.get(o.id) || null
      };
    });
  }

  async createOrder(customerId: string, dto: CreateOrderDto): Promise<EnrichedOrder> {
    const [store] = await this.databaseService.db
      .select({ id: stores.id, status: stores.status, name: stores.name, slug: stores.slug, logoUrl: stores.logoUrl })
      .from(stores)
      .where(and(eq(stores.id, dto.storeId), isNull(stores.archivedAt)));

    if (!store) {
      throw new NotFoundException('Магазин не знайдено');
    }

    if (store.status !== 'active') {
      throw new BadRequestException('Замовлення в цьому закладі наразі недоступні');
    }

    const productIds = dto.items.map((item) => item.productId);
    const dbProducts = await this.databaseService.db
      .select()
      .from(products)
      .where(and(eq(products.storeId, dto.storeId), inArray(products.id, productIds)));

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let totalAmount = 0;
    const orderItemsToInsert: {
      productId: string;
      productName: string;
      unitPrice: number;
      quantity: number;
      totalPrice: number;
    }[] = [];

    for (const item of dto.items) {
      const prod = productMap.get(item.productId);
      if (!prod) {
        throw new NotFoundException(`Товар ID "${item.productId}" не знайдено в цьому закладі`);
      }
      if (!prod.isActive) {
        throw new BadRequestException(`Товар "${prod.name}" наразі недоступний`);
      }
      if (prod.inventoryCount < item.quantity) {
        throw new BadRequestException(
          `Недостатньо товару "${prod.name}" на складі (в наявності: ${prod.inventoryCount})`
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

    const created = await this.databaseService.db.transaction(async (tx) => {
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
          payoutStatus: 'held',
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
        items: createdItems,
        itemsCount: createdItems.reduce((s, i) => s + i.quantity, 0),
        storeName: store.name,
        storeSlug: store.slug,
        storeLogoUrl: store.logoUrl,
        unreadCount: 0,
        activeDispute: null,
        latestDispute: null,
        review: null
      };
    });

    return created;
  }

  async getMyOrders(customerId: string, storeId?: string): Promise<EnrichedOrder[]> {
    const conds = [eq(orders.customerId, customerId)];
    if (storeId) {
      conds.push(eq(orders.storeId, storeId));
    }

    const rows = await this.databaseService.db
      .select({
        order: orders,
        storeName: stores.name,
        storeSlug: stores.slug,
        storeLogoUrl: stores.logoUrl
      })
      .from(orders)
      .leftJoin(stores, eq(orders.storeId, stores.id))
      .where(and(...conds))
      .orderBy(desc(orders.createdAt));

    const flattened = rows.map((r) => ({
      ...r.order,
      storeName: r.storeName,
      storeSlug: r.storeSlug,
      storeLogoUrl: r.storeLogoUrl
    }));

    return this.enrichOrdersBatch(flattened, 'customer');
  }

  async getMyUnreadSummary(
    customerId: string,
    storeId?: string
  ): Promise<{ totalUnreadMessages: number; pendingRefundOffersCount: number }> {
    const orderConds = [eq(orders.customerId, customerId)];
    if (storeId) {
      orderConds.push(eq(orders.storeId, storeId));
    }

    const myOrderRows = await this.databaseService.db
      .select({ id: orders.id, refundOfferStatus: orders.refundOfferStatus })
      .from(orders)
      .where(and(...orderConds));

    if (myOrderRows.length === 0) {
      return { totalUnreadMessages: 0, pendingRefundOffersCount: 0 };
    }

    const orderIds = myOrderRows.map((o) => o.id);
    const pendingRefundOffersCount = myOrderRows.filter(
      (o) => o.refundOfferStatus === 'pending_customer'
    ).length;

    const [unreadRes] = await this.databaseService.db
      .select({ cnt: count() })
      .from(orderMessages)
      .where(
        and(
          inArray(orderMessages.orderId, orderIds),
          inArray(orderMessages.senderType, ['store', 'platform']),
          isNull(orderMessages.readByCustomerAt)
        )
      );

    return {
      totalUnreadMessages: Number(unreadRes?.cnt || 0),
      pendingRefundOffersCount
    };
  }

  async getStoreOrders(storeId: string, userId: string): Promise<EnrichedOrder[]> {
    await this.rbacService.assertStorePermission(storeId, userId, 'orders.read', {
      write: false,
      allowPlatformPermission: 'platform.stores.read'
    });

    const storeOrders = await this.databaseService.db
      .select()
      .from(orders)
      .where(eq(orders.storeId, storeId))
      .orderBy(desc(orders.createdAt));

    const enriched = await this.enrichOrdersBatch(storeOrders, 'store');

    // Сортування за пріоритетом: спочатку активні спори (ескальовані → відкриті), потім непрочитані, потім новіші
    const priorityRank = (o: EnrichedOrder) => {
      if (o.activeDispute?.status === 'escalated_platform') return 0;
      if (o.activeDispute?.status === 'open_store') return 1;
      if (o.unreadCount > 0) return 2;
      return 3;
    };

    return enriched.sort((a, b) => {
      const diff = priorityRank(a) - priorityRank(b);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  async getStoreUnreadSummary(
    storeId: string,
    userId: string
  ): Promise<{ totalUnreadMessages: number; activeDisputesCount: number }> {
    await this.rbacService.assertStorePermission(storeId, userId, 'orders.read', {
      write: false,
      allowPlatformPermission: 'platform.stores.read'
    });

    const [unreadRes, disputesRes] = await Promise.all([
      this.databaseService.db
        .select({ cnt: count() })
        .from(orderMessages)
        .innerJoin(orders, eq(orderMessages.orderId, orders.id))
        .where(
          and(
            eq(orders.storeId, storeId),
            eq(orderMessages.senderType, 'customer'),
            isNull(orderMessages.readByStoreAt)
          )
        ),
      this.databaseService.db
        .select({ cnt: count() })
        .from(orderDisputes)
        .where(
          and(
            eq(orderDisputes.storeId, storeId),
            inArray(orderDisputes.status, ['open_store', 'escalated_platform'])
          )
        )
    ]);

    return {
      totalUnreadMessages: Number(unreadRes[0]?.cnt || 0),
      activeDisputesCount: Number(disputesRes[0]?.cnt || 0)
    };
  }

  async getOrderById(orderId: string, userId: string): Promise<EnrichedOrder> {
    const [row] = await this.databaseService.db
      .select({
        order: orders,
        storeName: stores.name,
        storeSlug: stores.slug,
        storeLogoUrl: stores.logoUrl
      })
      .from(orders)
      .leftJoin(stores, eq(orders.storeId, stores.id))
      .where(eq(orders.id, orderId));

    if (!row) {
      throw new NotFoundException('Замовлення не знайдено');
    }

    const isCustomer = row.order.customerId === userId;
    let viewerRole: 'customer' | 'store' | 'platform' = 'customer';
    if (!isCustomer) {
      try {
        const res = await this.rbacService.assertStorePermission(
          row.order.storeId,
          userId,
          'orders.read',
          { write: false, allowPlatformPermission: 'platform.stores.read' }
        );
        viewerRole = res.viaPlatform ? 'platform' : 'store';
      } catch {
        await this.rbacService.assertPlatformPermission(userId, 'platform.disputes.read');
        viewerRole = 'platform';
      }
    }

    const [enriched] = await this.enrichOrdersBatch(
      [
        {
          ...row.order,
          storeName: row.storeName,
          storeSlug: row.storeSlug,
          storeLogoUrl: row.storeLogoUrl
        }
      ],
      viewerRole
    );

    return enriched;
  }

  async updateOrderStatus(
    orderId: string,
    userId: string,
    dto?: UpdateOrderStatusDto
  ): Promise<OrderRecord> {
    const [order] = await this.databaseService.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      throw new NotFoundException('Замовлення не знайдено');
    }

    await this.rbacService.assertStorePermission(order.storeId, userId, 'orders.edit', {
      write: true
    });

    const nextStatus = dto?.status ?? order.status;
    const nextPaymentStatus = dto?.paymentStatus ?? order.paymentStatus;

    // Перевіряємо чи немає відкритого спору перед розмороженням Escrow
    const [activeDispute] = await this.databaseService.db
      .select({ id: orderDisputes.id })
      .from(orderDisputes)
      .where(
        and(
          eq(orderDisputes.orderId, orderId),
          inArray(orderDisputes.status, ['open_store', 'escalated_platform'])
        )
      );

    const shouldReleaseEscrow =
      nextStatus === 'delivered' && order.payoutStatus === 'held' && !activeDispute;

    return await this.databaseService.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(orders)
        .set({
          status: nextStatus,
          paymentStatus: nextPaymentStatus,
          ...(shouldReleaseEscrow ? { payoutStatus: 'released' } : {}),
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();

      if (shouldReleaseEscrow) {
        await tx
          .update(stores)
          .set({
            payoutBalance: sql`${stores.payoutBalance} + ${order.totalAmount}`,
            updatedAt: new Date()
          })
          .where(eq(stores.id, order.storeId));
      }

      return updated;
    });
  }

  // ==================== ЧАТ ЗАМОВЛЕННЯ ====================

  async assertOrderChatAccess(
    orderId: string,
    userId: string,
    mode: 'read' | 'write'
  ): Promise<{ order: OrderRecord; actorType: 'customer' | 'store' | 'platform' }> {
    const [order] = await this.databaseService.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      throw new NotFoundException('Замовлення не знайдено');
    }

    if (order.customerId === userId) {
      return { order, actorType: 'customer' };
    }

    // Check store membership first
    try {
      const check = await this.rbacService.assertStorePermission(
        order.storeId,
        userId,
        mode === 'write' ? 'orders.edit' : 'orders.read',
        { write: mode === 'write' }
      );
      if (!check.viaPlatform) {
        return { order, actorType: 'store' };
      }
    } catch {
      // Fallback to platform dispute staff
    }

    if (mode === 'read') {
      const plat = await this.rbacService.getPlatformMemberAccess(userId);
      if (
        plat.permissions.includes('platform.disputes.read') ||
        plat.permissions.includes('platform.stores.read')
      ) {
        return { order, actorType: 'platform' };
      }
    } else {
      const plat = await this.rbacService.getPlatformMemberAccess(userId);
      if (plat.permissions.includes('platform.disputes.resolve')) {
        return { order, actorType: 'platform' };
      }
    }

    throw new ForbiddenException('Недостатньо прав для доступу до чату цього замовлення');
  }

  async getOrderMessages(orderId: string, userId: string): Promise<OrderMessageItem[]> {
    await this.assertOrderChatAccess(orderId, userId, 'read');

    const rows = await this.databaseService.db
      .select({
        msg: orderMessages,
        senderName: users.name
      })
      .from(orderMessages)
      .leftJoin(users, eq(orderMessages.senderId, users.id))
      .where(eq(orderMessages.orderId, orderId))
      .orderBy(asc(orderMessages.createdAt));

    return rows.map(({ msg, senderName }) => ({
      id: msg.id,
      orderId: msg.orderId,
      senderId: msg.senderId,
      senderName:
        msg.senderType === 'system'
          ? 'BizX'
          : msg.senderType === 'platform'
            ? senderName || 'Служба арбітражу BizX'
            : senderName || null,
      senderType: msg.senderType as OrderMessageSenderType,
      body: msg.body,
      attachments: (msg.attachments || []) as OrderMessageAttachmentDto[],
      readByCustomerAt: msg.readByCustomerAt ? msg.readByCustomerAt.toISOString() : null,
      readByStoreAt: msg.readByStoreAt ? msg.readByStoreAt.toISOString() : null,
      createdAt: msg.createdAt.toISOString()
    }));
  }

  async sendOrderMessage(
    orderId: string,
    userId: string,
    dto: SendOrderMessageDto
  ): Promise<OrderMessageItem> {
    const { actorType } = await this.assertOrderChatAccess(orderId, userId, 'write');
    const now = new Date();

    const [inserted] = await this.databaseService.db
      .insert(orderMessages)
      .values({
        orderId,
        senderId: userId,
        senderType: actorType,
        body: dto.body?.trim() || null,
        attachments: (dto.attachments || []) as OrderMessageAttachmentDto[],
        readByCustomerAt: actorType === 'customer' ? now : null,
        readByStoreAt: actorType === 'store' ? now : null
      })
      .returning();

    const [sender] = await this.databaseService.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId));

    return {
      id: inserted.id,
      orderId: inserted.orderId,
      senderId: inserted.senderId,
      senderName: sender?.name || null,
      senderType: inserted.senderType as OrderMessageSenderType,
      body: inserted.body,
      attachments: (inserted.attachments || []) as OrderMessageAttachmentDto[],
      readByCustomerAt: inserted.readByCustomerAt ? inserted.readByCustomerAt.toISOString() : null,
      readByStoreAt: inserted.readByStoreAt ? inserted.readByStoreAt.toISOString() : null,
      createdAt: inserted.createdAt.toISOString()
    };
  }

  async markOrderMessagesRead(orderId: string, userId: string): Promise<{ updated: number }> {
    const { actorType } = await this.assertOrderChatAccess(orderId, userId, 'read');
    if (actorType === 'platform') {
      return { updated: 0 };
    }

    const now = new Date();
    if (actorType === 'customer') {
      const updated = await this.databaseService.db
        .update(orderMessages)
        .set({ readByCustomerAt: now })
        .where(
          and(
            eq(orderMessages.orderId, orderId),
            ne(orderMessages.senderType, 'customer'),
            isNull(orderMessages.readByCustomerAt)
          )
        )
        .returning({ id: orderMessages.id });
      return { updated: updated.length };
    }

    const updated = await this.databaseService.db
      .update(orderMessages)
      .set({ readByStoreAt: now })
      .where(
        and(
          eq(orderMessages.orderId, orderId),
          eq(orderMessages.senderType, 'customer'),
          isNull(orderMessages.readByStoreAt)
        )
      )
      .returning({ id: orderMessages.id });
    return { updated: updated.length };
  }

  async uploadChatAttachment(
    orderId: string,
    userId: string,
    rawFile?: UploadedFileDto
  ): Promise<OrderMessageAttachmentDto> {
    await this.assertOrderChatAccess(orderId, userId, 'write');
    const file = validateChatAttachmentFile(rawFile);
    const fileKey = this.storageService.generateFileKey('order-chat', file.originalname);
    const publicUrl = await this.storageService.uploadBuffer(fileKey, file.buffer, file.mimetype);

    return {
      url: publicUrl,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size
    };
  }

  // ==================== ШВИДКЕ ПОВЕРНЕННЯ (БІЗНЕС -> ПІДТВЕРДЖЕННЯ КЛІЄНТА) ====================

  async createRefundOffer(
    orderId: string,
    userId: string,
    dto: CreateRefundOfferDto
  ): Promise<EnrichedOrder> {
    const [order] = await this.databaseService.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      throw new NotFoundException('Замовлення не знайдено');
    }

    // Окреме гранулярне право на швидкі повернення: orders.refund
    await this.rbacService.assertStorePermission(order.storeId, userId, 'orders.refund', {
      write: true
    });

    if (order.status === 'cancelled' || order.paymentStatus === 'refunded') {
      throw new BadRequestException('Замовлення вже скасовано або кошти вже повернено');
    }

    if (order.refundOfferStatus === 'pending_customer') {
      throw new ConflictException('Пропозиція повернення вже очікує підтвердження клієнта');
    }

    const offerAmount = dto.amount ?? order.totalAmount;
    if (offerAmount > order.totalAmount) {
      throw new BadRequestException('Сума повернення не може перевищувати суму замовлення');
    }

    const now = new Date();
    await this.databaseService.db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({
          refundOfferStatus: 'pending_customer',
          refundOfferAmount: offerAmount,
          refundOfferReason: dto.reason.trim(),
          refundOfferedByUserId: userId,
          refundOfferedAt: now,
          updatedAt: now
        })
        .where(eq(orders.id, orderId));

      const amountUah = (offerAmount / 100).toFixed(2);
      await tx.insert(orderMessages).values({
        orderId,
        senderId: userId,
        senderType: 'system',
        body: `Заклад запропонував швидке повернення коштів на суму ${amountUah} ₴. Причина: ${dto.reason.trim()}. Очікується підтвердження клієнта.`,
        attachments: [],
        readByStoreAt: now,
        readByCustomerAt: null
      });
    });

    return this.getOrderById(orderId, userId);
  }

  async respondRefundOffer(
    orderId: string,
    userId: string,
    dto: RespondRefundOfferDto
  ): Promise<EnrichedOrder> {
    const [order] = await this.databaseService.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      throw new NotFoundException('Замовлення не знайдено');
    }

    if (order.customerId !== userId) {
      throw new ForbiddenException('Підтвердити або відхилити повернення може лише клієнт');
    }

    if (order.refundOfferStatus !== 'pending_customer') {
      throw new BadRequestException('Немає активної пропозиції повернення для підтвердження');
    }

    const now = new Date();
    const refundAmount = order.refundOfferAmount ?? order.totalAmount;

    await this.databaseService.db.transaction(async (tx) => {
      if (dto.accept) {
        const wasReleased = order.payoutStatus === 'released';
        const nextPayoutStatus = wasReleased ? 'clawback' : 'refunded';

        await tx
          .update(orders)
          .set({
            status: 'cancelled',
            paymentStatus: 'refunded',
            payoutStatus: nextPayoutStatus,
            refundOfferStatus: 'accepted',
            updatedAt: now
          })
          .where(eq(orders.id, orderId));

        // Якщо кошти вже встигли перейти у баланс виплат, утримуємо з майбутніх виплат (clawback)
        if (wasReleased) {
          await tx
            .update(stores)
            .set({
              payoutBalance: sql`${stores.payoutBalance} - ${refundAmount}`,
              updatedAt: now
            })
            .where(eq(stores.id, order.storeId));
        }

        // Закриваємо активний спір автоматично БЕЗ страйку
        await tx
          .update(orderDisputes)
          .set({
            status: 'resolved_refund',
            resolvedAt: now,
            resolutionNote: 'Закрито за взаємною згодою: клієнт підтвердив швидке повернення від закладу.',
            updatedAt: now
          })
          .where(
            and(
              eq(orderDisputes.orderId, orderId),
              inArray(orderDisputes.status, ['open_store', 'escalated_platform'])
            )
          );

        const amountUah = (refundAmount / 100).toFixed(2);
        await tx.insert(orderMessages).values({
          orderId,
          senderId: userId,
          senderType: 'system',
          body: `Клієнт підтвердив швидке повернення (${amountUah} ₴). Замовлення скасовано, кошти повернуто, спір закрито без санкцій.`,
          attachments: [],
          readByCustomerAt: now,
          readByStoreAt: null
        });
      } else {
        await tx
          .update(orders)
          .set({
            refundOfferStatus: 'declined',
            updatedAt: now
          })
          .where(eq(orders.id, orderId));

        await tx.insert(orderMessages).values({
          orderId,
          senderId: userId,
          senderType: 'system',
          body: 'Клієнт відхилив пропозицію швидкого повернення.',
          attachments: [],
          readByCustomerAt: now,
          readByStoreAt: null
        });
      }
    });

    return this.getOrderById(orderId, userId);
  }

  // ==================== ОЦІНКИ ЗАКЛАДУ (ЗІРОЧКИ 1..5) ====================

  async createOrderReview(
    orderId: string,
    userId: string,
    dto: CreateStoreReviewDto
  ): Promise<StoreReviewItem> {
    const [order] = await this.databaseService.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      throw new NotFoundException('Замовлення не знайдено');
    }

    if (order.customerId !== userId) {
      throw new ForbiddenException('Оцінити замовлення може лише його покупець');
    }

    if (order.status !== 'delivered') {
      throw new BadRequestException(
        'Оцінити заклад можна лише після успішного завершення замовлення (скасовані замовлення не оцінюються)'
      );
    }

    const [existing] = await this.databaseService.db
      .select({ id: storeReviews.id })
      .from(storeReviews)
      .where(eq(storeReviews.orderId, orderId));

    if (existing) {
      throw new ConflictException('Ви вже оцінили це замовлення');
    }

    const created = await this.databaseService.db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(storeReviews)
        .values({
          storeId: order.storeId,
          orderId,
          customerId: userId,
          rating: dto.rating,
          comment: dto.comment?.trim() || null
        })
        .returning();

      const [agg] = await tx
        .select({
          cnt: count(),
          avg: sql<string>`coalesce(avg(${storeReviews.rating}), 0)`
        })
        .from(storeReviews)
        .where(eq(storeReviews.storeId, order.storeId));

      const ratingCount = Number(agg?.cnt || 0);
      const ratingAvgScaled = Math.round(Number(agg?.avg || 0) * 100);

      await tx
        .update(stores)
        .set({
          ratingAvg: ratingAvgScaled,
          ratingCount,
          updatedAt: new Date()
        })
        .where(eq(stores.id, order.storeId));

      return inserted;
    });

    const [customer] = await this.databaseService.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId));

    return {
      id: created.id,
      storeId: created.storeId,
      orderId: created.orderId,
      customerId: created.customerId,
      customerName: customer?.name || 'Покупець',
      rating: created.rating,
      comment: created.comment,
      createdAt: created.createdAt.toISOString()
    };
  }
}
