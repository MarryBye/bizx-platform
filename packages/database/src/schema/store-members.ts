import { pgTable, uuid, varchar, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './users.js';
import { stores } from './stores.js';

export const storeMembers = pgTable(
  'store_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storeId: uuid('store_id')
      .references(() => stores.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    role: varchar('role', { length: 50 }).default('owner').notNull(), // 'owner' | 'manager' | 'staff'
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('store_members_store_user_idx').on(table.storeId, table.userId)
  ]
);

export const insertStoreMemberSchema = createInsertSchema(storeMembers);
export const selectStoreMemberSchema = createSelectSchema(storeMembers);

export type StoreMemberRecord = typeof storeMembers.$inferSelect;
export type NewStoreMemberRecord = typeof storeMembers.$inferInsert;
