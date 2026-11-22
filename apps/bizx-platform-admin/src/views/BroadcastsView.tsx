import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { platformApi } from '../lib/api';
import { useTranslation } from '../hooks/useTranslation';
import { validateUploadFile, UPLOAD_POLICIES } from '@bizx/utils';
import type {
  PlatformBroadcastSummary,
  SubscriptionTier,
  PlatformBroadcastAudience
} from '@bizx/common-types';
import type { ExtendedBusiness } from './BusinessesView';
import type { PlatformUserRecord } from '../components/UserDetailsModal';
import { Button, Select, ConfirmModal, Badge } from '@bizx/ui';
import {
  Megaphone,
  Wrench,
  Sparkles,
  Send,
  Users,
  Building2,
  Paperclip,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Mail,
  Clock
} from 'lucide-react';

interface BroadcastsViewProps {
  canSend: boolean;
  businesses: ExtendedBusiness[];
  usersList: PlatformUserRecord[];
}

export const BroadcastsView: React.FC<BroadcastsViewProps> = ({
  canSend,
  businesses,
  usersList
}) => {
  const { locale } = useTranslation();
  const isEn = locale === 'en';

  const [summary, setSummary] = useState<PlatformBroadcastSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [broadcastType, setBroadcastType] = useState<'technical' | 'official'>('technical');
  const [audienceKind, setAudienceKind] = useState<PlatformBroadcastAudience['kind']>('all');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('business_pro');
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await platformApi.broadcasts.getPlatformBroadcastSummary();
      if (res.success && res.data) {
        setSummary(res.data);
      }
      setError(null);
    } catch (err: any) {
      setError(err?.message || (isEn ? 'Failed to load broadcasts' : 'Не вдалося завантажити розсилки'));
    } finally {
      setIsLoading(false);
    }
  }, [isEn]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const estimatedRecipients = useMemo(() => {
    if (!summary) return 0;
    const c = summary.audienceCounts;
    if (audienceKind === 'all') return c.allUsers;
    if (audienceKind === 'business_owners') return c.businessOwners;
    if (audienceKind === 'tier') return c.byTier[selectedTier] ?? 0;
    if (audienceKind === 'store_owner') return selectedStoreId ? 1 : 0;
    if (audienceKind === 'user') return selectedUserId ? 1 : 0;
    return 0;
  }, [summary, audienceKind, selectedTier, selectedStoreId, selectedUserId]);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const validation = validateUploadFile(file, UPLOAD_POLICIES.chatAttachment);
    if (!validation.ok) {
      setError(
        validation.code === 'TOO_LARGE'
          ? isEn
            ? 'File must be 10 MB or smaller'
            : 'Розмір файлу не повинен перевищувати 10 МБ'
          : isEn
            ? 'Only JPG, PNG, WebP images and PDF documents are allowed'
            : 'Дозволені лише зображення JPG, PNG, WebP та PDF-документи'
      );
      return;
    }
    setIsUploading(true);
    setError(null);
    try {
      const res = await platformApi.broadcasts.uploadPlatformBroadcastAttachment(file);
      if (res.success && res.data) {
        setAttachmentUrl(res.data.publicUrl);
      }
    } catch (err: any) {
      setError(err?.message || (isEn ? 'Failed to upload file' : 'Помилка завантаження файлу'));
    } finally {
      setIsUploading(false);
    }
  };

  const canSubmit =
    canSend &&
    subject.trim().length >= 3 &&
    body.trim().length >= 5 &&
    estimatedRecipients > 0 &&
    !isSending;

  const handleConfirmSend = async () => {
    setIsSending(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const targetAudience: PlatformBroadcastAudience = {
        kind: audienceKind,
        ...(audienceKind === 'tier' ? { tier: selectedTier } : {}),
        ...(audienceKind === 'store_owner' ? { storeId: selectedStoreId } : {}),
        ...(audienceKind === 'user' ? { userId: selectedUserId } : {})
      };
      const res = await platformApi.broadcasts.sendPlatformBroadcast({
        type: broadcastType,
        targetAudience,
        subject: subject.trim(),
        body: body.trim(),
        attachmentUrl
      });
      if (res.success && res.data) {
        setSuccessMsg(
          isEn
            ? `Broadcast delivered to ${res.data.recipientsCount} recipients.`
            : `Розсилку успішно надіслано ${res.data.recipientsCount} одержувачам.`
        );
        setSubject('');
        setBody('');
        setAttachmentUrl(null);
        setConfirmOpen(false);
        await loadSummary();
      }
    } catch (err: any) {
      setError(err?.message || (isEn ? 'Failed to send broadcast' : 'Помилка відправки розсилки'));
      setConfirmOpen(false);
    } finally {
      setIsSending(false);
    }
  };

  const audienceLabel = (aud: { kind: string; tier?: string }) => {
    switch (aud.kind) {
      case 'all':
        return isEn ? 'All active users' : 'Усі активні користувачі';
      case 'business_owners':
        return isEn ? 'All business owners' : 'Усі власники бізнесів';
      case 'tier':
        return isEn ? `Plan: ${aud.tier}` : `Тариф: ${aud.tier}`;
      case 'store_owner':
        return isEn ? 'Specific business owner' : 'Власник конкретного закладу';
      case 'user':
        return isEn ? 'Specific user' : 'Конкретний користувач';
      default:
        return aud.kind;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-600" />
            {isEn ? 'BizX Official & Technical Broadcasts' : 'Офіційні та технічні розсилки BizX'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEn
              ? 'Send system alerts, maintenance notices, or platform updates directly to BizX Mail.'
              : 'Надсилайте технічні попередження, новини сервісу та важливі повідомлення у Пошту BizX.'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadSummary()}
          disabled={isLoading}
          className="gap-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isEn ? 'Refresh' : 'Оновити'}
        </Button>
      </div>

      {/* Audience overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{isEn ? 'All active users' : 'Усі активні користувачі'}</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {summary?.audienceCounts.allUsers ?? '—'}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{isEn ? 'Business owners' : 'Власники бізнесів'}</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {summary?.audienceCounts.businessOwners ?? '—'}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{isEn ? 'Sent broadcasts' : 'Надіслано розсилок'}</span>
            <Mail className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {summary?.campaigns.length ?? '—'}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Composer + Live Preview */}
      {canSend && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-extrabold text-slate-900">
              {isEn ? 'Compose Broadcast' : 'Нова розсилка BizX'}
            </h2>

            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBroadcastType('technical')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                  broadcastType === 'technical'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Wrench className="w-4 h-4 shrink-0" />
                <span>{isEn ? 'Technical Notice' : 'Технічне сповіщення'}</span>
              </button>
              <button
                type="button"
                onClick={() => setBroadcastType('official')}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-bold transition-all ${
                  broadcastType === 'official'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{isEn ? 'Official Platform News' : 'Офіційні новини'}</span>
              </button>
            </div>

            {/* Target audience */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-700">
                {isEn ? 'Target Audience' : 'Цільова аудиторія'}
              </label>
              <Select
                value={audienceKind}
                onChange={(val) => setAudienceKind(val as PlatformBroadcastAudience['kind'])}
                options={[
                  {
                    value: 'all',
                    label: isEn
                      ? `All active users (${summary?.audienceCounts.allUsers ?? 0})`
                      : `Усі активні користувачі (${summary?.audienceCounts.allUsers ?? 0})`
                  },
                  {
                    value: 'business_owners',
                    label: isEn
                      ? `Business owners (${summary?.audienceCounts.businessOwners ?? 0})`
                      : `Усі власники бізнесів (${summary?.audienceCounts.businessOwners ?? 0})`
                  },
                  {
                    value: 'tier',
                    label: isEn ? 'Users by subscription plan' : 'Користувачі за тарифним планом'
                  },
                  {
                    value: 'store_owner',
                    label: isEn ? 'Specific business owner' : 'Власник конкретного закладу'
                  },
                  {
                    value: 'user',
                    label: isEn ? 'Specific user' : 'Конкретний користувач'
                  }
                ]}
              />

              {audienceKind === 'tier' && (
                <Select
                  value={selectedTier}
                  onChange={(val) => setSelectedTier(val as SubscriptionTier)}
                  options={[
                    { value: 'free', label: `Free (${summary?.audienceCounts.byTier.free ?? 0})` },
                    {
                      value: 'client_premium',
                      label: `BizX Premium (${summary?.audienceCounts.byTier.client_premium ?? 0})`
                    },
                    {
                      value: 'business_starter',
                      label: `Starter (${summary?.audienceCounts.byTier.business_starter ?? 0})`
                    },
                    {
                      value: 'business_pro',
                      label: `Pro (${summary?.audienceCounts.byTier.business_pro ?? 0})`
                    },
                    {
                      value: 'business_enterprise',
                      label: `Enterprise (${summary?.audienceCounts.byTier.business_enterprise ?? 0})`
                    }
                  ]}
                />
              )}

              {audienceKind === 'store_owner' && (
                <Select
                  value={selectedStoreId}
                  onChange={(val) => setSelectedStoreId(val)}
                  placeholder={isEn ? 'Select business...' : 'Оберіть заклад...'}
                  options={businesses.map((b) => ({
                    value: b.id,
                    label: `${b.name} (${b.slug})`
                  }))}
                />
              )}

              {audienceKind === 'user' && (
                <Select
                  value={selectedUserId}
                  onChange={(val) => setSelectedUserId(val)}
                  placeholder={isEn ? 'Select user...' : 'Оберіть користувача...'}
                  options={usersList.map((u) => ({
                    value: u.id,
                    label: `${u.name} (${u.email})`
                  }))}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                {isEn ? 'Subject' : 'Тема листа'}
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                placeholder={
                  isEn
                    ? 'e.g. Scheduled maintenance tonight at 02:00 UTC'
                    : 'Напр.: Планові технічні роботи сьогодні о 02:00'
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                {isEn ? 'Message Body' : 'Текст повідомлення'}
              </label>
              <textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={4000}
                placeholder={
                  isEn
                    ? 'Write clear and helpful information for users...'
                    : 'Опишіть важливу інформацію для користувачів платформи...'
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-y"
              />
            </div>

            {/* Attachment */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>
                    {isUploading
                      ? isEn
                        ? 'Uploading...'
                        : 'Завантаження...'
                      : isEn
                        ? 'Attach image/PDF'
                        : 'Додати фото або PDF'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleUploadFile}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
                {attachmentUrl && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold">
                    <span className="max-w-[160px] truncate">{attachmentUrl.split('/').pop()}</span>
                    <button
                      type="button"
                      onClick={() => setAttachmentUrl(null)}
                      className="text-blue-500 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>

              <Button
                variant="default"
                size="sm"
                disabled={!canSubmit}
                onClick={() => setConfirmOpen(true)}
                className="gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {isEn
                  ? `Send (${estimatedRecipients})`
                  : `Надіслати (${estimatedRecipients})`}
              </Button>
            </div>
          </div>

          {/* Live Inbox Preview */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              {isEn ? 'BizX Mail Preview' : 'Попередній перегляд у Пошті BizX'}
            </div>
            <div className="border border-slate-200 rounded-xl bg-slate-50/70 p-4 space-y-3 flex-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                  B
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-slate-900 truncate">
                      {broadcastType === 'technical'
                        ? isEn
                          ? 'BizX Technical Service'
                          : 'BizX Технічна служба'
                        : isEn
                          ? 'BizX Official News'
                          : 'BizX Офіційні новини'}
                    </span>
                    <Badge variant="default" className="text-[9px] px-1.5 py-0">
                      BizX
                    </Badge>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isEn ? 'Official system message · No reply' : 'Офіційне повідомлення · Без відповіді'}
                  </div>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-xs">
                <div className="text-xs font-extrabold text-slate-900">
                  {subject.trim() || (isEn ? 'Message subject...' : 'Тема повідомлення...')}
                </div>
                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {body.trim() ||
                    (isEn
                      ? 'Your announcement text will appear here.'
                      : 'Тут відображатиметься текст вашої розсилки у Пошті користувачів.')}
                </p>
                {attachmentUrl && !attachmentUrl.toLowerCase().endsWith('.pdf') && (
                  <img
                    src={platformApi.storage.resolveMediaUrl(attachmentUrl) || undefined}
                    alt="Attachment preview"
                    className="rounded-lg max-h-40 w-full object-cover border border-slate-100 mt-2"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
            {isEn ? 'Broadcast History' : 'Історія розсилок платформи'}
          </h3>
          <span className="text-[11px] font-semibold text-slate-400">
            {summary?.campaigns.length ?? 0}
          </span>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {isEn ? 'Loading history...' : 'Завантаження історії...'}
          </div>
        ) : !summary || summary.campaigns.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {isEn ? 'No broadcasts sent yet.' : 'Платформних розсилок ще не було.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {summary.campaigns.map((c) => (
              <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.type === 'technical'
                          ? 'bg-slate-900 text-white'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {c.type === 'technical'
                        ? isEn
                          ? 'Technical'
                          : 'Технічна'
                        : isEn
                          ? 'Official'
                          : 'Офіційна'}
                    </span>
                    <span className="text-xs font-extrabold text-slate-900">{c.subject}</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 whitespace-pre-wrap">{c.body}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                    <span>{audienceLabel(c.targetAudience)}</span>
                    <span>•</span>
                    <span>
                      {isEn ? 'Author' : 'Автор'}: {c.createdByName || c.createdByEmail || 'BizX'}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(c.createdAt).toLocaleString(isEn ? 'en-US' : 'uk-UA')}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-extrabold border border-emerald-200">
                    <Users className="w-3.5 h-3.5" />
                    {c.recipientsCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => !isSending && setConfirmOpen(false)}
        onConfirm={() => void handleConfirmSend()}
        isLoading={isSending}
        confirmVariant="primary"
        title={isEn ? 'Confirm Broadcast Delivery' : 'Підтвердити надсилання розсилки'}
        confirmLabel={isEn ? 'Send now' : 'Надіслати зараз'}
        cancelLabel={isEn ? 'Cancel' : 'Скасувати'}
      >
        <p className="text-xs text-slate-600 leading-relaxed">
          {isEn
            ? `This message will be delivered immediately to ${estimatedRecipients} BizX user(s). This action cannot be undone.`
            : `Повідомлення «${subject.trim()}» буде негайно доставлено ${estimatedRecipients} одержувачам у Пошту BizX. Дію неможливо скасувати.`}
        </p>
      </ConfirmModal>
    </div>
  );
};
