import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking
} from 'react-native';
import type { OrderMessageAttachmentDto } from '@bizx/common-types';
import { MaterialIcon } from './MaterialIcon';
import { SafeImage } from './SafeImage';
import { resolveMobileMediaUrl } from '../lib/media';

export interface MobileChatMessage {
  id: string;
  senderName?: string | null;
  senderRole: 'own' | 'other' | 'platform' | 'system';
  body?: string | null;
  attachments?: OrderMessageAttachmentDto[];
  isRead?: boolean;
  createdAt: string;
}

export interface MobileChatThreadProps {
  messages: MobileChatMessage[];
  emptyTitle?: string;
  emptySubtitle?: string;
  canSend: boolean;
  readOnlyMessage?: string;
  quickReplies?: readonly string[];
  text: string;
  onChangeText: (val: string) => void;
  onSend: () => void;
  isSending?: boolean;
  pendingAttachments?: OrderMessageAttachmentDto[];
  onPickAttachment?: () => void;
  onRemoveAttachment?: (idx: number) => void;
  isUploading?: boolean;
  placeholder?: string;
  /** Render inside a full-height flex screen (InboxModal) vs inline card (OrderDetailScreen) */
  scrollable?: boolean;
}

export const MobileChatThread: React.FC<MobileChatThreadProps> = ({
  messages,
  emptyTitle = 'Повідомлень ще немає',
  emptySubtitle = 'Напишіть повідомлення, щоб розпочати діалог',
  canSend,
  readOnlyMessage,
  quickReplies,
  text,
  onChangeText,
  onSend,
  isSending = false,
  pendingAttachments = [],
  onPickAttachment,
  onRemoveAttachment,
  isUploading = false,
  placeholder = 'Написати повідомлення...',
  scrollable = false
}) => {
  const canSubmit = !isSending && (text.trim().length > 0 || pendingAttachments.length > 0);

  const renderMessagesBody = () => (
    <View className={scrollable ? 'gap-2.5' : 'p-3.5 bg-slate-50/50 space-y-2.5 min-h-[180px]'}>
      {messages.length === 0 ? (
        <View className="py-8 items-center">
          <MaterialIcon name="forum" size={26} color="#cbd5e1" />
          <Text className="text-xs font-semibold text-slate-500 mt-2">{emptyTitle}</Text>
          <Text className="text-[11px] text-slate-400 text-center mt-0.5">{emptySubtitle}</Text>
        </View>
      ) : (
        messages.map((m) => {
          if (m.senderRole === 'system') {
            return (
              <View key={m.id} className="items-center my-1">
                <View className="bg-slate-200/80 px-3 py-1 rounded-full">
                  <Text className="text-[10px] font-semibold text-slate-700 text-center">
                    {m.body}
                  </Text>
                </View>
              </View>
            );
          }

          const isOwn = m.senderRole === 'own';
          const isPlatform = m.senderRole === 'platform';

          return (
            <View key={m.id} className={`mb-2 ${isOwn ? 'items-end' : 'items-start'}`}>
              <View
                className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 border ${
                  isOwn
                    ? 'bg-slate-900 border-slate-900 rounded-br-sm'
                    : isPlatform
                      ? 'bg-indigo-50 border-indigo-200 rounded-bl-sm'
                      : 'bg-white border-slate-200 rounded-bl-sm'
                }`}
              >
                {!isOwn && m.senderName ? (
                  <Text
                    className={`text-[10px] font-black mb-0.5 ${
                      isPlatform ? 'text-indigo-700' : 'text-slate-500'
                    }`}
                  >
                    {m.senderName}
                  </Text>
                ) : null}

                {m.body ? (
                  <Text className={`text-xs leading-4 ${isOwn ? 'text-white' : 'text-slate-800'}`}>
                    {m.body}
                  </Text>
                ) : null}

                {m.attachments && m.attachments.length > 0 && (
                  <View className="mt-2 gap-1.5">
                    {m.attachments.map((att, idx) => {
                      const isImage = att.mimeType.startsWith('image/');
                      const resolvedUrl = resolveMobileMediaUrl(att.url) || att.url;
                      return isImage ? (
                        <TouchableOpacity
                          key={`${m.id}-att-${idx}`}
                          onPress={() => Linking.openURL(resolvedUrl).catch(() => {})}
                          className="rounded-lg overflow-hidden border border-slate-200"
                        >
                          <SafeImage
                            sourceUrl={att.url}
                            className="w-44 h-32"
                            resizeMode="cover"
                            fallback={
                              <View className="w-44 h-32 bg-slate-100 items-center justify-center">
                                <MaterialIcon name="image" size={24} color="#94a3b8" />
                              </View>
                            }
                          />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          key={`${m.id}-att-${idx}`}
                          onPress={() => Linking.openURL(resolvedUrl).catch(() => {})}
                          className={`flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
                            isOwn
                              ? 'bg-slate-800 border-slate-700'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <MaterialIcon
                            name="attach-file"
                            size={14}
                            color={isOwn ? '#e2e8f0' : '#475569'}
                          />
                          <Text
                            className={`text-[11px] font-medium ${
                              isOwn ? 'text-slate-100' : 'text-slate-700'
                            }`}
                            numberOfLines={1}
                          >
                            {att.fileName}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <View className="flex-row items-center justify-end gap-1 mt-1">
                  <Text className="text-[9px] text-slate-400">
                    {new Date(m.createdAt).toLocaleTimeString('uk-UA', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                  {isOwn && m.isRead !== undefined && (
                    <Text
                      className={`text-[10px] font-bold ${
                        m.isRead ? 'text-sky-400' : 'text-slate-400'
                      }`}
                    >
                      {m.isRead ? '✓✓' : '✓'}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  const renderFooter = () => (
    <>
      {/* Quick-reply Chips */}
      {canSend && quickReplies && quickReplies.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 6 }}
          className="border-t border-slate-100 bg-white shrink-0"
        >
          {quickReplies.map((phrase) => (
            <TouchableOpacity
              key={phrase}
              onPress={() => onChangeText(phrase)}
              className="bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-full"
            >
              <Text className="text-[11px] font-medium text-slate-700">{phrase}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Pending attachments preview */}
      {canSend && pendingAttachments.length > 0 && (
        <View className="px-3 py-2 border-t border-slate-100 flex-row flex-wrap gap-2 bg-slate-50">
          {pendingAttachments.map((att, idx) => (
            <View
              key={`${att.url}-${idx}`}
              className="flex-row items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1"
            >
              <MaterialIcon name="image" size={14} color="#0f172a" />
              <Text className="text-[11px] text-slate-700 max-w-[140px]" numberOfLines={1}>
                {att.fileName}
              </Text>
              {onRemoveAttachment && (
                <TouchableOpacity onPress={() => onRemoveAttachment(idx)}>
                  <MaterialIcon name="close" size={14} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Composer OR Unified Read-only Notice */}
      {canSend ? (
        <View className="p-2.5 border-t border-slate-200 bg-white flex-row items-center gap-2">
          {onPickAttachment && (
            <TouchableOpacity
              disabled={isUploading}
              onPress={onPickAttachment}
              className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 items-center justify-center"
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <MaterialIcon name="add-photo-alternate" size={19} color="#334155" />
              )}
            </TouchableOpacity>
          )}

          <TextInput
            value={text}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            multiline
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 max-h-24"
          />

          <TouchableOpacity
            disabled={!canSubmit}
            onPress={onSend}
            className={`w-9 h-9 rounded-lg items-center justify-center ${
              canSubmit ? 'bg-slate-900' : 'bg-slate-200'
            }`}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <MaterialIcon name="send" size={17} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      ) : readOnlyMessage ? (
        <View className="p-3 bg-slate-100 border-t border-slate-200 flex-row items-center justify-center gap-1.5">
          <MaterialIcon name="lock" size={14} color="#64748b" />
          <Text className="text-[11px] font-medium text-slate-600">{readOnlyMessage}</Text>
        </View>
      ) : null}
    </>
  );

  if (scrollable) {
    return (
      <View className="flex-1">
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {renderMessagesBody()}
        </ScrollView>
        {renderFooter()}
      </View>
    );
  }

  return (
    <View>
      {renderMessagesBody()}
      {renderFooter()}
    </View>
  );
};
