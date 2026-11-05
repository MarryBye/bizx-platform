import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { users, stores, eq, and, isNull } from '@bizx/database';
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
   */
  async getMySubscription(userId: string): Promise<UserSubscriptionDetails> {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new NotFoundException('Користувач не знайдений');
    }

    // Перевірка терміну дії: якщо дата минула, переводимо в 'expired' та призупиняємо заклади
    let currentStatus = user.subscriptionStatus;
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

      // Призупиняємо заклади користувача, оскільки підписка закінчилась
      await this.databaseService.db
        .update(stores)
        .set({ status: 'suspended', updatedAt: new Date() })
        .where(
          and(
            eq(stores.ownerId, userId),
            eq(stores.status, 'active'),
            isNull(stores.archivedAt)
          )
        );
    }

    const daysLeft = getSubscriptionDaysLeft(user.subscriptionExpiresAt);
    const maxAllowed = getMaxAllowedStores(user.subscriptionTier);

    // Підраховуємо не-архівні заклади власника
    const userStores = await this.databaseService.db
      .select({ id: stores.id, status: stores.status })
      .from(stores)
      .where(and(eq(stores.ownerId, userId), isNull(stores.archivedAt)));

    const activeStoresCount = userStores.filter(
      (s) => s.status === 'active' || s.status === 'pending'
    ).length;

    const hasExceededStoreLimit = activeStoresCount > maxAllowed;

    const isStaff = user.systemRole === 'platform_admin' || user.role === 'admin';
    const canAccessBusinessAdmin =
      isStaff ||
      (isSubscriptionActive({
        subscriptionTier: user.subscriptionTier,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        subscriptionStatus: currentStatus
      }) &&
        isBusinessSubscriptionTier(user.subscriptionTier));

    return {
      tier: (user.subscriptionTier ?? 'free') as SubscriptionTier,
      status: (currentStatus ?? 'none') as SubscriptionStatus,
      expiresAt: user.subscriptionExpiresAt
        ? user.subscriptionExpiresAt.toISOString()
        : null,
      daysLeft,
      maxAllowedStores: maxAllowed,
      activeStoresCount,
      hasExceededStoreLimit,
      canAccessBusinessAdmin
    };
  }

  /**
   * Оформлення або зміна підписки (імітація оплати)
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

    // Оновлюємо дані користувача в транзакції
    await this.databaseService.db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          subscriptionTier: dto.tier,
          subscriptionStatus: newStatus,
          subscriptionExpiresAt: newExpiresAt,
          // Якщо тариф бізнес - надаємо роль business_owner
          role: isBiz ? 'business_owner' : user.role === 'admin' ? 'admin' : 'client',
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      // Якщо користувач перейшов на free або client_premium, його бізнеси призупиняються
      if (!isBiz && !isFree) {
        await tx
          .update(stores)
          .set({ status: 'suspended', updatedAt: new Date() })
          .where(
            and(
              eq(stores.ownerId, userId),
              eq(stores.status, 'active'),
              isNull(stores.archivedAt)
            )
          );
      }
    });

    return this.getMySubscription(userId);
  }

  /**
   * Скасування автопродовження підписки
   */
  async cancel(userId: string): Promise<UserSubscriptionDetails> {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      throw new NotFoundException('Користувач не знайдений');
    }

    await this.databaseService.db
      .update(users)
      .set({ subscriptionStatus: 'cancelled', updatedAt: new Date() })
      .where(eq(users.id, userId));

    return this.getMySubscription(userId);
  }
}
