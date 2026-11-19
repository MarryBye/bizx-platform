import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { stores } from './stores.js';
import { products } from './products.js';

export interface BroadcastTargetAudience {
  kind: 'all' | 'business_owners' | 'tier' | 'store_owner' | 'user' | 'store_subscribers';
  tier?: string;
  userId?: string;
  storeId?: string;
}

/**
 * Підписки користувачів на рекламні / акційні розсилки конкретних закладів.
 * - Законність (UA + EU GDPR): підписка тільки за явною згодою (неотмечений чекбокс на 1-му замовленні або кнопка на вітрині).
 * - promptShownAt фіксує, що на першому замовленні користувачу вже пропонували підписку —
 *   якщо він відмовився (status = 'unsubscribed'), повторно при замовленні система не нав'язує і не підписує.
 */
export const storeMarketingSubscriptions = pgTable(
  'store_marketing_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 32 }).notNull().default('subscribed'),
    source: varchar('source', { length: 48 }).notNull().default('storefront_button'),
    promptShownAt: timestamp('prompt_shown_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    storeUserUidx: uniqueIndex('store_marketing_subs_store_user_uidx').on(t.storeId, t.userId),
    storeStatusIdx: index('store_marketing_subs_store_status_idx').on(t.storeId, t.status),
    userIdx: index('store_marketing_subs_user_idx').on(t.userId)
  })
);

/**
 * Журнал розсилок платформи BizX (технічні / офіційні) та закладів (ручні акції / авто-знижки).
 * Використовується для обліку денних лімітів за тарифом, cooldown 24 год на товар та аудиту.
 */
export const broadcastCampaigns = pgTable(
  'broadcast_campaigns',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scope: varchar('scope', { length: 24 }).notNull(),
    storeId: uuid('store_id').references(() => stores.id, { onDelete: 'cascade' }),
    createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    type: varchar('type', { length: 32 }).notNull(),
    targetAudience: jsonb('target_audience')
      .$type<BroadcastTargetAudience>()
      .default({ kind: 'store_subscribers' })
      .notNull(),
    subject: varchar('subject', { length: 255 }).notNull(),
    body: text('body').notNull(),
    attachmentUrl: text('attachment_url'),
    relatedProductId: uuid('related_product_id').references(() => products.id, {
      onDelete: 'set null'
    }),
    recipientsCount: integer('recipients_count').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    scopeCreatedIdx: index('broadcast_campaigns_scope_created_idx').on(t.scope, t.createdAt),
    storeCreatedIdx: index('broadcast_campaigns_store_created_idx').on(t.storeId, t.createdAt),
    productCreatedIdx: index('broadcast_campaigns_product_created_idx').on(
      t.relatedProductId,
      t.createdAt
    )
  })
);

export type StoreMarketingSubscriptionRecord = typeof storeMarketingSubscriptions.$inferSelect;
export type NewStoreMarketingSubscriptionRecord = typeof storeMarketingSubscriptions.$inferInsert;
export type BroadcastCampaignRecord = typeof broadcastCampaigns.$inferSelect;
export type NewBroadcastCampaignRecord = typeof broadcastCampaigns.$inferInsert;
