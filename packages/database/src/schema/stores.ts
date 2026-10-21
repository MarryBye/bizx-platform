import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './users.js';
import { storeCategories } from './store-categories.js';

export const stores = pgTable('stores', {
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
  status: varchar('status', { length: 50 }).default('active').notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

export const insertStoreSchema = createInsertSchema(stores);
export const selectStoreSchema = createSelectSchema(stores);

export type StoreRecord = typeof stores.$inferSelect;
export type NewStoreRecord = typeof stores.$inferInsert;
