import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import {
  stores,
  users,
  orders,
  products,
  inboxThreads,
  inboxMessages,
  storeMarketingSubscriptions,
  broadcastCampaigns,
  platformMembers,
  eq,
  and,
  or,
  gt,
  gte,
  ne,
  desc,
  asc,
  count,
  isNull,
  inArray,
  sql,
  type OrderMessageAttachment
} from '@bizx/database';
import {
  getDailyBroadcastLimitForTier,
  type SubscriptionTier,
  type StoreMarketingSubscriptionState,
  type UpdateStoreMarketingSubscriptionDto,
  type SendStoreBroadcastDto,
  type UpdateStoreBroadcastSettingsDto,
  type SendPlatformBroadcastDto,
  type BroadcastCampaignItem,
  type BroadcastCampaignType,
  type StoreBroadcastSummary,
  type PlatformBroadcastSummary,
  type PlatformSupportThreadItem,
  type PlatformSupportUnreadSummary,
  type InboxMessageItem,
  type InboxSenderType,
  type InboxBadgeType,
  type InboxMessageRole,
  type SendInboxMessageDto
} from '@bizx/common-types';
import {
  isSubscriptionActive,
  isBusinessSubscriptionTier
} from '../subscriptions/subscriptions.constants.js';

const CHUNK_SIZE = 250;
const AUTO_DISCOUNT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 години

