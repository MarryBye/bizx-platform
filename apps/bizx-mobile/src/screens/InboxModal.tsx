import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
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

export const InboxModal: React.FC<InboxModalProps> = ({
  visible,
  onClose,
  onUnreadChanged
}) => {
  const [threads, setThreads] = useState<InboxThreadItem[]>([]);
  const [selectedThread, setSelectedThread] = useState<InboxThreadItem | null>(null);
  const [messages, setMessages] = useState<InboxMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const loadThreads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await mobileApi.inbox.getThreads();
      if (res.success && res.data) {
        setThreads(res.data);
        const total = res.data.reduce((acc, item) => acc + (item.unreadCount || 0), 0);
        onUnreadChanged?.(total);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onUnreadChanged]);

  useEffect(() => {
    if (visible) {
      setSelectedThread(null);
      void loadThreads();
    }
  }, [visible, loadThreads]);

  const openThread = async (thread: InboxThreadItem) => {
    setSelectedThread(thread);
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
  };

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
        void loadThreads();
      }
    } finally {
      setIsSending(false);
    }
  };

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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-slate-50">
        {/* Top Header */}
        <View className="bg-white border-b border-slate-200 px-4 py-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1">
            {selectedThread ? (
              <TouchableOpacity
                onPress={() => setSelectedThread(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center"
              >
                <MaterialIcon name="arrow-back" size={18} color="#0f172a" />
              </TouchableOpacity>
            ) : (
              <MaterialIcon name="mail" size={20} color="#0f172a" />
            )}
            <View className="flex-1">
              <Text className="text-sm font-black text-slate-900" numberOfLines={1}>
                {selectedThread ? selectedThread.senderName : 'Пошта та сповіщення'}
              </Text>
              {selectedThread && (
                <Text className="text-[11px] text-slate-500" numberOfLines={1}>
                  {selectedThread.subject}
                </Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            onPress={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center"
          >
            <MaterialIcon name="close" size={18} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {!selectedThread ? (
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 10 }}>
            {isLoading && threads.length === 0 ? (
              <View className="py-12 items-center">
                <ActivityIndicator size="large" color="#0f172a" />
              </View>
            ) : threads.length === 0 ? (
              <View className="bg-white border border-dashed border-slate-300 rounded-xl p-8 items-center">
                <MaterialIcon name="mail-outline" size={28} color="#94a3b8" />
                <Text className="text-sm font-bold text-slate-700 mt-2">Пошта порожня</Text>
              </View>
            ) : (
              threads.map((t) => (
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
        ) : (
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
                ? 'Рекламне повідомлення — відповіді вимкнено'
                : 'Офіційне повідомлення BizX — відповіді вимкнено'
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};
