import {
  pgTable,
  uuid,
  varchar,
  smallint,
  integer,
  boolean,
  timestamp,
  primaryKey,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './users.js';
import { stores } from './stores.js';

/**
 * Справочник атомарных прав доступа (отдельно для scope='store' и scope='platform')
 */
export const permissions = pgTable('permissions', {
  id: smallint('id').primaryKey(),
  code: varchar('code', { length: 80 }).notNull().unique(),
  scope: varchar('scope', { length: 20 }).notNull(), // 'store' | 'platform'
  category: varchar('category', { length: 40 }).notNull(),
  action: varchar('action', { length: 20 }).notNull(),
  ownerOnly: boolean('owner_only').default(false).notNull()
});

/**
 * Роли с иерархией приоритетов (а-ля Discord) для бизнесов и платформы BizX
 */
export const roles = pgTable(
  'roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scope: varchar('scope', { length: 20 }).notNull(), // 'store' | 'platform'
    storeId: uuid('store_id').references(() => stores.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    icon: varchar('icon', { length: 50 }), // ключ иконки lucide-react или NULL (без иконки)
    color: varchar('color', { length: 20 }).default('#334155').notNull(),
    priority: integer('priority').default(100).notNull(),
    isSystem: boolean('is_system').default(false).notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    index('roles_scope_store_idx').on(table.scope, table.storeId),
    index('roles_priority_idx').on(table.priority)
  ]
);

/**
 * M:N — Права, привязанные к роли
 */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .references(() => roles.id, { onDelete: 'cascade' })
      .notNull(),
    permissionId: smallint('permission_id')
      .references(() => permissions.id, { onDelete: 'cascade' })
      .notNull()
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })]
);

/**
 * Сотрудники платформы BizX Core (реальная таблица БД вместо моков)
 */
export const platformMembers = pgTable(
  'platform_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
    isCustom: boolean('is_custom').default(false).notNull(),
    customPriority: integer('custom_priority').default(0).notNull(),
    department: varchar('department', { length: 100 }),
    isOwner: boolean('is_owner').default(false).notNull(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [uniqueIndex('platform_members_user_idx').on(table.userId)]
);

/**
 * M:N — Индивидуальные (Custom) права для сотрудника платформы BizX
 */
export const platformMemberPermissions = pgTable(
  'platform_member_permissions',
  {
    platformMemberId: uuid('platform_member_id')
      .references(() => platformMembers.id, { onDelete: 'cascade' })
      .notNull(),
    permissionId: smallint('permission_id')
      .references(() => permissions.id, { onDelete: 'cascade' })
      .notNull()
  },
  (table) => [primaryKey({ columns: [table.platformMemberId, table.permissionId] })]
);

export const insertPermissionSchema = createInsertSchema(permissions);
export const selectPermissionSchema = createSelectSchema(permissions);
export const insertRoleSchema = createInsertSchema(roles);
export const selectRoleSchema = createSelectSchema(roles);
export const insertPlatformMemberSchema = createInsertSchema(platformMembers);
export const selectPlatformMemberSchema = createSelectSchema(platformMembers);

export type PermissionRecord = typeof permissions.$inferSelect;
export type RoleRecord = typeof roles.$inferSelect;
export type PlatformMemberRecord = typeof platformMembers.$inferSelect;