function startOfUtcDay(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function formatPriceUah(kopecks: number): string {
  const uah = kopecks / 100;
  return Number.isInteger(uah) ? `${uah} ₴` : `${uah.toFixed(2)} ₴`;
}

@Injectable()
export class BroadcastsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly rbacService: RbacService
  ) {}

  // ============================================================================
  // 1. МАРКЕТИНГОВІ ПІДПИСКИ КОРИСТУВАЧІВ НА ЗАКЛАДИ (STRICT OPT-IN)
  // ============================================================================

  async getStoreMarketingSubscription(
    storeId: string,
    userId: string
  ): Promise<StoreMarketingSubscriptionState> {
    const [store] = await this.databaseService.db
      .select({ id: stores.id, status: stores.status, archivedAt: stores.archivedAt })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);

    if (!store) {
      throw new NotFoundException('Заклад не знайдено');
    }

    const [[subRow], [orderCountRow]] = await Promise.all([
      this.databaseService.db
        .select()
        .from(storeMarketingSubscriptions)
        .where(
          and(
            eq(storeMarketingSubscriptions.storeId, storeId),
            eq(storeMarketingSubscriptions.userId, userId)
          )
        )
        .limit(1),
      this.databaseService.db
        .select({ cnt: count() })
        .from(orders)
        .where(and(eq(orders.storeId, storeId), eq(orders.customerId, userId)))
    ]);

    const hasOrderedBefore = Number(orderCountRow?.cnt || 0) > 0;
    const status = subRow
      ? (subRow.status as 'subscribed' | 'unsubscribed')
      : ('none' as const);
    const subscribed = status === 'subscribed';
    const promptShown = Boolean(subRow?.promptShownAt || hasOrderedBefore);

    // Показуємо неотмічений opt-in чекбокс на checkout ЛИШЕ якщо:
    // 1) користувач ще не підписаний,
    // 2) користувач ще не відмовлявся / не бачив цей вибір при першому замовленні.
    const showCheckoutOptIn = !subscribed && !promptShown && status === 'none';

    return {
      storeId,
      subscribed,
      status,
      promptShown,
      hasOrderedBefore,
      showCheckoutOptIn,
      updatedAt: subRow ? subRow.updatedAt.toISOString() : null
    };
  }

  async updateStoreMarketingSubscription(
    storeId: string,
    userId: string,
    dto: UpdateStoreMarketingSubscriptionDto
  ): Promise<StoreMarketingSubscriptionState> {
    const [store] = await this.databaseService.db
      .select({ id: stores.id, status: stores.status, archivedAt: stores.archivedAt })
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);

    if (!store) {
      throw new NotFoundException('Заклад не знайдено');
    }

    // Підписатися можна лише на активний заклад; відписатися можна завжди (законне право)
    if (dto.subscribed && (store.status !== 'active' || store.archivedAt)) {
      throw new NotFoundException('Заклад не опубліковано або недоступний для підписки');
    }

    const now = new Date();
    const nextStatus = dto.subscribed ? 'subscribed' : 'unsubscribed';
    const nextSource =
      dto.source || (dto.subscribed ? 'storefront_button' : 'inbox_unsubscribe');

    const [existing] = await this.databaseService.db
      .select()
      .from(storeMarketingSubscriptions)
      .where(
        and(
          eq(storeMarketingSubscriptions.storeId, storeId),
          eq(storeMarketingSubscriptions.userId, userId)
        )
      )
      .limit(1);

    if (existing) {
      await this.databaseService.db
        .update(storeMarketingSubscriptions)
        .set({
          status: nextStatus,
          source: nextSource,
          updatedAt: now
        })
        .where(eq(storeMarketingSubscriptions.id, existing.id));
    } else {
      await this.databaseService.db.insert(storeMarketingSubscriptions).values({
        storeId,
        userId,
        status: nextStatus,
        source: nextSource,
        promptShownAt: null,
        createdAt: now,
        updatedAt: now
      });
    }

    return this.getStoreMarketingSubscription(storeId, userId);
  }

  /**
   * Фіксує вибір користувача на першому замовленні (Strict Opt-In).
   * Якщо запис вже існує (користувач раніше відмовився або вже підписаний) —
   * НІКОЛИ не перезаписує відмову при повторних замовленнях!
   */
  async recordFirstOrderCheckoutConsent(
    storeId: string,
    userId: string,
    optedIn?: boolean
  ): Promise<void> {
    const [existing] = await this.databaseService.db
      .select()
      .from(storeMarketingSubscriptions)
      .where(
        and(
          eq(storeMarketingSubscriptions.storeId, storeId),
          eq(storeMarketingSubscriptions.userId, userId)
        )
      )
      .limit(1);

    const now = new Date();
    if (!existing) {
      await this.databaseService.db.insert(storeMarketingSubscriptions).values({
        storeId,
        userId,
        status: optedIn === true ? 'subscribed' : 'unsubscribed',
        source: 'checkout_opt_in',
        promptShownAt: now,
        createdAt: now,
        updatedAt: now
      });
    } else if (!existing.promptShownAt) {
      // Якщо користувач підписався/відписався на вітрині до 1-го замовлення, просто фіксуємо promptShownAt,
      // не змінюючи його свідомий статус (окрім явного opt-in якщо раніше не було вибору — але existing вже має статус)
      await this.databaseService.db
        .update(storeMarketingSubscriptions)
        .set({ promptShownAt: now, updatedAt: now })
        .where(eq(storeMarketingSubscriptions.id, existing.id));
    }
  }

  // ============================================================================
  // 2. РОЗСИЛКИ БІЗНЕСУ (ПРОМО-КАМПАНІЇ + АВТО-ЗНИЖКИ)
  // ============================================================================

  private async resolveStoreDailyQuota(storeId: string, ownerId: string): Promise<{
    ownerTier: SubscriptionTier;
    hasActiveBusinessPlan: boolean;
    dailyLimit: number;
    usedToday: number;
    remainingToday: number;
  }> {
    const [[owner], [platRow], [usedRow]] = await Promise.all([
      this.databaseService.db
        .select({
          subscriptionTier: users.subscriptionTier,
          subscriptionStatus: users.subscriptionStatus,
          subscriptionExpiresAt: users.subscriptionExpiresAt
        })
        .from(users)
        .where(eq(users.id, ownerId))
        .limit(1),
      this.databaseService.db
        .select({ id: platformMembers.id })
        .from(platformMembers)
        .where(and(eq(platformMembers.userId, ownerId), isNull(platformMembers.archivedAt)))
        .limit(1),
      this.databaseService.db
        .select({ cnt: count() })
        .from(broadcastCampaigns)
        .where(
          and(
            eq(broadcastCampaigns.scope, 'store'),
            eq(broadcastCampaigns.storeId, storeId),
            gte(broadcastCampaigns.createdAt, startOfUtcDay())
          )
        )
    ]);

    const ownerTier = ((owner?.subscriptionTier as SubscriptionTier) || 'free') as SubscriptionTier;
    const isStaffOwner = Boolean(platRow);
    const hasActiveBusinessPlan =
      isStaffOwner ||
      (Boolean(owner) &&
        isSubscriptionActive({
          subscriptionTier: owner.subscriptionTier,
          subscriptionExpiresAt: owner.subscriptionExpiresAt,
          subscriptionStatus: owner.subscriptionStatus
        }) &&
        isBusinessSubscriptionTier(owner.subscriptionTier));

    const dailyLimit = isStaffOwner
      ? Math.max(getDailyBroadcastLimitForTier(ownerTier), 10)
      : hasActiveBusinessPlan
        ? getDailyBroadcastLimitForTier(ownerTier)
        : 0;
    const usedToday = Number(usedRow?.cnt || 0);
    const remainingToday = Math.max(0, dailyLimit - usedToday);

    return {
      ownerTier,
      hasActiveBusinessPlan,
      dailyLimit,
      usedToday,
      remainingToday
    };
  }

  async getStoreBroadcastSummary(
    storeId: string,
    userId: string
  ): Promise<StoreBroadcastSummary> {
    const { store } = await this.rbacService.assertStorePermission(
      storeId,
      userId,
      'marketing.broadcasts.read',
      { allowPlatformPermission: 'platform.stores.read', allowWhenSuspended: true }
    );

    const [subRows, quota, campaignRows] = await Promise.all([
      this.databaseService.db
        .select({
          status: storeMarketingSubscriptions.status,
          source: storeMarketingSubscriptions.source
        })
        .from(storeMarketingSubscriptions)
        .where(eq(storeMarketingSubscriptions.storeId, storeId)),
      this.resolveStoreDailyQuota(store.id, store.ownerId),
      this.databaseService.db
        .select({
          id: broadcastCampaigns.id,
          scope: broadcastCampaigns.scope,
          storeId: broadcastCampaigns.storeId,
          createdByUserId: broadcastCampaigns.createdByUserId,
          createdByName: users.name,
          createdByEmail: users.email,
          type: broadcastCampaigns.type,
          targetAudience: broadcastCampaigns.targetAudience,
          subject: broadcastCampaigns.subject,
          body: broadcastCampaigns.body,
          attachmentUrl: broadcastCampaigns.attachmentUrl,
          relatedProductId: broadcastCampaigns.relatedProductId,
          relatedProductName: products.name,
          recipientsCount: broadcastCampaigns.recipientsCount,
          createdAt: broadcastCampaigns.createdAt
        })
        .from(broadcastCampaigns)
        .leftJoin(users, eq(broadcastCampaigns.createdByUserId, users.id))
        .leftJoin(products, eq(broadcastCampaigns.relatedProductId, products.id))
        .where(and(eq(broadcastCampaigns.scope, 'store'), eq(broadcastCampaigns.storeId, storeId)))
        .orderBy(desc(broadcastCampaigns.createdAt))
        .limit(50)
    ]);

    const activeSubs = subRows.filter((s) => s.status === 'subscribed');
    const checkoutSubscribersCount = activeSubs.filter((s) => s.source === 'checkout_opt_in').length;
    const storefrontSubscribersCount = activeSubs.length - checkoutSubscribersCount;
    const unsubscribedCount = subRows.filter((s) => s.status === 'unsubscribed').length;

    return {
      storeId: store.id,
      storeName: store.name,
      storeStatus: store.status,
      ownerTier: quota.ownerTier,
      subscribersCount: activeSubs.length,
      checkoutSubscribersCount,
      storefrontSubscribersCount,
      unsubscribedCount,
      dailyLimit: quota.dailyLimit,
      usedToday: quota.usedToday,
      remainingToday: quota.remainingToday,
      autoDiscountBroadcastEnabled: store.autoDiscountBroadcastEnabled,
      campaigns: campaignRows.map((c) => ({
        id: c.id,
        scope: c.scope as 'platform' | 'store',
        storeId: c.storeId,
        storeName: store.name,
        createdByUserId: c.createdByUserId,
        createdByName: c.createdByName ?? null,
        createdByEmail: c.createdByEmail ?? null,
        type: c.type as BroadcastCampaignType,
        targetAudience: c.targetAudience || { kind: 'store_subscribers' },
        subject: c.subject,
        body: c.body,
        attachmentUrl: c.attachmentUrl ?? null,
        relatedProductId: c.relatedProductId ?? null,
        relatedProductName: c.relatedProductName ?? null,
        recipientsCount: c.recipientsCount,
        createdAt: c.createdAt.toISOString()
      }))
    };
  }

  async updateStoreBroadcastSettings(
    storeId: string,
    userId: string,
    dto: UpdateStoreBroadcastSettingsDto
  ): Promise<{ autoDiscountBroadcastEnabled: boolean }> {
    await this.rbacService.assertStorePermission(storeId, userId, 'marketing.broadcasts.send', {
      write: true
    });

    await this.databaseService.db
      .update(stores)
      .set({
        autoDiscountBroadcastEnabled: dto.autoDiscountBroadcastEnabled,
        updatedAt: new Date()
      })
      .where(eq(stores.id, storeId));

    return { autoDiscountBroadcastEnabled: dto.autoDiscountBroadcastEnabled };
  }

  private async dispatchInboxBatch(params: {
    recipientIds: string[];
    senderType: InboxSenderType;
    badgeType: InboxBadgeType;
    senderRole: InboxMessageRole;
    senderName: string;
    senderAvatarUrl?: string | null;
    senderStoreId?: string | null;
    relatedStoreId?: string | null;
    subject: string;
    body: string;
    attachmentUrl?: string | null;
    createdByUserId?: string | null;
  }): Promise<number> {
    if (params.recipientIds.length === 0) return 0;

    const now = new Date();
    const attachments: OrderMessageAttachment[] = params.attachmentUrl
      ? [
          {
            url: params.attachmentUrl,
            fileName: params.attachmentUrl.split('/').pop() || 'promo-image.jpg',
            mimeType: params.attachmentUrl.toLowerCase().endsWith('.pdf')
              ? 'application/pdf'
              : 'image/jpeg',
            size: 0
          }
        ]
      : [];

    const preview = params.body.slice(0, 200);
    let delivered = 0;

    for (let i = 0; i < params.recipientIds.length; i += CHUNK_SIZE) {
      const chunk = params.recipientIds.slice(i, i + CHUNK_SIZE);

      await this.databaseService.db.transaction(async (tx) => {
        const insertedThreads = await tx
          .insert(inboxThreads)
          .values(
            chunk.map((recipientId) => ({
              userId: recipientId,
              senderType: params.senderType,
              senderStoreId: params.senderStoreId ?? null,
              senderName: params.senderName.slice(0, 160),
              senderAvatarUrl: params.senderAvatarUrl ?? null,
              badgeType: params.badgeType,
              subject: params.subject.slice(0, 255),
              canReply: false,
              relatedStoreId: params.relatedStoreId ?? null,
              lastMessagePreview: preview,
              lastMessageAt: now,
              createdAt: now,
              updatedAt: now
            }))
          )
          .returning({ id: inboxThreads.id });

        if (insertedThreads.length > 0) {
          await tx.insert(inboxMessages).values(
            insertedThreads.map((t) => ({
              threadId: t.id,
              senderUserId: params.createdByUserId ?? null,
              senderRole: params.senderRole,
              senderName: params.senderName.slice(0, 160),
              body: params.body,
              attachments,
              readByRecipientAt: null,
              readByStaffAt: now,
              createdAt: now
            }))
          );
          delivered += insertedThreads.length;
        }
      });
    }

    return delivered;
  }

  async sendStoreBroadcast(
    storeId: string,
    userId: string,
    dto: SendStoreBroadcastDto
  ): Promise<BroadcastCampaignItem> {
    const { store } = await this.rbacService.assertStorePermission(
      storeId,
      userId,
      'marketing.broadcasts.send',
      { write: true }
    );

    if (store.status !== 'active' || store.archivedAt) {
      throw new ForbiddenException(
        'Рекламні розсилки доступні лише для активних опублікованих закладів'
      );
    }

    const quota = await this.resolveStoreDailyQuota(store.id, store.ownerId);
    if (!quota.hasActiveBusinessPlan || quota.dailyLimit <= 0) {
      throw new ForbiddenException(
        'Активна бізнес-підписка власника відсутня — рекламні розсилки тимчасово недоступні'
      );
    }
    if (quota.remainingToday <= 0) {
      throw new BadRequestException(
        `Вичерпано денний ліміт розсилок вашого тарифу (${quota.dailyLimit} на добу). Ліміт оновиться о 00:00 UTC.`
      );
    }

    let relatedProductName: string | null = null;
    let attachmentUrl = dto.attachmentUrl?.trim() || null;

    if (dto.relatedProductId) {
      const [prod] = await this.databaseService.db
        .select({
          id: products.id,
          name: products.name,
          storeId: products.storeId,
          imageUrl: products.imageUrl,
          archivedAt: products.archivedAt
        })
        .from(products)
        .where(eq(products.id, dto.relatedProductId))
        .limit(1);

      if (!prod || prod.storeId !== store.id || prod.archivedAt) {
        throw new BadRequestException('Обраний товар не належить цьому закладу або архівований');
      }
      relatedProductName = prod.name;
      if (!attachmentUrl && prod.imageUrl) {
        attachmentUrl = prod.imageUrl;
      }
    }

    // Отримуємо лише активних підписників цього закладу (які надали згоду й не заблоковані)
    const subscriberRows = await this.databaseService.db
      .select({ userId: storeMarketingSubscriptions.userId })
      .from(storeMarketingSubscriptions)
      .innerJoin(users, eq(storeMarketingSubscriptions.userId, users.id))
      .where(
        and(
          eq(storeMarketingSubscriptions.storeId, store.id),
          eq(storeMarketingSubscriptions.status, 'subscribed'),
          eq(users.status, 'active')
        )
      );

    const recipientIds = subscriberRows.map((r) => r.userId);
    if (recipientIds.length === 0) {
      throw new BadRequestException(
        'У закладу ще немає активних підписників на розсилку. Користувачі можуть підписатися на сторінці закладу або під час першого замовлення.'
      );
    }

    const recipientsCount = await this.dispatchInboxBatch({
      recipientIds,
      senderType: 'promo',
      badgeType: 'promo',
      senderRole: 'promo_business',
      senderName: store.name,
      senderAvatarUrl: store.logoUrl,
      senderStoreId: store.id,
      relatedStoreId: store.id,
      subject: dto.subject,
      body: dto.body,
      attachmentUrl,
      createdByUserId: userId
    });

    const [campaign] = await this.databaseService.db
      .insert(broadcastCampaigns)
      .values({
        scope: 'store',
        storeId: store.id,
        createdByUserId: userId,
        type: 'promo',
        targetAudience: { kind: 'store_subscribers', storeId: store.id },
        subject: dto.subject.slice(0, 255),
        body: dto.body,
        attachmentUrl,
        relatedProductId: dto.relatedProductId ?? null,
        recipientsCount
      })
      .returning();

    const [author] = await this.databaseService.db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      id: campaign.id,
      scope: 'store',
      storeId: store.id,
      storeName: store.name,
      createdByUserId: userId,
      createdByName: author?.name ?? null,
      createdByEmail: author?.email ?? null,
      type: 'promo',
      targetAudience: campaign.targetAudience,
      subject: campaign.subject,
      body: campaign.body,
      attachmentUrl: campaign.attachmentUrl ?? null,
      relatedProductId: campaign.relatedProductId ?? null,
      relatedProductName,
      recipientsCount: campaign.recipientsCount,
      createdAt: campaign.createdAt.toISOString()
    };
  }

  /**
   * Автоматична розсилка підписникам закладу при появі або суттєвому збільшенні знижки на товар.
   * Безпечна (ніколи не ламає збереження товару), дотримується 24-годинного cooldown на товар і денного ліміту тарифу.
   */
  async triggerAutoDiscountBroadcastIfEligible(params: {
    storeId: string;
    actorUserId: string;
    product: {
      id: string;
      name: string;
      price: number;
      oldPrice: number | null;
      imageUrl: string | null;
      isActive: boolean;
      archivedAt: Date | null;
    };
    previousPrice?: number | null;
    previousOldPrice?: number | null;
  }): Promise<boolean> {
    try {
      const { product } = params;
      if (!product.isActive || product.archivedAt) return false;
      if (!product.oldPrice || product.oldPrice <= product.price) return false;

      const newDiscountPct = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
      if (newDiscountPct < 5) return false;

      const hadPrevDiscount =
        Boolean(params.previousOldPrice) &&
        typeof params.previousPrice === 'number' &&
        (params.previousOldPrice as number) > params.previousPrice;

      if (hadPrevDiscount) {
        const prevPct = Math.round(
          (((params.previousOldPrice as number) - (params.previousPrice as number)) /
            (params.previousOldPrice as number)) *
            100
        );
        // Повторно відправляємо лише якщо знижка зросла щонайменше на +5%
        if (newDiscountPct < prevPct + 5) {
          return false;
        }
      }

      const [store] = await this.databaseService.db
        .select()
        .from(stores)
        .where(eq(stores.id, params.storeId))
        .limit(1);

      if (!store || store.status !== 'active' || store.archivedAt || !store.autoDiscountBroadcastEnabled) {
        return false;
      }

      // 24-годинний cooldown на той самий товар
      const cooldownSince = new Date(Date.now() - AUTO_DISCOUNT_COOLDOWN_MS);
      const [recentSameProduct] = await this.databaseService.db
        .select({ id: broadcastCampaigns.id })
        .from(broadcastCampaigns)
        .where(
          and(
            eq(broadcastCampaigns.scope, 'store'),
            eq(broadcastCampaigns.storeId, store.id),
            eq(broadcastCampaigns.relatedProductId, product.id),
            eq(broadcastCampaigns.type, 'auto_discount'),
            gt(broadcastCampaigns.createdAt, cooldownSince)
          )
        )
        .limit(1);

      if (recentSameProduct) return false;

      // Перевірка денної квоти тарифу
      const quota = await this.resolveStoreDailyQuota(store.id, store.ownerId);
      if (!quota.hasActiveBusinessPlan || quota.remainingToday <= 0) {
        return false;
      }

      const subscriberRows = await this.databaseService.db
        .select({ userId: storeMarketingSubscriptions.userId })
        .from(storeMarketingSubscriptions)
        .innerJoin(users, eq(storeMarketingSubscriptions.userId, users.id))
        .where(
          and(
            eq(storeMarketingSubscriptions.storeId, store.id),
            eq(storeMarketingSubscriptions.status, 'subscribed'),
            eq(users.status, 'active')
          )
        );

      const recipientIds = subscriberRows.map((r) => r.userId);
      if (recipientIds.length === 0) return false;

      const subject = `Знижка -${newDiscountPct}% на «${product.name}» у ${store.name}!`;
      const body = [
        `Спеціальна пропозиція від закладу «${store.name}»!`,
        ``,
        `Товар «${product.name}» тепер зі знижкою -${newDiscountPct}%:`,
        `Стара ціна: ${formatPriceUah(product.oldPrice)} → Нова ціна: ${formatPriceUah(product.price)}.`,
        ``,
        `Встигніть замовити на сторінці закладу BizX!`
      ].join('\n');

      const recipientsCount = await this.dispatchInboxBatch({
        recipientIds,
        senderType: 'promo',
        badgeType: 'promo',
        senderRole: 'promo_business',
        senderName: store.name,
        senderAvatarUrl: store.logoUrl,
        senderStoreId: store.id,
        relatedStoreId: store.id,
        subject,
        body,
        attachmentUrl: product.imageUrl,
        createdByUserId: params.actorUserId
      });

      await this.databaseService.db.insert(broadcastCampaigns).values({
        scope: 'store',
        storeId: store.id,
        createdByUserId: params.actorUserId,
        type: 'auto_discount',
        targetAudience: { kind: 'store_subscribers', storeId: store.id },
        subject: subject.slice(0, 255),
        body,
        attachmentUrl: product.imageUrl,
        relatedProductId: product.id,
        recipientsCount
      });

      return true;
    } catch (err) {
      console.error('[BroadcastsService] Auto-discount broadcast failed:', err);
      return false;
    }
  }

  // ============================================================================
  // 3. СИСТЕМНІ ТА ТЕХНІЧНІ РОЗСИЛКИ ПЛАТФОРМИ BIZX
  // ============================================================================

  async getPlatformBroadcastSummary(userId: string): Promise<PlatformBroadcastSummary> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.broadcasts.read');

    const [activeUsersRows, ownersRows, campaignRows] = await Promise.all([
      this.databaseService.db
        .select({
          id: users.id,
          subscriptionTier: users.subscriptionTier,
          subscriptionStatus: users.subscriptionStatus
        })
        .from(users)
        .where(eq(users.status, 'active')),
      this.databaseService.db
        .selectDistinct({ ownerId: stores.ownerId })
        .from(stores)
        .innerJoin(users, eq(stores.ownerId, users.id))
        .where(and(isNull(stores.archivedAt), eq(users.status, 'active'))),
      this.databaseService.db
        .select({
          id: broadcastCampaigns.id,
          scope: broadcastCampaigns.scope,
          storeId: broadcastCampaigns.storeId,
          createdByUserId: broadcastCampaigns.createdByUserId,
          createdByName: users.name,
          createdByEmail: users.email,
          type: broadcastCampaigns.type,
          targetAudience: broadcastCampaigns.targetAudience,
          subject: broadcastCampaigns.subject,
          body: broadcastCampaigns.body,
          attachmentUrl: broadcastCampaigns.attachmentUrl,
          relatedProductId: broadcastCampaigns.relatedProductId,
          recipientsCount: broadcastCampaigns.recipientsCount,
          createdAt: broadcastCampaigns.createdAt
        })
        .from(broadcastCampaigns)
        .leftJoin(users, eq(broadcastCampaigns.createdByUserId, users.id))
        .where(eq(broadcastCampaigns.scope, 'platform'))
        .orderBy(desc(broadcastCampaigns.createdAt))
        .limit(50)
    ]);

    const byTier: Record<SubscriptionTier, number> = {
      free: 0,
      client_premium: 0,
      business_starter: 0,
      business_pro: 0,
      business_enterprise: 0
    };
    for (const u of activeUsersRows) {
      const tier = (u.subscriptionTier || 'free') as SubscriptionTier;
      if (tier in byTier) {
        if (tier === 'free' || u.subscriptionStatus === 'active') {
          byTier[tier] += 1;
        }
      }
    }

    return {
      audienceCounts: {
        allUsers: activeUsersRows.length,
        businessOwners: ownersRows.length,
        byTier
      },
      campaigns: campaignRows.map((c) => ({
        id: c.id,
        scope: 'platform',
        storeId: c.storeId,
        createdByUserId: c.createdByUserId,
        createdByName: c.createdByName ?? null,
        createdByEmail: c.createdByEmail ?? null,
        type: c.type as BroadcastCampaignType,
        targetAudience: c.targetAudience || { kind: 'all' },
        subject: c.subject,
        body: c.body,
        attachmentUrl: c.attachmentUrl ?? null,
        relatedProductId: c.relatedProductId ?? null,
        recipientsCount: c.recipientsCount,
        createdAt: c.createdAt.toISOString()
      }))
    };
  }

  async sendPlatformBroadcast(
    userId: string,
    dto: SendPlatformBroadcastDto
  ): Promise<BroadcastCampaignItem> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.broadcasts.send');

    const audience = dto.targetAudience;
    let recipientIds: string[] = [];

    if (audience.kind === 'all') {
      const rows = await this.databaseService.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.status, 'active'));
      recipientIds = rows.map((r) => r.id);
    } else if (audience.kind === 'business_owners') {
      const rows = await this.databaseService.db
        .selectDistinct({ ownerId: stores.ownerId })
        .from(stores)
        .innerJoin(users, eq(stores.ownerId, users.id))
        .where(and(isNull(stores.archivedAt), eq(users.status, 'active')));
      recipientIds = rows.map((r) => r.ownerId);
    } else if (audience.kind === 'tier' && audience.tier) {
      const whereClause =
        audience.tier === 'free'
          ? and(eq(users.status, 'active'), eq(users.subscriptionTier, 'free'))
          : and(
              eq(users.status, 'active'),
              eq(users.subscriptionTier, audience.tier),
              eq(users.subscriptionStatus, 'active')
            );
      const rows = await this.databaseService.db
        .select({ id: users.id })
        .from(users)
        .where(whereClause);
      recipientIds = rows.map((r) => r.id);
    } else if (audience.kind === 'store_owner' && audience.storeId) {
      const [st] = await this.databaseService.db
        .select({ ownerId: stores.ownerId })
        .from(stores)
        .where(eq(stores.id, audience.storeId))
        .limit(1);
      if (!st) {
        throw new NotFoundException('Обраний заклад не знайдено');
      }
      recipientIds = [st.ownerId];
    } else if (audience.kind === 'user' && audience.userId) {
      const [targetUser] = await this.databaseService.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, audience.userId))
        .limit(1);
      if (!targetUser) {
        throw new NotFoundException('Обраного користувача не знайдено');
      }
      recipientIds = [targetUser.id];
    }

    if (recipientIds.length === 0) {
      throw new BadRequestException('За обраними критеріями не знайдено жодного активного одержувача');
    }

    const senderName =
      dto.type === 'technical' ? 'BizX Технічна служба' : 'BizX Офіційні новини';
    const attachmentUrl = dto.attachmentUrl?.trim() || null;

    const recipientsCount = await this.dispatchInboxBatch({
      recipientIds,
      senderType: 'bizx',
      badgeType: 'bizx',
      senderRole: 'system_bizx',
      senderName,
      relatedStoreId: audience.storeId ?? null,
      subject: dto.subject,
      body: dto.body,
      attachmentUrl,
      createdByUserId: userId
    });

    const [campaign] = await this.databaseService.db
      .insert(broadcastCampaigns)
      .values({
        scope: 'platform',
        storeId: audience.storeId ?? null,
        createdByUserId: userId,
        type: dto.type,
        targetAudience: audience,
        subject: dto.subject.slice(0, 255),
        body: dto.body,
        attachmentUrl,
        recipientsCount
      })
      .returning();

    const [author] = await this.databaseService.db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      id: campaign.id,
      scope: 'platform',
      storeId: campaign.storeId,
      createdByUserId: userId,
      createdByName: author?.name ?? null,
      createdByEmail: author?.email ?? null,
      type: dto.type,
      targetAudience: campaign.targetAudience,
      subject: campaign.subject,
      body: campaign.body,
      attachmentUrl: campaign.attachmentUrl ?? null,
      relatedProductId: null,
      recipientsCount: campaign.recipientsCount,
      createdAt: campaign.createdAt.toISOString()
    };
  }

  // ============================================================================
  // 4. КОНСОЛЬ ТЕХПІДТРИМКИ BIZX (ПОВНОЦІННІ ВІДПОВІДІ НА ТІКЕТИ ПОШТИ)
  // ============================================================================

  async getPlatformSupportSummary(userId: string): Promise<PlatformSupportUnreadSummary> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.support.read');

    const supportThreads = await this.databaseService.db
      .select({ id: inboxThreads.id })
      .from(inboxThreads)
      .where(eq(inboxThreads.senderType, 'support'));

    if (supportThreads.length === 0) {
      return { unreadThreadsCount: 0, unreadMessagesCount: 0, totalThreadsCount: 0 };
    }

    const threadIds = supportThreads.map((t) => t.id);
    const unreadRows = await this.databaseService.db
      .select({
        threadId: inboxMessages.threadId,
        cnt: count()
      })
      .from(inboxMessages)
      .where(
        and(
          inArray(inboxMessages.threadId, threadIds),
          eq(inboxMessages.senderRole, 'recipient'),
          isNull(inboxMessages.readByStaffAt)
        )
      )
      .groupBy(inboxMessages.threadId);

    let unreadMessagesCount = 0;
    for (const r of unreadRows) {
      unreadMessagesCount += Number(r.cnt || 0);
    }

    return {
      unreadThreadsCount: unreadRows.length,
      unreadMessagesCount,
      totalThreadsCount: supportThreads.length
    };
  }

  async getPlatformSupportThreads(userId: string): Promise<PlatformSupportThreadItem[]> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.support.read');

    const rows = await this.databaseService.db
      .select({
        id: inboxThreads.id,
        userId: inboxThreads.userId,
        senderType: inboxThreads.senderType,
        senderStoreId: inboxThreads.senderStoreId,
        senderName: inboxThreads.senderName,
        senderAvatarUrl: inboxThreads.senderAvatarUrl,
        badgeType: inboxThreads.badgeType,
        subject: inboxThreads.subject,
        canReply: inboxThreads.canReply,
        relatedStoreId: inboxThreads.relatedStoreId,
        lastMessagePreview: inboxThreads.lastMessagePreview,
        lastMessageAt: inboxThreads.lastMessageAt,
        createdAt: inboxThreads.createdAt,
        userName: users.name,
        userEmail: users.email,
        userPhone: users.phone,
        userAvatarUrl: users.avatarUrl
      })
      .from(inboxThreads)
      .leftJoin(users, eq(inboxThreads.userId, users.id))
      .where(eq(inboxThreads.senderType, 'support'))
      .orderBy(desc(inboxThreads.lastMessageAt))
      .limit(200);

    if (rows.length === 0) return [];

    const threadIds = rows.map((r) => r.id);
    const [unreadRows, totalMsgRows] = await Promise.all([
      this.databaseService.db
        .select({ threadId: inboxMessages.threadId, cnt: count() })
        .from(inboxMessages)
        .where(
          and(
            inArray(inboxMessages.threadId, threadIds),
            eq(inboxMessages.senderRole, 'recipient'),
            isNull(inboxMessages.readByStaffAt)
          )
        )
        .groupBy(inboxMessages.threadId),
      this.databaseService.db
        .select({ threadId: inboxMessages.threadId, cnt: count() })
        .from(inboxMessages)
        .where(inArray(inboxMessages.threadId, threadIds))
        .groupBy(inboxMessages.threadId)
    ]);

    const unreadMap = new Map<string, number>();
    for (const r of unreadRows) unreadMap.set(r.threadId, Number(r.cnt || 0));
    const totalMap = new Map<string, number>();
    for (const r of totalMsgRows) totalMap.set(r.threadId, Number(r.cnt || 0));

    return rows
      .map((t) => {
        const unreadByStaffCount = unreadMap.get(t.id) || 0;
        return {
          id: t.id,
          userId: t.userId,
          senderType: t.senderType as InboxSenderType,
          senderStoreId: t.senderStoreId,
          senderName: t.senderName,
          senderAvatarUrl: t.senderAvatarUrl,
          badgeType: (t.badgeType as InboxBadgeType) ?? 'support',
          subject: t.subject,
          canReply: t.canReply,
          relatedStoreId: t.relatedStoreId,
          lastMessagePreview: t.lastMessagePreview,
          lastMessageAt: t.lastMessageAt.toISOString(),
          unreadCount: unreadByStaffCount,
          unreadByStaffCount,
          messagesCount: totalMap.get(t.id) || 0,
          createdAt: t.createdAt.toISOString(),
          userName: t.userName ?? null,
          userEmail: t.userEmail ?? null,
          userPhone: t.userPhone ?? null,
          userAvatarUrl: t.userAvatarUrl ?? null
        };
      })
      .sort((a, b) => {
        if ((b.unreadByStaffCount > 0 ? 1 : 0) !== (a.unreadByStaffCount > 0 ? 1 : 0)) {
          return b.unreadByStaffCount > 0 ? 1 : -1;
        }
        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
      });
  }

  async getPlatformSupportMessages(
    threadId: string,
    userId: string
  ): Promise<InboxMessageItem[]> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.support.read');

    const [thread] = await this.databaseService.db
      .select({ id: inboxThreads.id, senderType: inboxThreads.senderType })
      .from(inboxThreads)
      .where(eq(inboxThreads.id, threadId))
      .limit(1);

    if (!thread || thread.senderType !== 'support') {
      throw new NotFoundException('Звернення до підтримки не знайдено');
    }

    const rows = await this.databaseService.db
      .select()
      .from(inboxMessages)
      .where(eq(inboxMessages.threadId, threadId))
      .orderBy(asc(inboxMessages.createdAt));

    return rows.map((m) => ({
      id: m.id,
      threadId: m.threadId,
      senderUserId: m.senderUserId,
      senderRole: m.senderRole as InboxMessageRole,
      senderName: m.senderName,
      body: m.body,
      attachments: (m.attachments as OrderMessageAttachment[]) || [],
      readByRecipientAt: m.readByRecipientAt ? m.readByRecipientAt.toISOString() : null,
      readByStaffAt: m.readByStaffAt ? m.readByStaffAt.toISOString() : null,
      createdAt: m.createdAt.toISOString()
    }));
  }

  async markPlatformSupportThreadRead(threadId: string, userId: string): Promise<{ updated: number }> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.support.read');

    const [thread] = await this.databaseService.db
      .select({ id: inboxThreads.id, senderType: inboxThreads.senderType })
      .from(inboxThreads)
      .where(eq(inboxThreads.id, threadId))
      .limit(1);

    if (!thread || thread.senderType !== 'support') {
      throw new NotFoundException('Звернення до підтримки не знайдено');
    }

    const updated = await this.databaseService.db
      .update(inboxMessages)
      .set({ readByStaffAt: new Date() })
      .where(
        and(
          eq(inboxMessages.threadId, threadId),
          eq(inboxMessages.senderRole, 'recipient'),
          isNull(inboxMessages.readByStaffAt)
        )
      )
      .returning({ id: inboxMessages.id });

    return { updated: updated.length };
  }

  async replyToPlatformSupportThread(
    threadId: string,
    staffUserId: string,
    dto: SendInboxMessageDto
  ): Promise<InboxMessageItem> {
    await this.rbacService.assertPlatformPermission(staffUserId, 'platform.support.reply');

    const [thread] = await this.databaseService.db
      .select()
      .from(inboxThreads)
      .where(eq(inboxThreads.id, threadId))
      .limit(1);

    if (!thread || thread.senderType !== 'support') {
      throw new NotFoundException('Звернення до підтримки не знайдено');
    }

    const [staff] = await this.databaseService.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, staffUserId))
      .limit(1);

    const senderName = staff?.name ? `${staff.name} · Підтримка BizX` : 'Служба підтримки BizX';
    const body = dto.body?.trim() || null;
    const attachments = (dto.attachments || []) as OrderMessageAttachment[];
    const now = new Date();
    const preview = body
      ? body.slice(0, 200)
      : attachments.length > 0
        ? `[Вкладення: ${attachments[0].fileName}]`
        : '';

    const [created] = await this.databaseService.db.transaction(async (tx) => {
      // Автоматично позначаємо вхідні повідомлення клієнта прочитаними
      await tx
        .update(inboxMessages)
        .set({ readByStaffAt: now })
        .where(
          and(
            eq(inboxMessages.threadId, threadId),
            eq(inboxMessages.senderRole, 'recipient'),
            isNull(inboxMessages.readByStaffAt)
          )
        );

      const [msg] = await tx
        .insert(inboxMessages)
        .values({
          threadId,
          senderUserId: staffUserId,
          senderRole: 'support_staff',
          senderName: senderName.slice(0, 160),
          body,
          attachments,
          readByRecipientAt: null,
          readByStaffAt: now,
          createdAt: now
        })
        .returning();

      await tx
        .update(inboxThreads)
        .set({
          lastMessagePreview: preview,
          lastMessageAt: now,
          updatedAt: now
        })
        .where(eq(inboxThreads.id, threadId));

      return [msg];
    });

    return {
      id: created.id,
      threadId: created.threadId,
      senderUserId: created.senderUserId,
      senderRole: created.senderRole as InboxMessageRole,
      senderName: created.senderName,
      body: created.body,
      attachments: (created.attachments as OrderMessageAttachment[]) || [],
      readByRecipientAt: null,
      readByStaffAt: created.readByStaffAt ? created.readByStaffAt.toISOString() : null,
      createdAt: created.createdAt.toISOString()
    };
  }
}
