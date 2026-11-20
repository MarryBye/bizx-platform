import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { stores } from './stores.js';

export const productCategories = pgTable('product_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  storeId: uuid('store_id')
    .references(() => stores.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export type ProductCategoryRecord = typeof productCategories.$inferSelect;
export type NewProductCategoryRecord = typeof productCategories.$inferInsert;
