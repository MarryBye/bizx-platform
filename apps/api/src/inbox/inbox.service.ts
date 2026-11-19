import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import {
  inboxThreads,
  inboxMessages,
  users,
  eq,
  and,
  desc,
  asc,
  isNull,
  ne,
  count,
  inArray,
  type OrderMessageAttachment
} from '@bizx/database';
import type {
  InboxThreadItem,
  InboxMessageItem,
  InboxUnreadSummary,
  InboxSenderType,
  InboxBadgeType,
  InboxMessageRole,
  SendInboxMessageDto,
  CreateSupportThreadDto
} from '@bizx/common-types';

@Injectable()
export class InboxService {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Надсилає офіційне системне повідомлення від BizX у Пошту користувача (відповіді вимкнено).
   * Використовується при підтвердженні / відхиленні закладу, системних сповіщеннях тощо.
   */
  async sendOfficialBizxMessage(params: {
    userId: string;
    subject: string;
    body: string;
    senderName?: string;
    relatedStoreId?: string | null;
    canReply?: boolean;
    senderType?: InboxSenderType;
    badgeType?: InboxBadgeType;
  }): Promise<InboxThreadItem> {
    const senderName = params.senderName || 'BizX Модерація';
    const senderType: InboxSenderType = params.senderType || 'bizx';
    const badgeType: InboxBadgeType = params.badgeType !== undefined ? params.badgeType : 'bizx';
    const canReply = params.canReply ?? false;
    const now = new Date();

    const created = await this.databaseService.db.transaction(async (tx) => {
      const [thread] = await tx
        .insert(inboxThreads)
        .values({
          userId: params.userId,
          senderType,
          senderStoreId: null,
          senderName,
          senderAvatarUrl: null,
          badgeType,
          subject: params.subject.slice(0, 255),
          canReply,
          relatedStoreId: params.relatedStoreId ?? null,
          lastMessagePreview: params.body.slice(0, 200),
          lastMessageAt: now,
          createdAt: now,
          updatedAt: now
        })
        .returning();

      await tx.insert(inboxMessages).values({
        threadId: thread.id,
        senderUserId: null,
        senderRole: senderType === 'promo' ? 'promo_business' : senderType === 'support' ? 'support_staff' : 'system_bizx',
        senderName,
        body: params.body,
        attachments: [],
        readByRecipientAt: null,
        readByStaffAt: now,
        createdAt: now
      });

      return thread;
    });

    return {
      id: created.id,
      userId: created.userId,
      senderType: created.senderType as InboxSenderType,
      senderStoreId: created.senderStoreId,
      senderName: created.senderName,
      senderAvatarUrl: created.senderAvatarUrl,
      badgeType: (created.badgeType as InboxBadgeType) ?? null,
      subject: created.subject,
      canReply: created.canReply,
      relatedStoreId: created.relatedStoreId,
      lastMessagePreview: created.lastMessagePreview,
      lastMessageAt: created.lastMessageAt.toISOString(),
      unreadCount: 1,
      createdAt: created.createdAt.toISOString()
    };
  }

  async getMyThreads(userId: string): Promise<InboxThreadItem[]> {
    const threads = await this.databaseService.db
      .select()
      .from(inboxThreads)
      .where(eq(inboxThreads.userId, userId))
      .orderBy(desc(inboxThreads.lastMessageAt));

    if (threads.length === 0) return [];

    const threadIds = threads.map((t) => t.id);
    const unreadRows = await this.databaseService.db
      .select({
        threadId: inboxMessages.threadId,
        cnt: count()
      })
      .from(inboxMessages)
      .where(
        and(
          inArray(inboxMessages.threadId, threadIds),
          ne(inboxMessages.senderRole, 'recipient'),
          isNull(inboxMessages.readByRecipientAt)
        )
      )
      .groupBy(inboxMessages.threadId);

    const unreadMap = new Map(unreadRows.map((r) => [r.threadId, Number(r.cnt)]));

    return threads.map((t) => ({
      id: t.id,
      userId: t.userId,
      senderType: t.senderType as InboxSenderType,
      senderStoreId: t.senderStoreId,
      senderName: t.senderName,
      senderAvatarUrl: t.senderAvatarUrl,
      badgeType: (t.badgeType as InboxBadgeType) ?? null,
      subject: t.subject,
      canReply: t.canReply,
      relatedStoreId: t.relatedStoreId,
      lastMessagePreview: t.lastMessagePreview,
      lastMessageAt: t.lastMessageAt.toISOString(),
      unreadCount: unreadMap.get(t.id) ?? 0,
      createdAt: t.createdAt.toISOString()
    }));
  }

  async getUnreadSummary(userId: string): Promise<InboxUnreadSummary> {
    const rows = await this.databaseService.db
      .select({
        threadId: inboxMessages.threadId,
        cnt: count()
      })
      .from(inboxMessages)
      .innerJoin(inboxThreads, eq(inboxMessages.threadId, inboxThreads.id))
      .where(
        and(
          eq(inboxThreads.userId, userId),
          ne(inboxMessages.senderRole, 'recipient'),
          isNull(inboxMessages.readByRecipientAt)
        )
      )
      .groupBy(inboxMessages.threadId);

    let totalUnreadMessages = 0;
    for (const r of rows) {
      totalUnreadMessages += Number(r.cnt);
    }

    return {
      totalUnreadMessages,
      unreadThreadsCount: rows.length
    };
  }

  async assertThreadOwner(threadId: string, userId: string) {
    const [thread] = await this.databaseService.db
      .select()
      .from(inboxThreads)
      .where(eq(inboxThreads.id, threadId));

    if (!thread) {
      throw new NotFoundException('Діалог не знайдено');
    }
    if (thread.userId !== userId) {
      throw new ForbiddenException('Немає доступу до цього діалогу');
    }
    return thread;
  }

