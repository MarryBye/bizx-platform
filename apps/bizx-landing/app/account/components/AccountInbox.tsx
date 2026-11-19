'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../lib/api';
import {
  OrderChatBox,
  Modal,
  InboxBadge,
  CountBadge,
  Button,
  AlertBanner,
  type OrderChatMessage
} from '@bizx/ui';
import type {
  InboxThreadItem,
  InboxMessageItem,
  OrderMessageAttachmentDto
} from '@bizx/common-types';
import {
  Mail,
  Search,
  ShieldCheck,
  Megaphone,
  Headphones,
  Lock,
  Plus,
  Send,
  RefreshCw,
  ArrowLeft,
  MessageSquare
} from 'lucide-react';

interface AccountInboxProps {
  locale: 'uk' | 'en';
  onUnreadChanged?: (totalUnread: number) => void;
}

type InboxFilter = 'all' | 'bizx' | 'support' | 'promo';

export const AccountInbox: React.FC<AccountInboxProps> = ({ locale, onUnreadChanged }) => {
  const [threads, setThreads] = useState<InboxThreadItem[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InboxMessageItem[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [filter, setFilter] = useState<InboxFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New Support Conversation Modal
  const [showNewSupport, setShowNewSupport] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportBody, setSupportBody] = useState('');
  const [isCreatingSupport, setIsCreatingSupport] = useState(false);
  const [supportError, setSupportError] = useState<string | null>(null);

  const selectedThread = useMemo(
    () => threads.find((t) => t.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );

  const loadThreads = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoadingThreads(true);
      try {
        const res = await api.inbox.getThreads();
        if (res.success && res.data) {
          setThreads(res.data);
          const totalUnread = res.data.reduce((acc, item) => acc + (item.unreadCount || 0), 0);
          onUnreadChanged?.(totalUnread);
          if (!selectedThreadId && res.data.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 1024) {
            setSelectedThreadId(res.data[0].id);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!silent) setIsLoadingThreads(false);
      }
    },
    [onUnreadChanged, selectedThreadId]
  );

  const loadMessages = useCallback(
    async (threadId: string, silent = false) => {
      if (!silent) setIsLoadingMessages(true);
      try {
        const res = await api.inbox.getMessages(threadId);
        if (res.success && res.data) {
          setMessages(res.data);
          const hasUnread = res.data.some(
            (m) => m.senderRole !== 'recipient' && !m.readByRecipientAt
          );
          if (hasUnread) {
            await api.inbox.markRead(threadId).catch(() => {});
            setThreads((prev) => {
              const next = prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t));
              const totalUnread = next.reduce((acc, item) => acc + (item.unreadCount || 0), 0);
              onUnreadChanged?.(totalUnread);
              return next;
            });
          }
        }
      } catch {
        // ignore
      } finally {
        if (!silent) setIsLoadingMessages(false);
      }
    },
    [onUnreadChanged]
  );

  useEffect(() => {
    void loadThreads(false);
    const timer = window.setInterval(() => {
      void loadThreads(true);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [loadThreads]);

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedThreadId, false);
    const timer = window.setInterval(() => {
      void loadMessages(selectedThreadId, true);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [selectedThreadId, loadMessages]);

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return threads.filter((t) => {
      const matchesFilter = filter === 'all' || t.senderType === filter;
      const matchesQuery =
        !q ||
        t.subject.toLowerCase().includes(q) ||
        t.senderName.toLowerCase().includes(q) ||
        (t.lastMessagePreview && t.lastMessagePreview.toLowerCase().includes(q));
      return matchesFilter && matchesQuery;
    });
  }, [threads, filter, searchQuery]);

  const mappedMessages: OrderChatMessage[] = useMemo(() => {
    return messages.map((m) => ({
      id: m.id,
      orderId: m.threadId,
      senderId: m.senderUserId,
      senderName: m.senderName,
      senderType:
        m.senderRole === 'recipient'
          ? 'customer'
          : m.senderRole === 'system_bizx'
          ? 'platform'
          : 'store',
      body: m.body,
      attachments: m.attachments || [],
      readByCustomerAt: m.readByRecipientAt,
      readByStoreAt: m.readByStaffAt,
      createdAt: m.createdAt
    }));
  }, [messages]);

  const renderAvatar = (thread: InboxThreadItem) => {
    if (thread.senderAvatarUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={api.storage.resolveMediaUrl(thread.senderAvatarUrl) || ''}
          alt={thread.senderName}
          className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
        />
      );
    }
    if (thread.senderType === 'bizx') {
      return (
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
      );
    }
    if (thread.senderType === 'promo') {
      return (
        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
          <Megaphone className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
        <Headphones className="w-4 h-4" />
      </div>
    );
  };

  const handleSendReply = async (dto: {
    body?: string;
    attachments?: OrderMessageAttachmentDto[];
  }) => {
    if (!selectedThreadId) return;
    const res = await api.inbox.sendMessage(selectedThreadId, dto);
    if (res.success && res.data) {
      setMessages((prev) => [...prev, res.data]);
      await loadThreads(true);
    }
  };

  const handleUploadAttachment = async (file: File): Promise<OrderMessageAttachmentDto> => {
    if (!selectedThreadId) throw new Error('No thread selected');
    const res = await api.inbox.uploadAttachment(selectedThreadId, file);
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Не вдалося завантажити файл');
    }
    return res.data;
  };

  const handleCreateSupportThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supportSubject.trim().length < 3 || supportBody.trim().length < 5) {
      setSupportError(
        locale === 'en'
          ? 'Please enter a subject and message (min 5 chars)'
          : 'Вкажіть тему та опишіть питання (мін. 5 символів)'
      );
      return;
    }
    setIsCreatingSupport(true);
    setSupportError(null);
    try {
      const res = await api.inbox.createSupportThread({
        subject: supportSubject.trim(),
        body: supportBody.trim()
      });
      if (res.success && res.data) {
        setShowNewSupport(false);
        setSupportSubject('');
        setSupportBody('');
        await loadThreads(true);
        setSelectedThreadId(res.data.id);
      }
    } catch (err: unknown) {
      const eObj = err as { data?: { message?: string }; message?: string };
      setSupportError(eObj?.data?.message || eObj?.message || 'Помилка створення звернення');
    } finally {
      setIsCreatingSupport(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-slate-700" />
            <span>{locale === 'en' ? 'Account Inbox' : 'Пошта та повідомлення'}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {locale === 'en'
              ? 'Official BizX notices, general support conversations, and partner promotions'
              : 'Офіційні листи від BizX, переписка із загальною підтримкою та пропозиції закладів'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={() => void loadThreads(false)}
            title={locale === 'en' ? 'Refresh' : 'Оновити'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingThreads ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setShowNewSupport(true);
              setSupportError(null);
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{locale === 'en' ? 'Contact Support' : 'Написати в підтримку'}</span>
          </Button>
        </div>
      </div>

      {/* Two-Pane Mail / Messenger Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border border-slate-200 rounded-xl overflow-hidden bg-white min-h-[540px]">
        {/* Left Pane: Thread List */}
        <div
          className={`lg:col-span-5 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col bg-slate-50/40 ${
            selectedThread ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Search & Filter Pills */}
          <div className="p-3 border-b border-slate-200 bg-white space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === 'en' ? 'Search inbox...' : 'Пошук листів та діалогів...'}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900"
              />
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              {(
                [
                  { id: 'all', label: locale === 'en' ? 'All' : 'Усі' },
                  { id: 'bizx', label: 'BizX' },
                  { id: 'support', label: locale === 'en' ? 'Support' : 'Підтримка' },
                  { id: 'promo', label: locale === 'en' ? 'Ads' : 'Реклама' }
                ] as const
              ).map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setFilter(pill.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors ${
                    filter === pill.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Threads Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[480px]">
            {isLoadingThreads && threads.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">Завантаження пошти...</div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Mail className="w-7 h-7 text-slate-300 mx-auto" />
                <div className="text-xs font-bold text-slate-600">
                  {locale === 'en' ? 'No conversations found' : 'Повідомлень не знайдено'}
                </div>
              </div>
            ) : (
              filteredThreads.map((t) => {
                const isSelected = t.id === selectedThreadId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedThreadId(t.id)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors ${
                      isSelected
                        ? 'bg-slate-900/5 border-l-2 border-l-slate-900'
                        : t.unreadCount > 0
                        ? 'bg-blue-50/40 hover:bg-blue-50/70'
                        : 'hover:bg-slate-100/70 bg-white'
                    }`}
                  >
                    {renderAvatar(t)}

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-black text-slate-900 truncate">
                            {t.senderName}
                          </span>
                          <InboxBadge type={t.badgeType} locale={locale} />
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(t.lastMessageAt).toLocaleDateString('uk-UA', {
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-800 truncate">{t.subject}</div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-500 truncate">
                          {t.lastMessagePreview || '—'}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {!t.canReply && (
                            <span title="Відповідь вимкнено">
                              <Lock className="w-3 h-3 text-slate-400" />
                            </span>
                          )}
                          <CountBadge count={t.unreadCount} tone="blue" />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Selected Conversation */}
        <div
          className={`lg:col-span-7 flex flex-col bg-white ${
            selectedThread ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {selectedThread ? (
            <>
              {/* Conversation Header */}
              <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedThreadId(null)}
                    className="lg:hidden p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  {renderAvatar(selectedThread)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black text-slate-900 truncate">
                        {selectedThread.senderName}
                      </span>
                      <InboxBadge type={selectedThread.badgeType} locale={locale} />
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600 truncate">
                      {selectedThread.subject}
                    </div>
                  </div>
                </div>

                {!selectedThread.canReply && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500 shrink-0">
                    <Lock className="w-3 h-3" />
                    <span>{locale === 'en' ? 'Read-only' : 'Без відповіді'}</span>
                  </span>
                )}
              </div>

              {/* Chat Thread Body */}
              <div className="flex-1 flex flex-col p-3">
                <OrderChatBox
                  messages={mappedMessages}
                  viewerRole="customer"
                  canSend={selectedThread.canReply}
                  locale={locale}
                  isLoading={isLoadingMessages}
                  resolveMediaUrl={(u) => api.storage.resolveMediaUrl(u) || u}
                  onSendMessage={handleSendReply}
                  onUploadAttachment={selectedThread.canReply ? handleUploadAttachment : undefined}
                  readOnlyNotice={
                    !selectedThread.canReply ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {selectedThread.senderType === 'promo'
                            ? locale === 'en'
                              ? 'Promotional announcement from a partner business — replies are disabled.'
                              : 'Рекламне повідомлення від закладу — відповіді в цьому діалозі вимкнено.'
                            : locale === 'en'
                              ? 'Official BizX platform message — replies are disabled.'
                              : 'Офіційне повідомлення від платформи BizX — відповіді в цьому діалозі вимкнено.'}
                        </span>
                      </div>
                    ) : undefined
                  }
                  className="flex-1 border-0 shadow-none"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-9 h-9 opacity-40" />
              <div className="text-xs font-bold text-slate-600">
                {locale === 'en' ? 'Select a conversation on the left' : 'Оберіть діалог зліва'}
              </div>
              <p className="text-[11px] max-w-xs">
                {locale === 'en'
                  ? 'Read official notices from BizX, partner ads, or chat with BizX general support.'
                  : 'Тут зберігаються листи від модерації BizX, звернення до загальної підтримки та рекламні пропозиції закладів.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Support Thread Modal — Unified Light Modal */}
      <Modal
        isOpen={showNewSupport}
        onClose={() => setShowNewSupport(false)}
        size="md"
        tone="success"
        icon={<Headphones className="w-4 h-4" />}
        title={locale === 'en' ? 'New message to BizX Support' : 'Звернення до підтримки BizX'}
      >
        <form onSubmit={handleCreateSupportThread} className="space-y-4">
          {supportError && <AlertBanner tone="danger">{supportError}</AlertBanner>}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              {locale === 'en' ? 'Subject *' : 'Тема звернення *'}
            </label>
            <input
              type="text"
              required
              minLength={3}
              value={supportSubject}
              onChange={(e) => setSupportSubject(e.target.value)}
              placeholder={
                locale === 'en'
                  ? 'e.g. Account verification or subscription'
                  : 'Наприклад: Підключення домену або питання по підписці'
              }
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              {locale === 'en' ? 'Message *' : 'Повідомлення *'}
            </label>
            <textarea
              required
              minLength={5}
              rows={4}
              value={supportBody}
              onChange={(e) => setSupportBody(e.target.value)}
              placeholder={
                locale === 'en'
                  ? 'Describe your question...'
                  : 'Опишіть ваше питання (для питань щодо конкретного замовлення використовуйте чат у самому замовленні)...'
              }
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setShowNewSupport(false)}>
              {locale === 'en' ? 'Cancel' : 'Скасувати'}
            </Button>
            <Button type="submit" variant="primary" disabled={isCreatingSupport}>
              <Send className="w-3.5 h-3.5" />
              <span>{locale === 'en' ? 'Send' : 'Надіслати'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
