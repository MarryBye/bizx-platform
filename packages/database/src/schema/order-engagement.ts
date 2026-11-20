import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  index
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { stores } from './stores.js';
import { orders } from './orders.js';

export interface OrderMessageAttachment {
  url: string;
  fileName: string;
  mimeType: string;
  size?: number;
}

/**
 * Повідомлення в чаті замовлення (Клієнт ↔ Магазин ↔ Арбітраж BizX + системні події)
 */
export const orderMessages = pgTable(
  'order_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    senderId: uuid('sender_id').references(() => users.id, { onDelete: 'set null' }),
    /** 'customer' | 'store' | 'platform' | 'system' */
    senderType: varchar('sender_type', { length: 20 }).notNull(),
    body: text('body'),
    attachments: jsonb('attachments')
      .$type<OrderMessageAttachment[]>()
      .default([])
      .notNull(),
    readByCustomerAt: timestamp('read_by_customer_at', { withTimezone: true }),
    readByStoreAt: timestamp('read_by_store_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    orderCreatedIdx: index('order_messages_order_created_idx').on(table.orderId, table.createdAt)
  })
);

/**
 * Спори та скарги клієнтів по замовленнях (рівень закладу → ескалація у BizX Core)
 */
export const orderDisputes = pgTable(
  'order_disputes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    storeId: uuid('store_id')
      .references(() => stores.id, { onDelete: 'cascade' })
      .notNull(),
    customerId: uuid('customer_id').references(() => users.id, { onDelete: 'set null' }),
    /** 'not_received' | 'damaged' | 'wrong_item' | 'missing_items' | 'poor_quality' | 'other' */
    category: varchar('category', { length: 50 }).notNull(),
    description: text('description').notNull(),
    /** 'open_store' | 'escalated_platform' | 'withdrawn' | 'resolved_refund' | 'resolved_business' | 'resolved_customer' */
    status: varchar('status', { length: 30 }).default('open_store').notNull(),
    escalatedAt: timestamp('escalated_at', { withTimezone: true }),
    escalationReason: text('escalation_reason'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolvedByUserId: uuid('resolved_by_user_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    resolutionNote: text('resolution_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    orderIdx: index('order_disputes_order_idx').on(table.orderId),
    storeStatusIdx: index('order_disputes_store_status_idx').on(table.storeId, table.status),
    statusIdx: index('order_disputes_status_idx').on(table.status)
  })
);

/**
 * Система страйків закладів (3 активні страйки → призупинення магазину на обраний строк)
 */
export const storeStrikes = pgTable(
  'store_strikes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id')
      .references(() => stores.id, { onDelete: 'cascade' })
      .notNull(),
    disputeId: uuid('dispute_id').references(() => orderDisputes.id, { onDelete: 'set null' }),
    issuedByUserId: uuid('issued_by_user_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    reason: text('reason').notNull(),
    /** Тривалість блокування у днях, якщо саме цей страйк призвів до паузи (null = до ручного зняття або не застосовувалось) */
    suspensionDays: integer('suspension_days'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedByUserId: uuid('revoked_by_user_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    revokeReason: text('revoke_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    storeIdx: index('store_strikes_store_idx').on(table.storeId)
  })
);

/**
 * Оцінки закладів (1..5 зірок — дозволено лише для успішно виконаних замовлень delivered)
 */
export const storeReviews = pgTable(
  'store_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id')
      .references(() => stores.id, { onDelete: 'cascade' })
      .notNull(),
    orderId: uuid('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    customerId: uuid('customer_id').references(() => users.id, { onDelete: 'set null' }),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    storeCreatedIdx: index('store_reviews_store_created_idx').on(table.storeId, table.createdAt)
  })
);

export type OrderMessageRecord = typeof orderMessages.$inferSelect;
export type NewOrderMessageRecord = typeof orderMessages.$inferInsert;
export type OrderDisputeRecord = typeof orderDisputes.$inferSelect;
export type NewOrderDisputeRecord = typeof orderDisputes.$inferInsert;
export type StoreStrikeRecord = typeof storeStrikes.$inferSelect;
export type NewStoreStrikeRecord = typeof storeStrikes.$inferInsert;
export type StoreReviewRecord = typeof storeReviews.$inferSelect;
export type NewStoreReviewRecord = typeof storeReviews.$inferInsert;
