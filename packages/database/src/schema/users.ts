import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';

/**
 * Пример схемы таблицы Drizzle ORM.
 * Используйте этот файл как шаблон для создания своих собственных таблиц.
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('client').notNull(),
  systemRole: varchar('system_role', { length: 50 }).default('user').notNull(),
  phone: varchar('phone', { length: 50 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
});

// Автоматически сгенерированные Zod-схемы для валидации данных таблицы
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

// TypeScript типы
export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;
