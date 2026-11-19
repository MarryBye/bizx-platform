import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import { OrdersService, type EnrichedOrder } from './orders.service.js';
import { InboxService } from '../inbox/inbox.service.js';
import {
  orders,
  orderMessages,
  orderDisputes,
  storeStrikes,
  stores,
  users,
  eq,
  and,
  or,
  gt,
  isNull,
  inArray,
  desc,
  count,
  sql
} from '@bizx/database';
import type {
  CreateDisputeDto,
  EscalateDisputeDto,
  ResolveDisputeDto,
  IssueStoreStrikeDto,
  RevokeStrikeDto,
  OrderDisputeItem,
  PlatformDisputeListItem,
  StoreStrikeItem,
  DisputeCategory,
  DisputeStatus,
  OrderMessageItem
} from '@bizx/common-types';

const DISPUTE_CATEGORY_LABELS_UK: Record<string, string> = {
  not_received: 'Товар не прийшов',
  damaged: 'Товар пошкоджено або брак',
  wrong_item: 'Привезли не той товар',
  missing_items: 'Неповна комплектація',
  poor_quality: 'Низька якість товару',
  other: 'Інше'
};

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
export class DisputesService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly rbacService: RbacService,
    private readonly ordersService: OrdersService,
    private readonly inboxService: InboxService
  ) {}

  private async countActiveStrikes(storeId: string): Promise<number> {
    const now = new Date();
    const [res] = await this.databaseService.db
      .select({ cnt: count() })
      .from(storeStrikes)
      .where(
        and(
          eq(storeStrikes.storeId, storeId),
          isNull(storeStrikes.revokedAt),
          or(isNull(storeStrikes.expiresAt), gt(storeStrikes.expiresAt, now))
        )
      );
    return Number(res?.cnt || 0);
  }

  // ==================== КЛІЄНТСЬКІ ДІЇ ПО СПОРАХ ====================

  async openDispute(
    orderId: string,
    userId: string,
    dto: CreateDisputeDto
  ): Promise<OrderDisputeItem> {
    const [order] = await this.databaseService.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    if (!order) {
      throw new NotFoundException('Замовлення не знайдено');
    }
    if (order.customerId !== userId) {
      throw new ForbiddenException('Відкрити спір може лише клієнт, який оформив замовлення');
    }
    if (order.status === 'cancelled' && order.paymentStatus === 'refunded') {
      throw new BadRequestException('Замовлення вже скасовано та кошти повернено');
    }

    const [existingActive] = await this.databaseService.db
      .select({ id: orderDisputes.id })
      .from(orderDisputes)
      .where(
        and(
          eq(orderDisputes.orderId, orderId),
          inArray(orderDisputes.status, ['open_store', 'escalated_platform'])
        )
      );

    if (existingActive) {
      throw new ConflictException('По цьому замовленню вже відкрито активний спір');
    }

    const now = new Date();
    const created = await this.databaseService.db.transaction(async (tx) => {
      const [dispute] = await tx
        .insert(orderDisputes)
        .values({
          orderId,
          storeId: order.storeId,
          customerId: userId,
          category: dto.category,
          description: dto.description.trim(),
          status: 'open_store'
        })
        .returning();

      const catLabel = DISPUTE_CATEGORY_LABELS_UK[dto.category] || dto.category;
      await tx.insert(orderMessages).values({
        orderId,
        senderId: userId,
        senderType: 'system',
        body: `Клієнт відкрив спір (${catLabel}): ${dto.description.trim()}. Замовлення позначено високим пріоритетом для закладу.`,
        attachments: [],
        readByCustomerAt: now,
        readByStoreAt: null
      });

      return dispute;
    });

    return serializeDispute(created);
  }

  async withdrawDispute(
    orderId: string,
    disputeId: string,
    userId: string
  ): Promise<OrderDisputeItem> {
    const [dispute] = await this.databaseService.db
      .select()
      .from(orderDisputes)
      .where(and(eq(orderDisputes.id, disputeId), eq(orderDisputes.orderId, orderId)));

    if (!dispute) {
      throw new NotFoundException('Спір не знайдено');
    }
    if (dispute.customerId !== userId) {
      throw new ForbiddenException('Відкликати спір може лише клієнт');
    }
    if (!['open_store', 'escalated_platform'].includes(dispute.status)) {
      throw new BadRequestException('Цей спір вже закрито');
    }

    const [order] = await this.databaseService.db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));

    const now = new Date();
    const updated = await this.databaseService.db.transaction(async (tx) => {
      const [row] = await tx
        .update(orderDisputes)
        .set({
          status: 'withdrawn',
          resolvedAt: now,
          resolutionNote: 'Питання вирішено: клієнт самостійно відкликав скаргу без наслідків для бізнесу.',
          updatedAt: now
        })
        .where(eq(orderDisputes.id, disputeId))
        .returning();

      // Якщо замовлення вже доставлено і кошти були в холді, розморожуємо виплату закладу
      if (order && order.status === 'delivered' && order.payoutStatus === 'held') {
        await tx
          .update(orders)
          .set({ payoutStatus: 'released', updatedAt: now })
          .where(eq(orders.id, orderId));
        await tx
          .update(stores)
          .set({
            payoutBalance: sql`${stores.payoutBalance} + ${order.totalAmount}`,
            updatedAt: now
          })
          .where(eq(stores.id, order.storeId));
      }

      await tx.insert(orderMessages).values({
        orderId,
        senderId: userId,
        senderType: 'system',
        body: 'Клієнт підтвердив вирішення питання та відкликав скаргу. Спір закрито без наслідків для бізнесу.',
        attachments: [],
        readByCustomerAt: now,
        readByStoreAt: null
      });

      return row;
    });

    return serializeDispute(updated);
  }

  async escalateDispute(
    orderId: string,
    disputeId: string,
    userId: string,
    dto?: EscalateDisputeDto
  ): Promise<OrderDisputeItem> {
    const [dispute] = await this.databaseService.db
      .select()
      .from(orderDisputes)
      .where(and(eq(orderDisputes.id, disputeId), eq(orderDisputes.orderId, orderId)));

    if (!dispute) {
      throw new NotFoundException('Спір не знайдено');
    }
    if (dispute.customerId !== userId) {
      throw new ForbiddenException('Передати спір у BizX може лише клієнт');
    }
    if (dispute.status !== 'open_store') {
      throw new BadRequestException(
        dispute.status === 'escalated_platform'
          ? 'Скаргу вже передано на розгляд адміністрації BizX'
          : 'Цей спір вже закрито'
      );
    }

    const now = new Date();
    const updated = await this.databaseService.db.transaction(async (tx) => {
      const [row] = await tx
        .update(orderDisputes)
        .set({
          status: 'escalated_platform',
          escalatedAt: now,
          escalationReason: dto?.reason?.trim() || null,
          updatedAt: now
        })
        .where(eq(orderDisputes.id, disputeId))
        .returning();

      const extra = dto?.reason?.trim() ? ` Коментар: ${dto.reason.trim()}` : '';
      await tx.insert(orderMessages).values({
        orderId,
        senderId: userId,
        senderType: 'system',
        body: `Клієнт передав скаргу на розгляд співробітникам BizX.${extra}`,
        attachments: [],
        readByCustomerAt: now,
        readByStoreAt: null
      });

      return row;
    });

    return serializeDispute(updated);
  }

  // ==================== АРБІТРАЖ ПЛАТФОРМИ BIZX ТА СТРАЙКИ ====================

  async listPlatformDisputes(
    userId: string,
    statusFilter?: string
  ): Promise<PlatformDisputeListItem[]> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.disputes.read');

    const conds = [];
    if (statusFilter === 'escalated') {
      conds.push(eq(orderDisputes.status, 'escalated_platform'));
    } else if (statusFilter === 'resolved') {
      conds.push(
        inArray(orderDisputes.status, [
          'withdrawn',
          'resolved_refund',
          'resolved_business',
          'resolved_customer'
        ])
      );
    } else if (statusFilter === 'open') {
      conds.push(inArray(orderDisputes.status, ['open_store', 'escalated_platform']));
    }
    // default or 'all' returns all disputes (escalated first)

    const rows = await this.databaseService.db
      .select({
        dispute: orderDisputes,
        orderNumber: orders.orderNumber,
        orderTotalAmount: orders.totalAmount,
        orderStatus: orders.status,
        orderPayoutStatus: orders.payoutStatus,
        storeName: stores.name,
        storeSlug: stores.slug,
        storeStatus: stores.status,
        storeSuspendedUntil: stores.suspendedUntil,
        customerName: users.name,
        customerEmail: users.email,
        customerPhone: users.phone
      })
      .from(orderDisputes)
      .innerJoin(orders, eq(orderDisputes.orderId, orders.id))
      .innerJoin(stores, eq(orderDisputes.storeId, stores.id))
      .leftJoin(users, eq(orderDisputes.customerId, users.id))
      .where(conds.length > 0 ? and(...conds) : undefined)
      .orderBy(desc(orderDisputes.createdAt));

    if (rows.length === 0) return [];

    const storeIds = Array.from(new Set(rows.map((r) => r.dispute.storeId)));
    const orderIds = Array.from(new Set(rows.map((r) => r.dispute.orderId)));
    const now = new Date();

    const [strikeCounts, msgCounts] = await Promise.all([
      this.databaseService.db
        .select({ storeId: storeStrikes.storeId, cnt: count() })
        .from(storeStrikes)
        .where(
          and(
            inArray(storeStrikes.storeId, storeIds),
            isNull(storeStrikes.revokedAt),
            or(isNull(storeStrikes.expiresAt), gt(storeStrikes.expiresAt, now))
          )
        )
        .groupBy(storeStrikes.storeId),
      this.databaseService.db
        .select({ orderId: orderMessages.orderId, cnt: count() })
        .from(orderMessages)
        .where(inArray(orderMessages.orderId, orderIds))
        .groupBy(orderMessages.orderId)
    ]);

    const strikesMap = new Map(strikeCounts.map((s) => [s.storeId, Number(s.cnt)]));
    const msgsMap = new Map(msgCounts.map((m) => [m.orderId, Number(m.cnt)]));

    const mapped: PlatformDisputeListItem[] = rows.map((r) => ({
      ...serializeDispute(r.dispute),
      orderNumber: r.orderNumber,
      orderTotalAmount: r.orderTotalAmount,
      orderStatus: r.orderStatus,
      orderPayoutStatus: r.orderPayoutStatus,
      storeName: r.storeName,
      storeSlug: r.storeSlug,
      storeStatus: r.storeStatus,
      storeSuspendedUntil: r.storeSuspendedUntil ? r.storeSuspendedUntil.toISOString() : null,
      storeActiveStrikes: strikesMap.get(r.dispute.storeId) ?? 0,
      customerName: r.customerName || 'Клієнт',
      customerEmail: r.customerEmail,
      customerPhone: r.customerPhone,
      messagesCount: msgsMap.get(r.dispute.orderId) ?? 0
    }));

    // Escalated first, then open_store, then resolved
    const statusOrder = (st: string) =>
      st === 'escalated_platform' ? 0 : st === 'open_store' ? 1 : 2;
    return mapped.sort((a, b) => {
      const diff = statusOrder(a.status) - statusOrder(b.status);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  async getPlatformDisputesSummary(userId: string): Promise<{ pendingEscalatedCount: number }> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.disputes.read');
    const [res] = await this.databaseService.db
      .select({ cnt: count() })
      .from(orderDisputes)
      .where(eq(orderDisputes.status, 'escalated_platform'));
    return { pendingEscalatedCount: Number(res?.cnt || 0) };
  }

  async getPlatformDisputeDetail(
    disputeId: string,
    userId: string
  ): Promise<{
    dispute: PlatformDisputeListItem;
    order: EnrichedOrder;
    messages: OrderMessageItem[];
    storeStrikes: StoreStrikeItem[];
  }> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.disputes.read');

    const [row] = await this.databaseService.db
      .select({
        dispute: orderDisputes,
        orderNumber: orders.orderNumber,
        orderTotalAmount: orders.totalAmount,
        orderStatus: orders.status,
        orderPayoutStatus: orders.payoutStatus,
        storeName: stores.name,
        storeSlug: stores.slug,
        storeStatus: stores.status,
        storeSuspendedUntil: stores.suspendedUntil,
        customerName: users.name,
        customerEmail: users.email,
        customerPhone: users.phone
      })
      .from(orderDisputes)
      .innerJoin(orders, eq(orderDisputes.orderId, orders.id))
      .innerJoin(stores, eq(orderDisputes.storeId, stores.id))
      .leftJoin(users, eq(orderDisputes.customerId, users.id))
      .where(eq(orderDisputes.id, disputeId));

    if (!row) {
      throw new NotFoundException('Скаргу не знайдено');
    }

    const [order, messages, strikes] = await Promise.all([
      this.ordersService.getOrderById(row.dispute.orderId, userId),
      this.ordersService.getOrderMessages(row.dispute.orderId, userId),
      this.getStoreStrikes(row.dispute.storeId, userId)
    ]);

    const activeStrikesCount = strikes.filter((s) => s.isActive).length;

    const disputeItem: PlatformDisputeListItem = {
      ...serializeDispute(row.dispute),
      orderNumber: row.orderNumber,
      orderTotalAmount: row.orderTotalAmount,
      orderStatus: row.orderStatus,
      orderPayoutStatus: row.orderPayoutStatus,
      storeName: row.storeName,
      storeSlug: row.storeSlug,
      storeStatus: row.storeStatus,
      storeSuspendedUntil: row.storeSuspendedUntil ? row.storeSuspendedUntil.toISOString() : null,
      storeActiveStrikes: activeStrikesCount,
      customerName: row.customerName || 'Клієнт',
      customerEmail: row.customerEmail,
      customerPhone: row.customerPhone,
      messagesCount: messages.length
    };

    return { dispute: disputeItem, order, messages, storeStrikes: strikes };
  }

  async resolvePlatformDispute(
    disputeId: string,
    userId: string,
    dto: ResolveDisputeDto
  ): Promise<{ dispute: OrderDisputeItem; strikeIssued: boolean; storeSuspended: boolean }> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.disputes.resolve');

    const [dispute] = await this.databaseService.db
      .select()
      .from(orderDisputes)
      .where(eq(orderDisputes.id, disputeId));

    if (!dispute) {
      throw new NotFoundException('Скаргу не знайдено');
    }
    if (!['escalated_platform', 'open_store'].includes(dispute.status)) {
      throw new BadRequestException('Цю скаргу вже розглянуто та закрито');
    }

    const [order] = await this.databaseService.db
      .select()
      .from(orders)
      .where(eq(orders.id, dispute.orderId));

    if (!order) {
      throw new NotFoundException('Пов’язане замовлення не знайдено');
    }

    const now = new Date();
    let strikeIssued = false;
    let storeSuspended = false;

    const updatedDispute = await this.databaseService.db.transaction(async (tx) => {
      if (dto.decision === 'business') {
        const [resolved] = await tx
          .update(orderDisputes)
          .set({
            status: 'resolved_business',
            resolvedAt: now,
            resolvedByUserId: userId,
            resolutionNote: dto.resolutionNote.trim(),
            updatedAt: now
          })
          .where(eq(orderDisputes.id, disputeId))
          .returning();

        // Якщо замовлення вже доставлено і було в холді, переводимо кошти у виплату закладу
        if (order.status === 'delivered' && order.payoutStatus === 'held') {
          await tx
            .update(orders)
            .set({ payoutStatus: 'released', updatedAt: now })
            .where(eq(orders.id, order.id));
          await tx
            .update(stores)
            .set({
              payoutBalance: sql`${stores.payoutBalance} + ${order.totalAmount}`,
              updatedAt: now
            })
            .where(eq(stores.id, order.storeId));
        }

        await tx.insert(orderMessages).values({
          orderId: order.id,
          senderId: userId,
          senderType: 'system',
          body: `Рішення BizX: скаргу закрито на користь закладу. Коментар: ${dto.resolutionNote.trim()}`,
          attachments: [],
          readByCustomerAt: null,
          readByStoreAt: null
        });

        return resolved;
      }

      // Рішення на користь клієнта -> повернення з Escrow (або утримання clawback з виплат бізнесу)
      const [resolved] = await tx
        .update(orderDisputes)
        .set({
          status: 'resolved_customer',
          resolvedAt: now,
          resolvedByUserId: userId,
          resolutionNote: dto.resolutionNote.trim(),
          updatedAt: now
        })
        .where(eq(orderDisputes.id, disputeId))
        .returning();

      const wasReleased = order.payoutStatus === 'released';
      const nextPayoutStatus = wasReleased ? 'clawback' : 'refunded';

      await tx
        .update(orders)
        .set({
          status: 'cancelled',
          paymentStatus: 'refunded',
          payoutStatus: nextPayoutStatus,
          refundOfferStatus: null,
          updatedAt: now
        })
        .where(eq(orders.id, order.id));

      if (wasReleased) {
        await tx
          .update(stores)
          .set({
            payoutBalance: sql`${stores.payoutBalance} - ${order.totalAmount}`,
            updatedAt: now
          })
          .where(eq(stores.id, order.storeId));
      }

      if (dto.issueStrike) {
        const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 днів
        const [existingCountRow] = await tx
          .select({ cnt: count() })
          .from(storeStrikes)
          .where(
            and(
              eq(storeStrikes.storeId, order.storeId),
              isNull(storeStrikes.revokedAt),
              or(isNull(storeStrikes.expiresAt), gt(storeStrikes.expiresAt, now))
            )
          );
        const currentActiveCount = Number(existingCountRow?.cnt || 0);
        const willTriggerSuspension = currentActiveCount + 1 >= 3;
        const suspDays = willTriggerSuspension ? (dto.suspensionDays ?? 7) : null;

        await tx.insert(storeStrikes).values({
          storeId: order.storeId,
          disputeId,
          issuedByUserId: userId,
          reason: (dto.strikeReason?.trim() || dto.resolutionNote.trim()),
          suspensionDays: suspDays,
          expiresAt
        });
        strikeIssued = true;

        if (willTriggerSuspension) {
          const suspendedUntil =
            dto.suspensionDays === null
              ? null
              : new Date(now.getTime() + (dto.suspensionDays ?? 7) * 24 * 60 * 60 * 1000);
          const durationLabel =
            dto.suspensionDays === null
              ? 'до ручного зняття адміністратором BizX'
              : `на ${dto.suspensionDays ?? 7} дн.`;

          await tx
            .update(stores)
            .set({
              status: 'suspended',
              suspendedUntil,
              suspensionReason: `Автоматичне призупинення через 3 активні страйки (${durationLabel}).`,
              updatedAt: now
            })
            .where(eq(stores.id, order.storeId));
          storeSuspended = true;
        }
      }

      const amountUah = (order.totalAmount / 100).toFixed(2);
      const payoutExplain = wasReleased
        ? 'суму утримано з балансу виплат закладу'
        : 'кошти повернено з резерву замовлення';
      const strikeNote = storeSuspended
        ? ' Закладу видано 3-й страйк — роботу закладу призупинено.'
        : strikeIssued
          ? ' Закладу видано страйк.'
          : '';

      await tx.insert(orderMessages).values({
        orderId: order.id,
        senderId: userId,
        senderType: 'system',
        body: `Рішення BizX: скаргу вирішено на користь клієнта. Замовлення скасовано, повернення ${amountUah} ₴ (${payoutExplain}).${strikeNote} Коментар: ${dto.resolutionNote.trim()}`,
        attachments: [],
        readByCustomerAt: null,
        readByStoreAt: null
      });

      return resolved;
    });

    return {
      dispute: serializeDispute(updatedDispute),
      strikeIssued,
      storeSuspended
    };
  }

  async getStoreStrikes(storeId: string, userId: string): Promise<StoreStrikeItem[]> {
    // Allow platform staff (disputes.read or stores.read) OR store members (store.read)
    let allowed = false;
    try {
      const plat = await this.rbacService.getPlatformMemberAccess(userId);
      if (
        plat.permissions.includes('platform.disputes.read') ||
        plat.permissions.includes('platform.stores.read')
      ) {
        allowed = true;
      }
    } catch {
      // ignore
    }

    if (!allowed) {
      await this.rbacService.assertStorePermission(storeId, userId, 'store.read', { write: false });
    }

    const rows = await this.databaseService.db
      .select()
      .from(storeStrikes)
      .where(eq(storeStrikes.storeId, storeId))
      .orderBy(desc(storeStrikes.createdAt));

    const userIds = Array.from(
      new Set(
        rows
          .flatMap((r) => [r.issuedByUserId, r.revokedByUserId])
          .filter((id): id is string => Boolean(id))
      )
    );
    const userMap = new Map<string, string>();
    if (userIds.length > 0) {
      const uRows = await this.databaseService.db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, userIds));
      for (const u of uRows) {
        userMap.set(u.id, u.name);
      }
    }

    const now = new Date();
    return rows.map((r) => ({
      id: r.id,
      storeId: r.storeId,
      disputeId: r.disputeId,
      issuedByUserId: r.issuedByUserId,
      issuedByName: r.issuedByUserId ? userMap.get(r.issuedByUserId) || null : null,
      reason: r.reason,
      suspensionDays: r.suspensionDays,
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
      revokedByUserId: r.revokedByUserId,
      revokedByName: r.revokedByUserId ? userMap.get(r.revokedByUserId) || null : null,
      revokeReason: r.revokeReason,
      isActive: !r.revokedAt && (!r.expiresAt || r.expiresAt > now),
      createdAt: r.createdAt.toISOString()
    }));
  }

  async revokeStrike(
    strikeId: string,
    userId: string,
    dto: RevokeStrikeDto
  ): Promise<{ strike: StoreStrikeItem; storeSuspensionLifted: boolean }> {
    // Виключно співробітники з правом platform.strikes.revoke!
    await this.rbacService.assertPlatformPermission(userId, 'platform.strikes.revoke');

    const [strike] = await this.databaseService.db
      .select()
      .from(storeStrikes)
      .where(eq(storeStrikes.id, strikeId));

    if (!strike) {
      throw new NotFoundException('Страйк не знайдено');
    }
    if (strike.revokedAt) {
      throw new BadRequestException('Цей страйк вже було знято раніше');
    }

    const now = new Date();
    let storeSuspensionLifted = false;

    const updatedStrike = await this.databaseService.db.transaction(async (tx) => {
      const [revoked] = await tx
        .update(storeStrikes)
        .set({
          revokedAt: now,
          revokedByUserId: userId,
          revokeReason: dto.revokeReason.trim()
        })
        .where(eq(storeStrikes.id, strikeId))
        .returning();

      const [remainingRes] = await tx
        .select({ cnt: count() })
        .from(storeStrikes)
        .where(
          and(
            eq(storeStrikes.storeId, strike.storeId),
            isNull(storeStrikes.revokedAt),
            or(isNull(storeStrikes.expiresAt), gt(storeStrikes.expiresAt, now))
          )
        );
      const remainingActive = Number(remainingRes?.cnt || 0);

      if (dto.liftSuspension !== false && remainingActive < 3) {
        const [store] = await tx
          .select({ id: stores.id, status: stores.status })
          .from(stores)
          .where(eq(stores.id, strike.storeId));

        if (store && store.status === 'suspended') {
          await tx
            .update(stores)
            .set({
              status: 'active',
              suspendedUntil: null,
              suspensionReason: null,
              updatedAt: now
            })
            .where(eq(stores.id, strike.storeId));
          storeSuspensionLifted = true;
        }
      }

      return revoked;
    });

    const [actor] = await this.databaseService.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId));

    return {
      strike: {
        id: updatedStrike.id,
        storeId: updatedStrike.storeId,
        disputeId: updatedStrike.disputeId,
        issuedByUserId: updatedStrike.issuedByUserId,
        reason: updatedStrike.reason,
        suspensionDays: updatedStrike.suspensionDays,
        expiresAt: updatedStrike.expiresAt ? updatedStrike.expiresAt.toISOString() : null,
        revokedAt: updatedStrike.revokedAt ? updatedStrike.revokedAt.toISOString() : null,
        revokedByUserId: updatedStrike.revokedByUserId,
        revokedByName: actor?.name || null,
        revokeReason: updatedStrike.revokeReason,
        isActive: false,
        createdAt: updatedStrike.createdAt.toISOString()
      },
      storeSuspensionLifted
    };
  }

  async issueManualStrike(
    storeId: string,
    userId: string,
    dto: IssueStoreStrikeDto
  ): Promise<{
    strike: StoreStrikeItem;
    activeStrikesCount: number;
    storeSuspended: boolean;
  }> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.strikes.issue');

    const [store] = await this.databaseService.db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId));

    if (!store) {
      throw new NotFoundException('Заклад не знайдено');
    }

    const now = new Date();
    const reason = dto.reason.trim();
    const existingActiveCount = await this.countActiveStrikes(storeId);
    const nextActiveCount = existingActiveCount + 1;
    const shouldSuspend = nextActiveCount >= 3;

    const suspensionDays =
      shouldSuspend && typeof dto.suspensionDays === 'number' && dto.suspensionDays > 0
        ? dto.suspensionDays
        : null;
    const suspendedUntil =
      shouldSuspend && suspensionDays
        ? new Date(now.getTime() + suspensionDays * 24 * 60 * 60 * 1000)
        : null;

    const inserted = await this.databaseService.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(storeStrikes)
        .values({
          storeId,
          disputeId: null,
          issuedByUserId: userId,
          reason,
          suspensionDays: shouldSuspend ? suspensionDays : null,
          expiresAt: null,
          createdAt: now
        })
        .returning();

      if (shouldSuspend) {
        await tx
          .update(stores)
          .set({
            status: 'suspended',
            suspendedUntil,
            suspensionReason: `Автоматичне блокування через ${nextActiveCount} активних страйків: ${reason}`,
            updatedAt: now
          })
          .where(eq(stores.id, storeId));
      }

      return created;
    });

    const [actor] = await this.databaseService.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId));

    const durationNote = shouldSuspend
      ? suspendedUntil
        ? `Роботу закладу призупинено на ${suspensionDays} дн. (до ${suspendedUntil.toLocaleDateString('uk-UA')}).`
        : 'Роботу закладу призупинено безстроково до рішення адміністрації BizX.'
      : `Усього активних страйків: ${nextActiveCount}/3. При досягненні 3 страйків роботу закладу буде автоматично призупинено.`;

    await this.inboxService
      .sendOfficialBizxMessage({
        userId: store.ownerId,
        senderName: 'BizX Арбітраж',
        subject: shouldSuspend
          ? `Заклад «${store.name}» призупинено (страйк ${nextActiveCount}/3)`
          : `Видано страйк закладу «${store.name}» (${nextActiveCount}/3)`,
        body: `Модератор BizX видав страйк закладу «${store.name}».\n\nПричина:\n${reason}\n\n${durationNote}`,
        relatedStoreId: store.id,
        canReply: false
      })
      .catch(() => {});

    return {
      strike: {
        id: inserted.id,
        storeId: inserted.storeId,
        disputeId: null,
        issuedByUserId: inserted.issuedByUserId,
        issuedByName: actor?.name || null,
        reason: inserted.reason,
        suspensionDays: inserted.suspensionDays,
        expiresAt: inserted.expiresAt ? inserted.expiresAt.toISOString() : null,
        revokedAt: null,
        revokedByUserId: null,
        revokedByName: null,
        revokeReason: null,
        isActive: true,
        createdAt: inserted.createdAt.toISOString()
      },
      activeStrikesCount: nextActiveCount,
      storeSuspended: shouldSuspend
    };
  }
}
