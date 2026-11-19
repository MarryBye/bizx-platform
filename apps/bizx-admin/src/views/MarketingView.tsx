import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { resolveMediaUrl } from '../lib/media';
import { useBusinessStore } from '../store/useBusinessStore';
import { useTranslation } from '../hooks/useTranslation';
import type { StoreBroadcastSummary, Product } from '@bizx/common-types';
import { Button, Select, ConfirmModal, Badge } from '@bizx/ui';
import {
  Megaphone,
  Users,
  Zap,
  Send,
  Paperclip,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Tag,
  Sparkles,
  Lock
} from 'lucide-react';

interface MarketingViewProps {
  canSend: boolean;
}

export const MarketingView: React.FC<MarketingViewProps> = ({ canSend }) => {
  const { locale } = useTranslation();
  const isEn = locale === 'en';
  const { activeStore, activeStoreId } = useBusinessStore();

  const [summary, setSummary] = useState<StoreBroadcastSummary | null>(null);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTogglingAuto, setIsTogglingAuto] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [relatedProductId, setRelatedProductId] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeStoreId) return;
    setIsLoading(true);
    try {
      const [sumRes, prodRes] = await Promise.all([
        api.broadcasts.getStoreBroadcastSummary(activeStoreId),
        api.products.getStoreProducts(activeStoreId, { page: 1, pageSize: 100, isActive: true }).catch(() => null)
      ]);
      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      }
      if (prodRes?.success && prodRes.data?.items) {
        setProductsList(prodRes.data.items);
      }
      setError(null);
    } catch (err: any) {
      setError(
        err?.message || (isEn ? 'Failed to load marketing data' : 'Не вдалося завантажити дані розсилок')
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeStoreId, isEn]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleToggleAutoDiscount = async () => {
    if (!activeStoreId || !summary || !canSend || isTogglingAuto) return;
    setIsTogglingAuto(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const nextValue = !summary.autoDiscountBroadcastEnabled;
      const res = await api.broadcasts.updateStoreBroadcastSettings(activeStoreId, {
        autoDiscountBroadcastEnabled: nextValue
      });
      if (res.success && res.data) {
        setSummary((prev) =>
          prev
            ? { ...prev, autoDiscountBroadcastEnabled: res.data.autoDiscountBroadcastEnabled }
            : prev
        );
        setSuccessMsg(
          nextValue
            ? isEn
              ? 'Automatic discount alerts enabled.'
              : 'Автоматичні сповіщення про знижки увімкнено.'
            : isEn
              ? 'Automatic discount alerts disabled.'
              : 'Автоматичні сповіщення про знижки вимкнено.'
        );
      }
    } catch (err: any) {
      setError(err?.message || (isEn ? 'Failed to update setting' : 'Помилка збереження налаштування'));
    } finally {
      setIsTogglingAuto(false);
    }
  };

  const handleProductPick = (prodId: string) => {
    setRelatedProductId(prodId);
    const found = productsList.find((p) => p.id === prodId);
    if (!found) return;
    if (!subject.trim()) {
      if (found.oldPrice && found.oldPrice > found.price) {
        const pct = Math.round(((found.oldPrice - found.price) / found.oldPrice) * 100);
        setSubject(
          isEn
            ? `-${pct}% off «${found.name}»!`
            : `Знижка -${pct}% на «${found.name}»!`
        );
      } else {
        setSubject(isEn ? `Special offer: «${found.name}»` : `Спеціальна пропозиція: «${found.name}»`);
      }
    }
    if (!attachmentUrl && found.imageUrl) {
      setAttachmentUrl(found.imageUrl);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeStoreId) return;
    setIsUploading(true);
    setError(null);
    try {
      const res = await api.broadcasts.uploadStoreBroadcastImage(activeStoreId, file);
      if (res.success && res.data) {
        setAttachmentUrl(res.data.publicUrl);
      }
    } catch (err: any) {
      setError(err?.message || (isEn ? 'Upload failed' : 'Помилка завантаження зображення'));
    } finally {
      setIsUploading(false);
    }
  };

  const isStoreActive = summary?.storeStatus === 'active';
  const hasQuota = (summary?.remainingToday ?? 0) > 0;
  const hasSubscribers = (summary?.subscribersCount ?? 0) > 0;

  const canSubmit =
    canSend &&
    isStoreActive &&
    hasQuota &&
    hasSubscribers &&
    subject.trim().length >= 3 &&
    body.trim().length >= 5 &&
    !isSending;

  const handleConfirmSend = async () => {
    if (!activeStoreId) return;
    setIsSending(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.broadcasts.sendStoreBroadcast(activeStoreId, {
        subject: subject.trim(),
        body: body.trim(),
        attachmentUrl,
        relatedProductId: relatedProductId || null
      });
      if (res.success && res.data) {
        setSuccessMsg(
          isEn
            ? `Campaign sent to ${res.data.recipientsCount} subscriber(s)!`
            : `Акційну розсилку надіслано ${res.data.recipientsCount} підписникам!`
        );
        setSubject('');
        setBody('');
        setRelatedProductId('');
        setAttachmentUrl(null);
        setConfirmOpen(false);
        await loadData();
      }
    } catch (err: any) {
      setError(err?.message || (isEn ? 'Failed to send broadcast' : 'Помилка надсилання розсилки'));
      setConfirmOpen(false);
    } finally {
      setIsSending(false);
    }
  };

  const tierLabel = (tier?: string) => {
    if (tier === 'business_starter') return 'Starter';
    if (tier === 'business_pro') return 'Pro';
    if (tier === 'business_enterprise') return 'Enterprise';
    return 'Free';
  };

  const quotaPercent =
    summary && summary.dailyLimit > 0
      ? Math.min(100, Math.round((summary.usedToday / summary.dailyLimit) * 100))
      : 0;

  if (!activeStoreId) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-600" />
            {isEn ? 'Marketing & Promo Broadcasts' : 'Маркетинг і розсилки закладу'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEn
              ? 'Send promos to opted-in customers & automate discount alerts in BizX Mail.'
              : 'Надсилайте акції підписникам вашого закладу та автоматизуйте сповіщення про знижки.'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadData()}
          disabled={isLoading}
          className="gap-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isEn ? 'Refresh' : 'Оновити'}
        </Button>
      </div>

      {/* 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Subscribers Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{isEn ? 'Active Subscribers' : 'Підписники закладу'}</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {summary?.subscribersCount ?? '—'}
          </div>
          {summary && (
            <div className="text-[11px] text-slate-500">
              {isEn
                ? `Checkout opt-in: ${summary.checkoutSubscribersCount} · Storefront: ${summary.storefrontSubscribersCount}`
                : `Із замовлень: ${summary.checkoutSubscribersCount} · З вітрини: ${summary.storefrontSubscribersCount}`}
            </div>
          )}
        </div>

        {/* Daily Quota Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>
              {isEn ? 'Daily Limit' : 'Денний ліміт'} ({tierLabel(summary?.ownerTier)})
            </span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">
              {summary ? `${summary.usedToday} / ${summary.dailyLimit}` : '—'}
            </span>
            <span className="text-[11px] font-bold text-emerald-700">
              {summary
                ? isEn
                  ? `${summary.remainingToday} left today`
                  : `Залишилось: ${summary.remainingToday}`
                : ''}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                quotaPercent >= 100 ? 'bg-rose-500' : 'bg-blue-600'
              }`}
              style={{ width: `${quotaPercent}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400">
            {isEn ? 'Resets daily at 00:00 UTC · Shared with auto-discounts' : 'Оновлення о 00:00 UTC · Спільний з авто-знижками'}
          </div>
        </div>

        {/* Auto-Discount Toggle Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                {isEn ? 'Auto-Discount Alerts' : 'Авто-сповіщення про знижки'}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                {isEn
                  ? 'Automatically notifies subscribers when a product gets ≥5% off (24h cooldown per product).'
                  : 'Автоматично надсилає акцію підписникам при знижці ≥5% на товар (cooldown 24 год).'}
              </p>
            </div>
            <button
              type="button"
              disabled={!canSend || isTogglingAuto || !summary}
              onClick={() => void handleToggleAutoDiscount()}
              aria-label="Toggle auto discount broadcasts"
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                summary?.autoDiscountBroadcastEnabled ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  summary?.autoDiscountBroadcastEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="text-[10px] font-bold">
            {summary?.autoDiscountBroadcastEnabled ? (
              <span className="text-emerald-700">
                {isEn ? 'Active · Monitoring catalog discounts' : 'Увімкнено · Відстежує знижки в каталозі'}
              </span>
            ) : (
              <span className="text-slate-400">
                {isEn ? 'Disabled · Manual promos only' : 'Вимкнено · Лише ручні розсилки'}
              </span>
            )}
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

      {/* Composer + Preview */}
      {canSend ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-slate-900">
                {isEn ? 'Create Promotional Campaign' : 'Створити акційну розсилку'}
              </h2>
              {!isStoreActive && (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  {isEn ? 'Store must be active' : 'Потрібен активний заклад'}
                </span>
              )}
            </div>

            {summary && summary.subscribersCount === 0 && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                {isEn
                  ? 'No active subscribers yet. Customers can subscribe on your store page or opt in during their first order.'
                  : 'У закладу ще немає підписників. Покупці можуть підписатися на сторінці вашої вітрини або поставити галочку при першому замовленні.'}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                {isEn ? 'Link catalog product (optional)' : 'Прив’язати товар із каталогу (необов’язково)'}
              </label>
              <Select
                value={relatedProductId}
                onChange={handleProductPick}
                placeholder={isEn ? 'None — general store promotion' : 'Без прив’язки — загальна акція закладу'}
                options={[
                  {
                    value: '',
                    label: isEn ? 'None — general store promotion' : 'Без прив’язки — загальна акція закладу'
                  },
                  ...productsList.map((p) => ({
                    value: p.id,
                    label: `${p.name} (${(p.price / 100).toFixed(0)} ₴${
                      p.oldPrice && p.oldPrice > p.price
                        ? ` · -${Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)}%`
                        : ''
                    })`
                  }))
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                {isEn ? 'Headline' : 'Заголовок акції'}
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                placeholder={
                  isEn
                    ? 'e.g. -20% on all autumn pastries this weekend!'
                    : 'Напр.: -20% на всю осінню випічку до кінця тижня!'
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                {isEn ? 'Message Text' : 'Текст акційної пропозиції'}
              </label>
              <textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={4000}
                placeholder={
                  isEn
                    ? 'Describe your offer, terms, or discount duration...'
                    : 'Розкажіть про акцію, умови або термін дії спецпропозиції...'
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 resize-y"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>
                    {isUploading
                      ? isEn
                        ? 'Uploading...'
                        : 'Завантаження...'
                      : isEn
                        ? 'Upload promo banner'
                        : 'Завантажити фото акції'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadImage}
                    disabled={isUploading}
                    className="hidden"
                  />
                </label>
                {attachmentUrl && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold">
                    <span className="max-w-[140px] truncate">{attachmentUrl.split('/').pop()}</span>
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
                  ? `Send to ${summary?.subscribersCount ?? 0}`
                  : `Надіслати (${summary?.subscribersCount ?? 0})`}
              </Button>
            </div>
          </div>

          {/* Live Client Inbox Preview */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              {isEn ? 'Customer Inbox Preview' : 'Як лист виглядатиме у Пошті клієнта'}
            </div>
            <div className="border border-slate-200 rounded-xl bg-slate-50/70 p-4 space-y-3 flex-1">
              <div className="flex items-center gap-2.5">
                {activeStore?.logoUrl ? (
                  <img
                    src={resolveMediaUrl(activeStore.logoUrl) || ''}
                    alt={activeStore.name}
                    className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-amber-500 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                    {(activeStore?.name || 'B').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-slate-900 truncate">
                      {activeStore?.name || 'BizX Store'}
                    </span>
                    <Badge variant="warning" className="text-[9px] px-1.5 py-0">
                      {isEn ? 'PROMO' : 'АКЦІЯ'}
                    </Badge>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isEn ? 'Promotional offer · 1-click unsubscribe' : 'Акційна розсилка · Відписка в 1 клік'}
                  </div>
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 shadow-xs">
                <div className="text-xs font-extrabold text-slate-900">
                  {subject.trim() || (isEn ? 'Promo headline...' : 'Заголовок акції...')}
                </div>
                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {body.trim() ||
                    (isEn
                      ? 'Promo text will appear here.'
                      : 'Тут відображатиметься текст вашої акційної пропозиції.')}
                </p>
                {attachmentUrl && (
                  <img
                    src={resolveMediaUrl(attachmentUrl) || ''}
                    alt="Promo banner"
                    className="rounded-lg max-h-40 w-full object-cover border border-slate-100 mt-2"
                  />
                )}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>{isEn ? 'Only sent to opted-in users' : 'Надсилається лише за згодою'}</span>
                  <span className="underline">{isEn ? 'Unsubscribe' : 'Відписатися'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0" />
          <span>
            {isEn
              ? 'Read-only mode: you do not have permission to send promo broadcasts or the store is currently locked.'
              : 'Режим перегляду: у вас немає права на відправку розсилок або заклад тимчасово обмежено.'}
          </span>
        </div>
      )}

      {/* Campaign History */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
            {isEn ? 'Campaign History' : 'Історія розсилок та авто-знижок'}
          </h3>
          <span className="text-[11px] font-semibold text-slate-400">
            {summary?.campaigns.length ?? 0}
          </span>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {isEn ? 'Loading...' : 'Завантаження...'}
          </div>
        ) : !summary || summary.campaigns.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {isEn ? 'No campaigns sent yet.' : 'Розсилок ще не було.'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {summary.campaigns.map((c) => (
              <div key={c.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.type === 'auto_discount'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {c.type === 'auto_discount'
                        ? isEn
                          ? 'AUTO-DISCOUNT'
                          : 'АВТО-ЗНИЖКА'
                        : isEn
                          ? 'PROMO'
                          : 'АКЦІЯ'}
                    </span>
                    <span className="text-xs font-extrabold text-slate-900">{c.subject}</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 whitespace-pre-wrap">{c.body}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                    {c.relatedProductName && (
                      <span className="inline-flex items-center gap-1 text-slate-600 font-semibold">
                        <Tag className="w-3 h-3" />
                        {c.relatedProductName}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(c.createdAt).toLocaleString(isEn ? 'en-US' : 'uk-UA')}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
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
        title={isEn ? 'Confirm Promo Broadcast' : 'Підтвердити акційну розсилку'}
        confirmLabel={isEn ? 'Send campaign' : 'Надіслати акцію'}
        cancelLabel={isEn ? 'Cancel' : 'Скасувати'}
      >
        <p className="text-xs text-slate-600 leading-relaxed">
          {isEn
            ? `Send «${subject.trim()}» to ${summary?.subscribersCount ?? 0} active subscriber(s)? This will use 1 of your ${summary?.dailyLimit ?? 0} daily broadcast credits.`
            : `Надіслати «${subject.trim()}» ${summary?.subscribersCount ?? 0} активним підписникам? Буде використано 1 із ${summary?.dailyLimit ?? 0} денних розсилок вашого тарифу.`}
        </p>
      </ConfirmModal>
    </div>
  );
};
