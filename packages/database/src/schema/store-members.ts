import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  smallint,
  timestamp,
  uniqueIndex,
  primaryKey
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './users.js';
import { stores } from './stores.js';
import { roles, permissions } from './rbac.js';

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
    roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
    isCustom: boolean('is_custom').default(false).notNull(),
    customPriority: integer('custom_priority').default(0).notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [uniqueIndex('store_members_store_user_idx').on(table.storeId, table.userId)]
);

/**
 * M:N — Индивидуальные (Custom) права для работника магазина
 */
export const storeMemberPermissions = pgTable(
  'store_member_permissions',
  {
    storeMemberId: uuid('store_member_id')
      .references(() => storeMembers.id, { onDelete: 'cascade' })
      .notNull(),
    permissionId: smallint('permission_id')
      .references(() => permissions.id, { onDelete: 'cascade' })
      .notNull()
  },
  (table) => [primaryKey({ columns: [table.storeMemberId, table.permissionId] })]
);

export const insertStoreMemberSchema = createInsertSchema(storeMembers);
export const selectStoreMemberSchema = createSelectSchema(storeMembers);

export type StoreMemberRecord = typeof storeMembers.$inferSelect;
export type NewStoreMemberRecord = typeof storeMembers.$inferInsert;
