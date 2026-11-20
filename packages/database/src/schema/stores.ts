import { pgTable, uuid, varchar, text, timestamp, boolean, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users.js';
import { storeCategories } from './store-categories.js';

export const stores = pgTable(
  'stores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    categoryId: uuid('category_id').references(() => storeCategories.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    logoUrl: varchar('logo_url', { length: 500 }),
    bannerUrl: varchar('banner_url', { length: 500 }),
    address: varchar('address', { length: 500 }),
    phone: varchar('phone', { length: 50 }),
    email: varchar('email', { length: 255 }),
    status: varchar('status', { length: 50 }).default('draft').notNull(),
    // Custom domain for store web storefront (<slug>.bizx.ua + optional custom domain)
    customDomain: varchar('custom_domain', { length: 255 }),
    customDomainVerified: boolean('custom_domain_verified').default(false).notNull(),
    domainVerificationToken: varchar('domain_verification_token', { length: 120 }),
    // Strike suspension & escrow payout balance (kopecks; can be negative on post-payout clawback)
    suspendedUntil: timestamp('suspended_until', { withTimezone: true }),
    suspensionReason: text('suspension_reason'),
    payoutBalance: integer('payout_balance').default(0).notNull(),
    // Cached star rating aggregate (ratingAvg stored x100, e.g. 485 = 4.85★)
    ratingAvg: integer('rating_avg').default(0).notNull(),
    ratingCount: integer('rating_count').default(0).notNull(),
    // Automatic promo broadcast when a product discount (oldPrice > price) is created or deepened
    autoDiscountBroadcastEnabled: boolean('auto_discount_broadcast_enabled').default(false).notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('stores_custom_domain_active_uidx')
      .on(table.customDomain)
      .where(sql`${table.customDomain} IS NOT NULL AND ${table.archivedAt} IS NULL`),
    index('stores_owner_status_idx').on(table.ownerId, table.status)
  ]
);

export type StoreRecord = typeof stores.$inferSelect;
export type NewStoreRecord = typeof stores.$inferInsert;
