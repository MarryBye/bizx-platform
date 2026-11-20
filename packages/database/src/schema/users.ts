import { pgTable, uuid, varchar, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    preferredLanguage: varchar('preferred_language', { length: 10 }).default('uk').notNull(),
    status: varchar('status', { length: 50 }).default('active').notNull(), // 'active' | 'suspended' | 'archived'
    suspendedUntil: timestamp('suspended_until', { withTimezone: true }),
    suspensionReason: text('suspension_reason'),
    subscriptionTier: varchar('subscription_tier', { length: 50 }).default('free').notNull(), // 'free' | 'client_premium' | 'business_starter' | 'business_pro' | 'business_enterprise'
    subscriptionStatus: varchar('subscription_status', { length: 50 }).default('none').notNull(), // 'none' | 'active' | 'expired' | 'cancelled'
    subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (table) => [
    uniqueIndex('users_phone_unique_idx')
      .on(table.phone)
      .where(sql`${table.phone} IS NOT NULL`)
  ]
);

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;