  async getThreadMessages(threadId: string, userId: string): Promise<InboxMessageItem[]> {
    await this.assertThreadOwner(threadId, userId);

    const rows = await this.databaseService.db
      .select()
      .from(inboxMessages)
      .where(eq(inboxMessages.threadId, threadId))
      .orderBy(asc(inboxMessages.createdAt));

    return rows.map((m) => ({
      id: m.id,
      threadId: m.threadId,
      senderUserId: m.senderUserId,
      senderRole: m.senderRole as InboxMessageRole,
      senderName: m.senderName,
      body: m.body,
      attachments: (m.attachments as OrderMessageAttachment[]) || [],
      readByRecipientAt: m.readByRecipientAt ? m.readByRecipientAt.toISOString() : null,
      readByStaffAt: m.readByStaffAt ? m.readByStaffAt.toISOString() : null,
      createdAt: m.createdAt.toISOString()
    }));
  }

  async markThreadRead(threadId: string, userId: string): Promise<{ updated: number }> {
    await this.assertThreadOwner(threadId, userId);
    const now = new Date();
    const updated = await this.databaseService.db
      .update(inboxMessages)
      .set({ readByRecipientAt: now })
      .where(
        and(
          eq(inboxMessages.threadId, threadId),
          ne(inboxMessages.senderRole, 'recipient'),
          isNull(inboxMessages.readByRecipientAt)
        )
      )
      .returning({ id: inboxMessages.id });

    return { updated: updated.length };
  }

  async sendReply(
    threadId: string,
    userId: string,
    dto: SendInboxMessageDto
  ): Promise<InboxMessageItem> {
    const thread = await this.assertThreadOwner(threadId, userId);

    if (!thread.canReply) {
      throw new ForbiddenException(
        thread.senderType === 'promo'
          ? 'На рекламні повідомлення відповідати не можна'
          : 'Відповіді у цьому системному діалозі вимкнено'
      );
    }

    const bodyText = dto.body?.trim() || null;
    const attachments = dto.attachments || [];
    if (!bodyText && attachments.length === 0) {
      throw new BadRequestException('Повідомлення не може бути порожнім');
    }

    const [sender] = await this.databaseService.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId));

    const now = new Date();
    const preview = bodyText || (attachments.length > 0 ? `📎 ${attachments[0].fileName}` : '');

    const [msg] = await this.databaseService.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(inboxMessages)
        .values({
          threadId,
          senderUserId: userId,
          senderRole: 'recipient',
          senderName: sender?.name || 'Користувач',
          body: bodyText,
          attachments,
          readByRecipientAt: now,
          readByStaffAt: null,
          createdAt: now
        })
        .returning();

      await tx
        .update(inboxThreads)
        .set({
          lastMessagePreview: preview.slice(0, 200),
          lastMessageAt: now,
          updatedAt: now
        })
        .where(eq(inboxThreads.id, threadId));

      return inserted;
    });

    return {
      id: msg.id,
      threadId: msg.threadId,
      senderUserId: msg.senderUserId,
      senderRole: msg.senderRole as InboxMessageRole,
      senderName: msg.senderName,
      body: msg.body,
      attachments: (msg.attachments as OrderMessageAttachment[]) || [],
      readByRecipientAt: msg.readByRecipientAt ? msg.readByRecipientAt.toISOString() : null,
      readByStaffAt: msg.readByStaffAt ? msg.readByStaffAt.toISOString() : null,
      createdAt: msg.createdAt.toISOString()
    };
  }

  async createSupportThread(userId: string, dto: CreateSupportThreadDto): Promise<InboxThreadItem> {
    const [sender] = await this.databaseService.db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId));

    const now = new Date();
    const replyTime = new Date(now.getTime() + 1000);

    const created = await this.databaseService.db.transaction(async (tx) => {
      const [thread] = await tx
        .insert(inboxThreads)
        .values({
          userId,
          senderType: 'support',
          senderStoreId: null,
          senderName: 'Підтримка BizX',
          senderAvatarUrl: null,
          badgeType: 'support',
          subject: dto.subject.trim(),
          canReply: true,
          relatedStoreId: null,
          lastMessagePreview: dto.body.trim().slice(0, 200),
          lastMessageAt: replyTime,
          createdAt: now,
          updatedAt: replyTime
        })
        .returning();

      await tx.insert(inboxMessages).values([
        {
          threadId: thread.id,
          senderUserId: userId,
          senderRole: 'recipient',
          senderName: sender?.name || 'Користувач',
          body: dto.body.trim(),
          attachments: [],
          readByRecipientAt: now,
          readByStaffAt: null,
          createdAt: now
        },
        {
          threadId: thread.id,
          senderUserId: null,
          senderRole: 'support_staff',
          senderName: 'Підтримка BizX',
          body: 'Дякуємо за звернення! Ваше повідомлення зареєстровано, оператор підтримки BizX відповість найближчим часом.',
          attachments: [],
          readByRecipientAt: replyTime,
          readByStaffAt: replyTime,
          createdAt: replyTime
        }
      ]);

      return thread;
    });

    return {
      id: created.id,
      userId: created.userId,
      senderType: 'support',
      senderStoreId: null,
      senderName: created.senderName,
      senderAvatarUrl: null,
      badgeType: 'support',
      subject: created.subject,
      canReply: true,
      relatedStoreId: null,
      lastMessagePreview: created.lastMessagePreview,
      lastMessageAt: created.lastMessageAt.toISOString(),
      unreadCount: 0,
      createdAt: created.createdAt.toISOString()
    };
  }
}
