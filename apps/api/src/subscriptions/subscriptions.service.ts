import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { users, stores, eq, and, isNull, inArray } from '@bizx/database';
import type {
  SubscriptionPlan,
  SubscribeDto,
  UserSubscriptionDetails,
  SubscriptionTier,
  SubscriptionStatus
} from '@bizx/common-types';
import {
  SUBSCRIPTION_PLANS,
  isSubscriptionActive,
  getSubscriptionDaysLeft,
  getMaxAllowedStores,
  isBusinessSubscriptionTier
} from './subscriptions.constants.js';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Отримати список усіх доступних тарифних планів платформи
   */
  getPlans(): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS;
  }

  /**
   * Отримати детальну інформацію про підписку користувача та ліміти
   * Автоматично синхронізує прострочену/відсутню підписку та призупиняє активні заклади.
   */
  async getMySubscription(userId: string): Promise<UserSubscriptionDetails> {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new NotFoundException('Користувач не знайдений');
    }

    const isStaff = user.systemRole === 'platform_admin' || user.role === 'admin';
    let currentStatus = user.subscriptionStatus;

    // 1. Перевірка терміну дії: якщо дата минула, переводимо в 'expired'
    if (
      user.subscriptionExpiresAt &&
      new Date(user.subscriptionExpiresAt).getTime() <= Date.now() &&
      currentStatus === 'active'
    ) {
      currentStatus = 'expired';
      await this.databaseService.db
        .update(users)
        .set({ subscriptionStatus: 'expired', updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    const hasActiveBizSub =
      isSubscriptionActive({
        subscriptionTier: user.subscriptionTier,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        subscriptionStatus: currentStatus
      }) && isBusinessSubscriptionTier(user.subscriptionTier);

    const maxAllowed = hasActiveBizSub ? getMaxAllowedStores(user.subscriptionTier) : 0;

    // 2. Якщо підписка відсутня / прострочена / не бізнес — призупиняємо всі активні/на перевірці заклади
    if (!isStaff && !hasActiveBizSub) {
      await this.databaseService.db
        .update(stores)
        .set({ status: 'suspended', updatedAt: new Date() })
        .where(
          and(
            eq(stores.ownerId, userId),
            inArray(stores.status, ['active', 'pending']),
            isNull(stores.archivedAt)
          )
        );
    }

    // 3. Отримуємо актуальні не-архівні заклади власника
    let userStores = await this.databaseService.db
      .select({ id: stores.id, status: stores.status })
      .from(stores)
      .where(and(eq(stores.ownerId, userId), isNull(stores.archivedAt)));

    let activeStoresCount = userStores.filter(
      (s) => s.status === 'active' || s.status === 'pending'
    ).length;

    // 4. Якщо активних/на перевірці закладів більше ніж дозволяє тариф — тимчасово призупиняємо ВСІ
    if (!isStaff && hasActiveBizSub && activeStoresCount > maxAllowed) {
      await this.databaseService.db
        .update(stores)
        .set({ status: 'suspended', updatedAt: new Date() })
        .where(
          and(
            eq(stores.ownerId, userId),
            inArray(stores.status, ['active', 'pending']),
            isNull(stores.archivedAt)
          )
        );

      userStores = await this.databaseService.db
        .select({ id: stores.id, status: stores.status })
        .from(stores)
        .where(and(eq(stores.ownerId, userId), isNull(stores.archivedAt)));

      activeStoresCount = userStores.filter(
        (s) => s.status === 'active' || s.status === 'pending'
      ).length;
    }

    const daysLeft = getSubscriptionDaysLeft(user.subscriptionExpiresAt);
    const totalStoresCount = userStores.length;
    const suspendedStoresCount = userStores.filter((s) => s.status === 'suspended').length;
    const hasExceededStoreLimit = !isStaff && totalStoresCount > maxAllowed && maxAllowed > 0;
    const needsStoreSelection =
      !isStaff &&
      hasActiveBizSub &&
      totalStoresCount > maxAllowed &&
      suspendedStoresCount > 0 &&
      activeStoresCount < maxAllowed;

    // Доступ до бізнес-адмінки: є активна бізнес-підписка АБО є хоча б 1 власний заклад (для read-only перегляду)
    const canAccessBusinessAdmin = isStaff || hasActiveBizSub || totalStoresCount > 0;

    return {
      tier: (user.subscriptionTier ?? 'free') as SubscriptionTier,
      status: (currentStatus ?? 'none') as SubscriptionStatus,
      expiresAt: user.subscriptionExpiresAt
        ? user.subscriptionExpiresAt.toISOString()
        : null,
      daysLeft,
      maxAllowedStores: getMaxAllowedStores(user.subscriptionTier),
      activeStoresCount,
      suspendedStoresCount,
      totalStoresCount,
      hasExceededStoreLimit,
      needsStoreSelection,
      canAccessBusinessAdmin
    };
  }

  /**
   * Оформлення або зміна підписки (імітація оплати)
   * - При переході на free / client_premium: всі активні/pending заклади призупиняються.
   * - При пониженні бізнес-тарифу, якщо активних/pending закладів більше нового ліміту:
   *   всі вони призупиняються, щоб власник сам обрав які подати на активацію.
   * - При підвищенні тарифу: призупинені заклади НЕ вмикаються автоматично.
   */
  async subscribe(
    userId: string,
    dto: SubscribeDto
  ): Promise<UserSubscriptionDetails> {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new NotFoundException('Користувач не знайдений');
    }

    const periodDays = dto.periodDays || 30;
    const isFree = dto.tier === 'free';
    const newExpiresAt = isFree
      ? null
      : new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

    const newStatus = isFree ? 'none' : 'active';
    const isBiz = isBusinessSubscriptionTier(dto.tier);
    const newMaxAllowed = isBiz ? getMaxAllowedStores(dto.tier) : 0;

    await this.databaseService.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          subscriptionTier: dto.tier,
          subscriptionStatus: newStatus,
          subscriptionExpiresAt: newExpiresAt,
          role: isBiz ? 'business_owner' : user.role === 'admin' ? 'admin' : 'client',
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      if (!isBiz) {
        // Перехід на free або client_premium — призупиняємо всі активні/pending заклади
        await tx
          .update(stores)
          .set({ status: 'suspended', updatedAt: new Date() })
          .where(
            and(
              eq(stores.ownerId, userId),
              inArray(stores.status, ['active', 'pending']),
              isNull(stores.archivedAt)
            )
          );
      } else {
        // Перевіряємо чи не перевищує поточна кількість активних/pending закладів новий ліміт
        const ownerStores = await tx
          .select({ id: stores.id, status: stores.status })
          .from(stores)
          .where(
            and(
              eq(stores.ownerId, userId),
              inArray(stores.status, ['active', 'pending']),
              isNull(stores.archivedAt)
            )
          );

        if (ownerStores.length > newMaxAllowed) {
          // Пониження тарифу при перевищенні ліміту: тимчасово вимикаємо ВСІ заклади
          await tx
            .update(stores)
            .set({ status: 'suspended', updatedAt: new Date() })
            .where(
              and(
                eq(stores.ownerId, userId),
                inArray(stores.status, ['active', 'pending']),
                isNull(stores.archivedAt)
              )
            );
        }
      }
    });

    return this.getMySubscription(userId);
  }

  /**
   * Скасування підписки — переводить у 'cancelled' і призупиняє активні заклади
   */
  async cancel(userId: string): Promise<UserSubscriptionDetails> {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new NotFoundException('Користувач не знайдений');
    }

    await this.databaseService.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ subscriptionStatus: 'cancelled', updatedAt: new Date() })
        .where(eq(users.id, userId));

      await tx
        .update(stores)
        .set({ status: 'suspended', updatedAt: new Date() })
        .where(
          and(
            eq(stores.ownerId, userId),
            inArray(stores.status, ['active', 'pending']),
            isNull(stores.archivedAt)
          )
        );
    });

    return this.getMySubscription(userId);
  }
}
