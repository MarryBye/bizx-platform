import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { sanitizeUiUrl, SAFE_CHAT_ACCEPT, validateChatUploadFile } from '../lib/security';
import {
  Send,
  Paperclip,
  Check,
  CheckCheck,
  FileText,
  X,
  Loader2,
  ShieldAlert,
  Image as ImageIcon
} from 'lucide-react';

export interface OrderChatAttachment {
  url: string;
  fileName: string;
  mimeType: string;
  size?: number;
}

export interface OrderChatMessage {
  id: string;
  orderId: string;
  senderId: string | null;
  senderName: string | null;
  senderType: 'customer' | 'store' | 'platform' | 'system';
  body: string | null;
  attachments: OrderChatAttachment[];
  readByCustomerAt: string | null;
  readByStoreAt: string | null;
  createdAt: string;
}

export interface OrderChatBoxProps {
  messages: OrderChatMessage[];
  viewerRole: 'customer' | 'store' | 'platform';
  canSend?: boolean;
  readOnlyNotice?: React.ReactNode;
  quickReplies?: readonly string[];
  locale?: 'uk' | 'en';
  isLoading?: boolean;
  resolveMediaUrl?: (url: string) => string;
  onSendMessage: (dto: { body?: string; attachments?: OrderChatAttachment[] }) => Promise<void>;
  onUploadAttachment?: (file: File) => Promise<OrderChatAttachment>;
  className?: string;
}

