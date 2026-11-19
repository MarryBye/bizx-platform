import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { MaterialIcon } from '../components/MaterialIcon';
import { MobileInboxBadge, MobileCountBadge } from '../components/MobileBadge';
import { MobileChatThread, type MobileChatMessage } from '../components/MobileChatThread';
import { mobileApi } from '../lib/api';
import type { InboxThreadItem, InboxMessageItem } from '@bizx/common-types';

interface InboxModalProps {
  visible: boolean;
  onClose: () => void;
  onUnreadChanged?: (count: number) => void;
}

type InboxFilter = 'all' | 'bizx' | 'support' | 'promo';

export const InboxModal: React.FC<InboxModalProps> = ({
  visible,
  onClose,
  onUnreadChanged
}) => {
  const [threads, setThreads] = useState<InboxThreadItem[]>([]);
  const [selectedThread, setSelectedThread] = useState<InboxThreadItem | null>(null);
  const [messages, setMessages] = useState<InboxMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Create support ticket form
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketBody, setTicketBody] = useState('');
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  // 1-click promo unsubscribe state
  const [unsubscribedStores, setUnsubscribedStores] = useState<Record<string, boolean>>({});
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);

  const loadThreads = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const res = await mobileApi.inbox.getThreads();
        if (res.success && res.data) {
          setThreads(res.data);
          const total = res.data.reduce((acc, item) => acc + (item.unreadCount || 0), 0);
          onUnreadChanged?.(total);
        }
      } catch {
        // ignore
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [onUnreadChanged]
  );

  useEffect(() => {
    if (!visible) return;
    setSelectedThread(null);
    setShowNewTicket(false);
    void loadThreads(false);
    const interval = setInterval(() => {
      void loadThreads(true);
    }, 15_000);
    return () => clearInterval(interval);
  }, [visible, loadThreads]);

  const openThread = useCallback(
    async (thread: InboxThreadItem) => {
      setSelectedThread(thread);
      setShowNewTicket(false);
      setMessages([]);
      try {
        const res = await mobileApi.inbox.getMessages(thread.id);
        if (res.success && res.data) {
          setMessages(res.data);
          if (thread.unreadCount > 0) {
            await mobileApi.inbox.markRead(thread.id).catch(() => {});
            setThreads((prev) => {
              const next = prev.map((t) => (t.id === thread.id ? { ...t, unreadCount: 0 } : t));
              const total = next.reduce((acc, item) => acc + (item.unreadCount || 0), 0);
              onUnreadChanged?.(total);
              return next;
            });
          }
        }
      } catch {
        // ignore
      }
    },
    [onUnreadChanged]
  );

  // Poll active thread messages while viewing a replyable conversation
  useEffect(() => {
    if (!visible || !selectedThread) return;
    const interval = setInterval(() => {
      mobileApi.inbox
        .getMessages(selectedThread.id)
        .then((res) => {
          if (res.success && res.data) setMessages(res.data);
        })
        .catch(() => {});
    }, 10_000);
    return () => clearInterval(interval);
  }, [visible, selectedThread]);

  const handleSendReply = async () => {
    if (!selectedThread || !selectedThread.canReply || !replyText.trim()) return;
    setIsSending(true);
    try {
      const res = await mobileApi.inbox.sendMessage(selectedThread.id, {
        body: replyText.trim()
      });
      if (res.success && res.data) {
        setReplyText('');
        setMessages((prev) => [...prev, res.data]);
        void loadThreads(true);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateSupportTicket = async () => {
    if (ticketSubject.trim().length < 3 || ticketBody.trim().length < 5) {
      setTicketError('Вкажіть тему (мін. 3 символи) та опишіть питання (мін. 5 символів)');
      return;
    }
    setIsCreatingTicket(true);
    setTicketError(null);
    try {
      const res = await mobileApi.inbox.createSupportThread({
        subject: ticketSubject.trim(),
        body: ticketBody.trim()
      });
      if (res.success && res.data) {
        setTicketSubject('');
        setTicketBody('');
        setShowNewTicket(false);
        await loadThreads(true);
        await openThread(res.data);
      }
    } catch (err: any) {
      setTicketError(err?.data?.message || err?.message || 'Не вдалося створити звернення');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const handleUnsubscribePromo = async (storeId: string) => {
    setIsUnsubscribing(true);
    try {
      const res = await mobileApi.broadcasts.updateStoreMarketingSubscription(storeId, {
        subscribed: false,
        source: 'inbox_unsubscribe'
      });
      if (res.success) {
        setUnsubscribedStores((prev) => ({ ...prev, [storeId]: true }));
      }
    } catch {
      // ignore
    } finally {
      setIsUnsubscribing(false);
    }
  };

  const filteredThreads = useMemo(() => {
    if (filter === 'all') return threads;
    return threads.filter((t) => t.senderType === filter);
  }, [threads, filter]);

  const mappedMessages: MobileChatMessage[] = useMemo(
    () =>
      messages.map((m) => ({
        id: m.id,
        senderRole:
          m.senderRole === 'recipient'
            ? 'own'
            : m.senderRole === 'system_bizx'
              ? 'platform'
              : 'other',
        senderName: m.senderName,
        body: m.body,
        attachments: m.attachments,
        createdAt: m.createdAt
      })),
    [messages]
  );

  const promoStoreId =
    selectedThread?.senderType === 'promo'
      ? selectedThread.senderStoreId || selectedThread.relatedStoreId
      : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-slate-50">
        {/* Top Header */}
        <View className="bg-white border-b border-slate-200 px-4 py-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1">
            {selectedThread || showNewTicket ? (
              <TouchableOpacity
                onPress={() => {
                  setSelectedThread(null);
                  setShowNewTicket(false);
                }}
                className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center"
              >
                <MaterialIcon name="arrow-back" size={18} color="#0f172a" />
              </TouchableOpacity>
            ) : (
              <MaterialIcon name="mail" size={20} color="#0f172a" />
            )}
            <View className="flex-1">
              <Text className="text-sm font-black text-slate-900" numberOfLines={1}>
                {showNewTicket
                  ? 'Звернення в підтримку BizX'
                  : selectedThread
                    ? selectedThread.senderName
                    : 'Пошта та сповіщення'}
              </Text>
              {selectedThread && (
                <Text className="text-[11px] text-slate-500" numberOfLines={1}>
                  {selectedThread.subject}
                </Text>
              )}
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            {!selectedThread && !showNewTicket && (
              <TouchableOpacity
                onPress={() => {
                  setShowNewTicket(true);
                  setTicketError(null);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 flex-row items-center gap-1"
              >
                <MaterialIcon name="support-agent" size={14} color="#ffffff" />
                <Text className="text-[11px] font-bold text-white">Підтримка</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center"
            >
              <MaterialIcon name="close" size={18} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </View>

        {showNewTicket ? (
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12 }}>
            <View className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <Text className="text-xs text-slate-500 leading-4">
                Опишіть ваше питання — співробітник служби підтримки BizX відповість у цьому чаті.
              </Text>
              {ticketError && (
                <View className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                  <Text className="text-xs font-semibold text-rose-700">{ticketError}</Text>
                </View>
              )}
              <View className="space-y-1">
                <Text className="text-xs font-bold text-slate-700">Тема звернення *</Text>
                <TextInput
                  value={ticketSubject}
                  onChangeText={setTicketSubject}
                  placeholder="Напр.: Питання щодо підписки або акаунту"
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-900"
                />
              </View>
              <View className="space-y-1">
                <Text className="text-xs font-bold text-slate-700">Повідомлення *</Text>
                <TextInput
                  value={ticketBody}
                  onChangeText={setTicketBody}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholder="Детально опишіть вашу ситуацію..."
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-900 min-h-[100px]"
                />
              </View>
              <TouchableOpacity
                onPress={handleCreateSupportTicket}
                disabled={isCreatingTicket}
                className="bg-slate-900 py-3 rounded-lg items-center"
              >
                {isCreatingTicket ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white text-xs font-bold">Надіслати звернення</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : !selectedThread ? (
          <View className="flex-1">
            {/* Filter Pills */}
            <View className="bg-white border-b border-slate-200 px-4 py-2.5 flex-row gap-1.5">
              {(
                [
                  { id: 'all', label: 'Усі' },
                  { id: 'bizx', label: 'BizX' },
                  { id: 'support', label: 'Підтримка' },
                  { id: 'promo', label: 'Акції' }
                ] as const
              ).map((pill) => (
                <TouchableOpacity
                  key={pill.id}
                  onPress={() => setFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-lg ${
                    filter === pill.id ? 'bg-slate-900' : 'bg-slate-100'
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold ${
                      filter === pill.id ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {pill.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 10 }}>
              {isLoading && threads.length === 0 ? (
                <View className="py-12 items-center">
                  <ActivityIndicator size="large" color="#0f172a" />
                </View>
              ) : filteredThreads.length === 0 ? (
                <View className="bg-white border border-dashed border-slate-300 rounded-xl p-8 items-center">
                  <MaterialIcon name="mail-outline" size={28} color="#94a3b8" />
                  <Text className="text-sm font-bold text-slate-700 mt-2">
                    Повідомлень не знайдено
                  </Text>
                </View>
              ) : (
                filteredThreads.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => openThread(t)}
                    className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm"
                  >
                    <View className="flex-row items-center justify-between mb-1">
                      <View className="flex-row items-center gap-1.5 flex-1 pr-2">
                        <Text className="text-xs font-black text-slate-900" numberOfLines={1}>
                          {t.senderName}
                        </Text>
                        <MobileInboxBadge type={t.badgeType} />
                      </View>
                      <MobileCountBadge count={t.unreadCount} tone="blue" />
                    </View>
                    <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>
                      {t.subject}
                    </Text>
                    <View className="flex-row items-center justify-between mt-1">
                      <Text className="text-[11px] text-slate-500 flex-1 pr-2" numberOfLines={1}>
                        {t.lastMessagePreview}
                      </Text>
                      {!t.canReply && <MaterialIcon name="lock" size={12} color="#94a3b8" />}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        ) : (
          <View className="flex-1">
            <MobileChatThread
              scrollable
              messages={mappedMessages}
              canSend={selectedThread.canReply}
              text={replyText}
              onChangeText={setReplyText}
              onSend={handleSendReply}
              isSending={isSending}
              placeholder="Написати відповідь..."
              readOnlyMessage={
                selectedThread.senderType === 'promo'
                  ? 'Акційна розсилка закладу — відповіді вимкнено'
                  : 'Офіційне повідомлення BizX — відповіді вимкнено'
              }
            />
            {promoStoreId && (
              <View className="bg-white border-t border-slate-200 px-4 py-2.5 items-center">
                {unsubscribedStores[promoStoreId] ? (
                  <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <MaterialIcon name="check-circle" size={14} color="#059669" />
                    <Text className="text-xs font-bold text-emerald-800">
                      Ви відписалися від акцій цього закладу
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => void handleUnsubscribePromo(promoStoreId)}
                    disabled={isUnsubscribing}
                    className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200"
                  >
                    <MaterialIcon name="notifications-off" size={14} color="#be123c" />
                    <Text className="text-xs font-bold text-rose-700">
                      Відписатися від розсилок закладу
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};
