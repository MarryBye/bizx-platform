import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { platformApi } from '../lib/api';
import { useTranslation } from '../hooks/useTranslation';
import type {
  PlatformSupportThreadItem,
  InboxMessageItem
} from '@bizx/common-types';
import {
  Button,
  CountBadge,
  OrderChatBox,
  type OrderChatMessage,
  type OrderChatAttachment
} from '@bizx/ui';
import {
  Headphones,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Clock,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';

interface SupportViewProps {
  canReply: boolean;
  onSupportChanged?: () => void;
}

export const SupportView: React.FC<SupportViewProps> = ({ canReply, onSupportChanged }) => {
  const { locale } = useTranslation();
  const isEn = locale === 'en';

  const [threads, setThreads] = useState<PlatformSupportThreadItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InboxMessageItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');
  const [error, setError] = useState<string | null>(null);

  const loadThreads = useCallback(async (silent = false) => {
    if (!silent) setIsLoadingList(true);
    try {
      const res = await platformApi.broadcasts.getPlatformSupportThreads();
      if (res.success && res.data) {
        setThreads(res.data);
        setSelectedId((prev) => {
          if (prev && res.data.some((t) => t.id === prev)) return prev;
          return res.data[0]?.id ?? null;
        });
      }
      setError(null);
    } catch (err: any) {
      if (!silent) setError(err?.message || (isEn ? 'Failed to load support tickets' : 'Не вдалося завантажити звернення'));
    } finally {
      if (!silent) setIsLoadingList(false);
    }
  }, [isEn]);

  const loadMessages = useCallback(
    async (threadId: string, silent = false) => {
      if (!silent) setIsLoadingMsgs(true);
      try {
        const res = await platformApi.broadcasts.getPlatformSupportMessages(threadId);
        if (res.success && res.data) {
          setMessages(res.data);
        }
        const readRes = await platformApi.broadcasts.markPlatformSupportThreadRead(threadId);
        if (readRes.success && (readRes.data?.updated ?? 0) > 0) {
          setThreads((prev) =>
            prev.map((t) =>
              t.id === threadId ? { ...t, unreadByStaffCount: 0, unreadCount: 0 } : t
            )
          );
          onSupportChanged?.();
        }
      } catch (err: any) {
        if (!silent) setError(err?.message || (isEn ? 'Failed to load messages' : 'Не вдалося завантажити повідомлення'));
      } finally {
        if (!silent) setIsLoadingMsgs(false);
      }
    },
    [isEn, onSupportChanged]
  );

  useEffect(() => {
    void loadThreads(false);
    const interval = setInterval(() => {
      void loadThreads(true);
    }, 15_000);
    return () => clearInterval(interval);
  }, [loadThreads]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    void loadMessages(selectedId, false);
    const interval = setInterval(() => {
      void loadMessages(selectedId, true);
    }, 10_000);
    return () => clearInterval(interval);
  }, [selectedId, loadMessages]);

  const filteredThreads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads.filter((t) => {
      if (filterMode === 'unread' && t.unreadByStaffCount <= 0) return false;
      if (!q) return true;
      return (
        t.subject.toLowerCase().includes(q) ||
        (t.userName || '').toLowerCase().includes(q) ||
        (t.userEmail || '').toLowerCase().includes(q) ||
        (t.lastMessagePreview || '').toLowerCase().includes(q)
      );
    });
  }, [threads, search, filterMode]);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === selectedId) || null,
    [threads, selectedId]
  );

  const chatMessages: OrderChatMessage[] = useMemo(
    () =>
      messages.map((m) => ({
        id: m.id,
        orderId: m.threadId,
        senderId: m.senderUserId,
        senderName: m.senderName,
        senderType: m.senderRole === 'recipient' ? 'customer' : 'platform',
        body: m.body,
        attachments: (m.attachments || []) as OrderChatAttachment[],
        readByCustomerAt: m.readByRecipientAt,
        readByStoreAt: m.readByStaffAt,
        createdAt: m.createdAt
      })),
    [messages]
  );

  const handleSendMessage = async (dto: {
    body?: string;
    attachments?: OrderChatAttachment[];
  }) => {
    if (!selectedId) return;
    const res = await platformApi.broadcasts.replyToPlatformSupportThread(selectedId, {
      body: dto.body,
      attachments: (dto.attachments || []).map((a) => ({
        url: a.url,
        fileName: a.fileName,
        mimeType: a.mimeType,
        size: a.size ?? 0
      }))
    });
    if (res.success && res.data) {
      setMessages((prev) => [...prev, res.data]);
      void loadThreads(true);
      onSupportChanged?.();
    }
  };

  const handleUploadAttachment = async (file: File): Promise<OrderChatAttachment> => {
    if (!selectedId) {
      throw new Error(isEn ? 'Select a ticket first' : 'Оберіть звернення перед завантаженням');
    }
    const res = await platformApi.broadcasts.uploadPlatformSupportAttachment(file, selectedId);
    if (!res.success || !res.data) {
      throw new Error(isEn ? 'Upload failed' : 'Помилка завантаження файлу');
    }
    return {
      url: res.data.publicUrl,
      fileName: res.data.originalName,
      mimeType: res.data.mimeType,
      size: res.data.size
    };
  };

  const totalUnread = threads.reduce((acc, t) => acc + t.unreadByStaffCount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Headphones className="w-5 h-5 text-blue-600" />
            {isEn ? 'BizX Support Inbox' : 'Звернення в підтримку BizX'}
            {totalUnread > 0 && <CountBadge count={totalUnread} tone="red" />}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEn
              ? 'Direct user tickets created from BizX Account Mail (non-order support).'
              : 'Прямі звернення користувачів із Пошти BizX (технічні та загальні питання).'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadThreads(false)}
          disabled={isLoadingList}
          className="gap-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? 'animate-spin' : ''}`} />
          {isEn ? 'Refresh' : 'Оновити'}
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        {/* Left pane: Tickets list */}
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col">
          <div className="p-3 border-b border-slate-100 space-y-2.5 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isEn ? 'Search user, email or topic...' : 'Пошук за темою, ім’ям або email...'}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  filterMode === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {isEn ? `All (${threads.length})` : `Усі (${threads.length})`}
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('unread')}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 ${
                  filterMode === 'unread'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{isEn ? 'Unread' : 'Непрочитані'}</span>
                {threads.filter((t) => t.unreadByStaffCount > 0).length > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      filterMode === 'unread' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {threads.filter((t) => t.unreadByStaffCount > 0).length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[540px]">
            {isLoadingList ? (
              <div className="p-6 text-center text-xs text-slate-400">
                {isEn ? 'Loading tickets...' : 'Завантаження звернень...'}
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-500">
                  {isEn ? 'No support tickets found' : 'Звернень до підтримки поки немає'}
                </p>
              </div>
            ) : (
              filteredThreads.map((t) => {
                const isSelected = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={`w-full text-left p-3.5 transition-colors hover:bg-slate-50 ${
                      isSelected ? 'bg-blue-50/70 border-l-2 border-l-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {t.userName || t.userEmail || 'BizX User'}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-700 truncate mt-0.5">
                          {t.subject}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {new Date(t.lastMessageAt).toLocaleDateString(isEn ? 'en-US' : 'uk-UA', {
                            day: '2-digit',
                            month: '2-digit'
                          })}
                        </span>
                        {t.unreadByStaffCount > 0 && (
                          <CountBadge count={t.unreadByStaffCount} tone="red" />
                        )}
                      </div>
                    </div>
                    {t.lastMessagePreview && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                        {t.lastMessagePreview}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right pane: Active conversation */}
        <div className="lg:col-span-8 flex flex-col bg-slate-50/40">
          {!activeThread ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-2">
              <Headphones className="w-10 h-10 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-700">
                {isEn ? 'Select a ticket to view conversation' : 'Оберіть звернення зі списку ліворуч'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                {isEn
                  ? 'All replies are delivered directly into the user’s BizX Mail inbox in real time.'
                  : 'Усі відповіді миттєво доставляються у Пошту BizX користувача.'}
              </p>
            </div>
          ) : (
            <>
              <div className="p-4 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-extrabold text-slate-900 truncate">
                      {activeThread.subject}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {isEn ? 'Support Ticket' : 'Тікет підтримки'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 mt-1">
                    <span className="font-semibold text-slate-700">
                      {activeThread.userName || '—'}
                    </span>
                    {activeThread.userEmail && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {activeThread.userEmail}
                      </span>
                    )}
                    {activeThread.userPhone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {activeThread.userPhone}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(activeThread.createdAt).toLocaleString(isEn ? 'en-US' : 'uk-UA')}
                    </span>
                  </div>
                </div>
                {!canReply && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {isEn ? 'Read-only access' : 'Лише перегляд'}
                  </span>
                )}
              </div>

              <div className="flex-1 p-4 flex flex-col min-h-[480px]">
                <OrderChatBox
                  messages={chatMessages}
                  viewerRole="platform"
                  canSend={canReply}
                  readOnlyNotice={
                    !canReply
                      ? isEn
                        ? 'You need platform.support.reply permission to respond to tickets.'
                        : 'Для відповіді клієнту потрібне право «Відповіді в тікетах техпідтримки».'
                      : undefined
                  }
                  locale={locale}
                  isLoading={isLoadingMsgs}
                  resolveMediaUrl={(url) => platformApi.storage.resolveMediaUrl(url) || url}
                  onSendMessage={handleSendMessage}
                  onUploadAttachment={canReply ? handleUploadAttachment : undefined}
                  quickReplies={
                    isEn
                      ? [
                          'Hello! We received your request and are reviewing it.',
                          'Could you please share a screenshot or more details?',
                          'Your issue has been resolved. Let us know if you need anything else!'
                        ]
                      : [
                          'Вітаємо! Ми отримали ваше звернення та вже перевіряємо деталі.',
                          'Уточніть, будь ласка, деталі або додайте скріншот для швидшої перевірки.',
                          'Питання вирішено! Якщо знадобиться допомога — пишіть у цей чат.'
                        ]
                  }
                  className="flex-1"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
