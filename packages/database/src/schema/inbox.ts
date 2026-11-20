import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index
} from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { stores } from './stores.js';
import type { OrderMessageAttachment } from './order-engagement.js';

/**
 * Поштові діалоги акаунту (Повідомлення від BizX, загальна підтримка, реклама закладів, майбутня соцмережа)
 * - senderType: 'bizx' | 'support' | 'promo' | 'user'
 * - badgeType: 'bizx' | 'support' | 'promo' | null
 * - canReply: false для офіційних листів BizX та реклами; true для відкритої підтримки / діалогів
 */
export const inboxThreads = pgTable(
  'inbox_threads',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    senderType: varchar('sender_type', { length: 32 }).notNull().default('bizx'),
    senderStoreId: uuid('sender_store_id').references(() => stores.id, { onDelete: 'set null' }),
    senderName: varchar('sender_name', { length: 160 }).notNull(),
    senderAvatarUrl: text('sender_avatar_url'),
    badgeType: varchar('badge_type', { length: 32 }),
    subject: varchar('subject', { length: 255 }).notNull(),
    canReply: boolean('can_reply').notNull().default(false),
    relatedStoreId: uuid('related_store_id').references(() => stores.id, { onDelete: 'set null' }),
    lastMessagePreview: text('last_message_preview'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    userIdx: index('inbox_threads_user_idx').on(t.userId),
    lastMsgIdx: index('inbox_threads_last_msg_idx').on(t.lastMessageAt)
  })
);

/**
 * Повідомлення всередині поштових діалогів акаунту
 * - senderRole: 'system_bizx' | 'support_staff' | 'promo_business' | 'recipient'
 */
export const inboxMessages = pgTable(
  'inbox_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    threadId: uuid('thread_id')
      .notNull()
      .references(() => inboxThreads.id, { onDelete: 'cascade' }),
    senderUserId: uuid('sender_user_id').references(() => users.id, { onDelete: 'set null' }),
    senderRole: varchar('sender_role', { length: 32 }).notNull().default('system_bizx'),
    senderName: varchar('sender_name', { length: 160 }).notNull(),
    body: text('body'),
    attachments: jsonb('attachments').$type<OrderMessageAttachment[]>().default([]).notNull(),
    readByRecipientAt: timestamp('read_by_recipient_at', { withTimezone: true }),
    readByStaffAt: timestamp('read_by_staff_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    threadIdx: index('inbox_messages_thread_idx').on(t.threadId),
    createdIdx: index('inbox_messages_created_idx').on(t.createdAt)
  })
);

export type InboxThreadRecord = typeof inboxThreads.$inferSelect;
export type NewInboxThreadRecord = typeof inboxThreads.$inferInsert;
export type InboxMessageRecord = typeof inboxMessages.$inferSelect;
export type NewInboxMessageRecord = typeof inboxMessages.$inferInsert;