export const OrderChatBox: React.FC<OrderChatBoxProps> = ({
  messages,
  viewerRole,
  canSend = true,
  readOnlyNotice,
  quickReplies = [],
  locale = 'uk',
  isLoading = false,
  resolveMediaUrl,
  onSendMessage,
  onUploadAttachment,
  className
}) => {
  const [text, setText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<OrderChatAttachment[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const mediaUrl = (u: string) => sanitizeUiUrl(resolveMediaUrl ? resolveMediaUrl(u) : u);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUploadAttachment) return;
    const validation = validateChatUploadFile(file, locale);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const uploaded = await onUploadAttachment(file);
      setPendingAttachments((prev) => [...prev, uploaded]);
    } catch (err: any) {
      setError(
        err?.data?.message ||
          err?.message ||
          (locale === 'en' ? 'Failed to upload file' : 'Не вдалося завантажити файл')
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && pendingAttachments.length === 0) return;

    setIsSending(true);
    setError(null);
    try {
      await onSendMessage({
        body: trimmed || undefined,
        attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined
      });
      setText('');
      setPendingAttachments([]);
    } catch (err: any) {
      setError(
        err?.data?.message ||
          err?.message ||
          (locale === 'en' ? 'Failed to send message' : 'Не вдалося надіслати повідомлення')
      );
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString(locale === 'en' ? 'en-US' : 'uk-UA', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      className={cn(
        'flex flex-col border border-slate-200 rounded-xl bg-slate-50/70 overflow-hidden',
        className
      )}
    >
      {/* Messages Timeline */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-3.5 space-y-2.5 min-h-[240px] max-h-[380px]"
      >
        {isLoading && messages.length === 0 ? (
          <div className="h-full flex items-center justify-center py-10 text-xs text-slate-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{locale === 'en' ? 'Loading messages...' : 'Завантаження чату...'}</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-10 text-center text-xs text-slate-400">
            <p className="font-semibold text-slate-500">
              {locale === 'en' ? 'No messages yet' : 'Повідомлень поки немає'}
            </p>
            <p className="mt-1 max-w-xs text-[11px]">
              {locale === 'en'
                ? 'Start the conversation using a quick reply below or type your message.'
                : 'Почніть діалог — скористайтесь швидкою фразою нижче або напишіть повідомлення.'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.senderType === 'system') {
              return (
                <div key={msg.id} className="flex justify-center py-1">
                  <div className="max-w-[90%] px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] text-amber-950 text-center leading-relaxed">
                    <span>{msg.body}</span>
                    <span className="ml-2 text-[10px] text-amber-700/70">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                </div>
              );
            }

            const isOwn =
              (viewerRole === 'customer' && msg.senderType === 'customer') ||
              (viewerRole === 'store' && msg.senderType === 'store') ||
              (viewerRole === 'platform' && msg.senderType === 'platform');

            const isPlatformMsg = msg.senderType === 'platform';

            // Telegram-style read status for outgoing messages
            const isReadByRecipient =
              msg.senderType === 'customer'
                ? Boolean(msg.readByStoreAt)
                : msg.senderType === 'store'
                  ? Boolean(msg.readByCustomerAt)
                  : Boolean(msg.readByCustomerAt && msg.readByStoreAt);

            return (
              <div
                key={msg.id}
                className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}
              >
                <div
                  className={cn(
                    'max-w-[82%] rounded-2xl px-3.5 py-2 text-xs shadow-2xs space-y-1.5',
                    isOwn
                      ? 'bg-slate-900 text-white rounded-br-sm'
                      : isPlatformMsg
                        ? 'bg-blue-50 text-blue-950 border border-blue-200 rounded-bl-sm'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                  )}
                >
                  {!isOwn && (
                    <div className="flex items-center gap-1 text-[10px] font-bold opacity-75">
                      {isPlatformMsg && <ShieldAlert className="w-3 h-3 text-blue-600 shrink-0" />}
                      <span>
                        {msg.senderName ||
                          (msg.senderType === 'customer'
                            ? locale === 'en'
                              ? 'Customer'
                              : 'Клієнт'
                            : msg.senderType === 'store'
                              ? locale === 'en'
                                ? 'Store'
                                : 'Заклад'
                              : 'BizX')}
                      </span>
                    </div>
                  )}

                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {msg.attachments.map((att, idx) => {
                        const resolved = mediaUrl(att.url);
                        if (!resolved) {
                          return (
                            <span
                              key={`${att.fileName}-${idx}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-slate-200 bg-slate-100 text-slate-400"
                            >
                              <FileText className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate max-w-[160px]">{att.fileName}</span>
                            </span>
                          );
                        }
                        const isImg =
                          att.mimeType.startsWith('image/') &&
                          !att.mimeType.toLowerCase().includes('svg');
                        if (isImg) {
                          return (
                            <a
                              key={`${att.url}-${idx}`}
                              href={resolved}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-lg overflow-hidden border border-black/10 max-w-[180px]"
                            >
                              <img
                                src={resolved}
                                alt={att.fileName}
                                className="max-h-36 w-auto object-cover hover:opacity-90 transition-opacity"
                              />
                            </a>
                          );
                        }
                        return (
                          <a
                            key={`${att.url}-${idx}`}
                            href={resolved}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border',
                              isOwn
                                ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            )}
                          >
                            <FileText className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[160px]">{att.fileName}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {msg.body && (
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
                  )}

                  <div
                    className={cn(
                      'flex items-center justify-end gap-1 text-[10px]',
                      isOwn ? 'text-slate-300' : 'text-slate-400'
                    )}
                  >
                    <span>{formatTime(msg.createdAt)}</span>
                    {isOwn &&
                      (isReadByRecipient ? (
                        <CheckCheck
                          className="w-3.5 h-3.5 text-sky-400 shrink-0"
                          aria-label={locale === 'en' ? 'Read' : 'Прочитано'}
                        />
                      ) : (
                        <Check
                          className="w-3.5 h-3.5 text-slate-400 shrink-0"
                          aria-label={locale === 'en' ? 'Sent' : 'Надіслано'}
                        />
                      ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      {canSend ? (
        <div className="bg-white border-t border-slate-200 p-2.5 space-y-2">
          {error && (
            <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Reply Chips */}
          {quickReplies.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {quickReplies.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() => {
                    setText(phrase);
                    inputRef.current?.focus();
                  }}
                  className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors border border-slate-200/80"
                >
                  {phrase}
                </button>
              ))}
            </div>
          )}

          {/* Pending Attachments Preview */}
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pendingAttachments.map((att, idx) => (
                <span
                  key={`${att.url}-${idx}`}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700"
                >
                  {att.mimeType.startsWith('image/') ? (
                    <ImageIcon className="w-3 h-3 text-slate-500 shrink-0" />
                  ) : (
                    <FileText className="w-3 h-3 text-slate-500 shrink-0" />
                  )}
                  <span className="truncate max-w-[140px]">{att.fileName}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-slate-400 hover:text-rose-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            {onUploadAttachment && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={SAFE_CHAT_ACCEPT}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isUploading || isSending}
                  onClick={() => fileInputRef.current?.click()}
                  title={locale === 'en' ? 'Attach file' : 'Прикріпити файл'}
                  className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40 transition-colors shrink-0"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                </button>
              </>
            )}

            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isSending}
              placeholder={
                locale === 'en' ? 'Type a message...' : 'Напишіть повідомлення...'
              }
              className="flex-1 min-w-0 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900 transition-colors"
            />

            <button
              type="submit"
              disabled={isSending || isUploading || (!text.trim() && pendingAttachments.length === 0)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-40 transition-colors shrink-0"
            >
              {isSending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </form>
        </div>
      ) : readOnlyNotice ? (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/80 text-[11px] text-slate-500 flex items-center justify-center gap-1.5 text-center shrink-0">
          {readOnlyNotice}
        </div>
      ) : null}
    </div>
  );
};
