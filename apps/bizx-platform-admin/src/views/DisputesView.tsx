import React, { useState, useEffect, useCallback } from 'react';
import { platformApi } from '../lib/api';
import { useTranslation } from '../hooks/useTranslation';
import type { PlatformDisputeDetail } from '@bizx/api-client';
import type {
  PlatformDisputeListItem,
  OrderMessageAttachmentDto
} from '@bizx/common-types';
import {
  OrderChatBox,
  Modal,
  ConfirmModal,
  DurationPicker,
  StatusBadge,
  AlertBanner,
  Button
} from '@bizx/ui';
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  ShieldAlert,
  Eye,
  Zap,
  RotateCcw,
  RefreshCw,
  Building2,
  User as UserIcon,
  Loader2,
  Lock
} from 'lucide-react';

interface DisputesViewProps {
  canResolve: boolean;
  canRevokeStrikes: boolean;
  onDisputesChanged?: () => void;
}

export const DisputesView: React.FC<DisputesViewProps> = ({
  canResolve,
  canRevokeStrikes,
  onDisputesChanged
}) => {
  const { t, locale } = useTranslation();

  const [filter, setFilter] = useState<'escalated' | 'open' | 'resolved' | 'all'>('escalated');
  const [disputes, setDisputes] = useState<PlatformDisputeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PlatformDisputeDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Resolution state
  const [resolutionNote, setResolutionNote] = useState('');
  const [issueStrike, setIssueStrike] = useState(true);
  const [strikeReason, setStrikeReason] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; isError?: boolean } | null>(null);

  // Confirmation Modals (shown BEFORE sending API request for BOTH decisions!)
  const [confirmDecision, setConfirmDecision] = useState<'business' | 'customer' | null>(null);
  const [showThirdStrikeModal, setShowThirdStrikeModal] = useState(false);
  const [selectedSuspensionDays, setSelectedSuspensionDays] = useState<number | null>(7);

  // Strike Revoke inline modal
  const [revokingStrikeId, setRevokingStrikeId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);

  const loadDisputes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await platformApi.orders.getPlatformDisputes(filter === 'all' ? undefined : filter);
      if (res.success && res.data) {
        setDisputes(res.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadDisputes();
  }, [loadDisputes]);

  const loadDetail = useCallback(async (disputeId: string) => {
    try {
      const res = await platformApi.orders.getPlatformDisputeDetail(disputeId);
      if (res.success && res.data) {
        setDetail(res.data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setResolutionNote('');
      setStrikeReason('');
      setIssueStrike(true);
      setNotice(null);
      setShowThirdStrikeModal(false);
      return;
    }

    setIsLoadingDetail(true);
    void loadDetail(selectedId).finally(() => setIsLoadingDetail(false));

    const timer = window.setInterval(() => {
      void loadDetail(selectedId);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [selectedId, loadDetail]);

  const formatMoney = (kopecks: number) =>
    (kopecks / 100).toLocaleString(locale === 'en' ? 'en-US' : 'uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const executeResolution = async (
    decision: 'business' | 'customer',
    suspensionDays?: number | null
  ) => {
    if (!detail) return;
    if (resolutionNote.trim().length < 3) {
      setNotice({
        text:
          locale === 'en'
            ? 'Please enter a resolution explanation (at least 3 characters).'
            : 'Вкажіть обґрунтування рішення (мінімум 3 символи).',
        isError: true
      });
      return;
    }

    setIsResolving(true);
    setNotice(null);
    try {
      const res = await platformApi.orders.resolvePlatformDispute(detail.dispute.id, {
        decision,
        resolutionNote: resolutionNote.trim(),
        issueStrike: decision === 'customer' ? issueStrike : false,
        strikeReason: decision === 'customer' && issueStrike ? strikeReason.trim() || undefined : undefined,
        suspensionDays:
          decision === 'customer' && issueStrike ? suspensionDays : undefined
      });
      if (res.success && res.data) {
        setShowThirdStrikeModal(false);
        setConfirmDecision(null);
        await Promise.all([loadDetail(detail.dispute.id), loadDisputes()]);
        onDisputesChanged?.();
        setNotice({
          text: res.data.storeSuspended
            ? locale === 'en'
              ? 'Resolved in favor of customer. 3rd strike issued — store has been suspended.'
              : 'Вирішено на користь клієнта. Видано 3-й страйк — роботу закладу призупинено.'
            : decision === 'customer'
              ? locale === 'en'
                ? 'Resolved in favor of customer. Refund processed.'
                : 'Скаргу вирішено на користь клієнта, повернення оформлено.'
              : locale === 'en'
                ? 'Resolved in favor of business. Dispute closed.'
                : 'Скаргу закрито на користь бізнесу.'
        });
      }
    } catch (err: any) {
      setNotice({
        text: err?.data?.message || err?.message || 'Не вдалося винести рішення',
        isError: true
      });
    } finally {
      setIsResolving(false);
    }
  };

  const handleClickDecision = (decision: 'business' | 'customer') => {
    if (!detail) return;
    if (resolutionNote.trim().length < 3) {
      setNotice({
        text:
          locale === 'en'
            ? 'Please enter a resolution explanation first (min 3 characters).'
            : 'Спочатку вкажіть обґрунтування рішення (мінімум 3 символи).',
        isError: true
      });
      return;
    }

    // ЯКЩО на користь клієнта + видається страйк і у закладу вже >= 2 активних страйків → модалка 3-го страйку!
    if (decision === 'customer' && issueStrike && detail.dispute.storeActiveStrikes >= 2) {
      setSelectedSuspensionDays(7);
      setShowThirdStrikeModal(true);
      return;
    }

    // В усіх інших випадках (і для бізнесу, і для клієнта) — обовʼязкова модалка підтвердження!
    setConfirmDecision(decision);
  };

  const handleRevokeStrike = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokingStrikeId || !detail || revokeReason.trim().length < 3) return;
    setIsRevoking(true);
    setNotice(null);
    try {
      const res = await platformApi.orders.revokeStrike(revokingStrikeId, {
        revokeReason: revokeReason.trim(),
        liftSuspension: true
      });
      if (res.success) {
        setRevokingStrikeId(null);
        setRevokeReason('');
        await Promise.all([loadDetail(detail.dispute.id), loadDisputes()]);
        onDisputesChanged?.();
        setNotice({
          text: res.data?.storeSuspensionLifted
            ? locale === 'en'
              ? 'Strike revoked and store suspension lifted.'
              : 'Страйк знято, блокування закладу достроково скасовано.'
            : locale === 'en'
              ? 'Strike revoked.'
              : 'Страйк успішно знято.'
        });
      }
    } catch (err: any) {
      setNotice({
        text: err?.data?.message || err?.message || 'Не вдалося зняти страйк',
        isError: true
      });
    } finally {
      setIsRevoking(false);
    }
  };

  const handleSendPlatformMessage = async (dto: {
    body?: string;
    attachments?: OrderMessageAttachmentDto[];
  }) => {
    if (!detail) return;
    const res = await platformApi.orders.sendMessage(detail.order.id, dto);
    if (res.success && res.data) {
      setDetail((prev) => (prev ? { ...prev, messages: [...prev.messages, res.data] } : prev));
    }
  };

  const handleUploadAttachment = async (file: File) => {
    if (!detail) throw new Error('No dispute');
    const res = await platformApi.orders.uploadChatAttachment(detail.order.id, file);
    if (!res.success || !res.data) throw new Error('Upload failed');
    return res.data;
  };

  const getDisputeBadge = (status: string) => {
    const label = t(`disputes.statuses.${status}`);
    if (status === 'escalated_platform') {
      return (
        <StatusBadge tone="rose" size="xs" icon={<AlertTriangle className="w-3 h-3" />}>
          {label}
        </StatusBadge>
      );
    }
    if (status === 'open_store') {
      return (
        <StatusBadge tone="amber" size="xs" dot>
          {label}
        </StatusBadge>
      );
    }
    return (
      <StatusBadge tone="slate" size="xs">
        {label}
      </StatusBadge>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Scale className="w-6 h-6 text-slate-800" />
            <span>{locale === 'en' ? 'Disputes & Arbitration' : 'Скарги та арбітраж BizX'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {locale === 'en'
              ? 'Review escalated customer complaints, chat transcripts, issue refunds from escrow, and manage store strikes.'
              : 'Розгляд переданих скарг клієнтів, перевірка листування, повернення коштів з резерву та система страйків закладів.'}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadDisputes()}
          disabled={isLoading}
          className="self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{t('common.refresh')}</span>
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="inline-flex p-1 bg-slate-200/70 rounded-xl text-xs font-bold flex-wrap gap-1">
        {(
          [
            { id: 'escalated', uk: 'Очікують BizX', en: 'Awaiting BizX' },
            { id: 'open', uk: 'Усі відкриті', en: 'All open' },
            { id: 'resolved', uk: 'Закриті', en: 'Resolved' },
            { id: 'all', uk: 'Усі', en: 'All' }
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              filter === tab.id
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {locale === 'en' ? tab.en : tab.uk}
          </button>
        ))}
      </div>

      {/* Disputes List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading && disputes.length === 0 ? (
          <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t('common.loading')}</span>
          </div>
        ) : disputes.length === 0 ? (
          <div className="py-14 text-center space-y-1.5">
            <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              {locale === 'en' ? 'No disputes in this queue' : 'Скарг у цій черзі немає'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {disputes.map((d) => (
              <div
                key={d.id}
                className={`px-4 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                  d.status === 'escalated_platform'
                    ? 'bg-red-50/45 hover:bg-red-50/80 border-l-4 border-l-red-600'
                    : 'hover:bg-slate-50/80'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-slate-900">
                      {d.orderNumber}
                    </span>
                    {getDisputeBadge(d.status)}
                    <StatusBadge tone="slate" size="xs" className="rounded">
                      {t(`disputes.categories.${d.category}`)}
                    </StatusBadge>
                    <StatusBadge
                      tone={d.storeActiveStrikes >= 2 ? 'rose' : 'slate'}
                      size="xs"
                      icon={<Zap className="w-3 h-3" />}
                    >
                      {d.storeActiveStrikes}/3
                    </StatusBadge>
                  </div>
                  <p className="text-xs text-slate-700 line-clamp-1">{d.description}</p>
                  <div className="flex items-center gap-2.5 text-[11px] text-slate-500 flex-wrap">
                    <span className="font-bold text-slate-700">{d.storeName}</span>
                    <span>•</span>
                    <span>{d.customerName}</span>
                    <span>•</span>
                    <span className="font-bold text-slate-800">
                      {formatMoney(d.orderTotalAmount)} ₴
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {d.messagesCount}
                    </span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedId(d.id)}
                  className="shrink-0 self-start md:self-center"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{locale === 'en' ? 'Inspect Case' : 'Розглянути'}</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Arbitration Detail Modal — Unified Light Header */}
      <Modal
        isOpen={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        size="4xl"
        tone={detail?.dispute.status === 'escalated_platform' ? 'danger' : 'default'}
        icon={<Scale className="w-4 h-4" />}
        title={`${locale === 'en' ? 'Case' : 'Скарга'} ${detail?.dispute.orderNumber || ''}`}
        badge={detail ? getDisputeBadge(detail.dispute.status) : undefined}
        subtitle={
          detail
            ? `${t(`disputes.categories.${detail.dispute.category}`)} • ${new Date(
                detail.dispute.createdAt
              ).toLocaleString(locale === 'en' ? 'en-US' : 'uk-UA')}`
            : undefined
        }
      >
        {isLoadingDetail || !detail ? (
          <div className="py-16 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{t('common.loading')}</span>
          </div>
        ) : (
          <div className="space-y-5">
            {notice && (
              <AlertBanner tone={notice.isError ? 'danger' : 'success'}>
                {notice.text}
              </AlertBanner>
            )}

                {/* Parties & Order Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{locale === 'en' ? 'Business' : 'Заклад'}</span>
                    </div>
                    <p className="font-bold text-slate-900">{detail.dispute.storeName}</p>
                    <p className="text-[11px] text-slate-600">
                      {t('common.status')}:{' '}
                      <strong className="uppercase">{detail.dispute.storeStatus}</strong>
                    </p>
                    <p
                      className={`text-[11px] font-bold ${
                        detail.dispute.storeActiveStrikes >= 2 ? 'text-rose-700' : 'text-slate-700'
                      }`}
                    >
                      {locale === 'en' ? 'Active strikes:' : 'Активні страйки:'}{' '}
                      {detail.dispute.storeActiveStrikes} / 3
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>{locale === 'en' ? 'Customer' : 'Клієнт'}</span>
                    </div>
                    <p className="font-bold text-slate-900">{detail.dispute.customerName}</p>
                    {detail.dispute.customerEmail && (
                      <p className="text-[11px] font-mono text-slate-600 truncate">
                        {detail.dispute.customerEmail}
                      </p>
                    )}
                    {detail.dispute.customerPhone && (
                      <p className="text-[11px] font-mono text-slate-600">
                        {detail.dispute.customerPhone}
                      </p>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="text-[10px] font-bold uppercase text-slate-400">
                      {locale === 'en' ? 'Order & Escrow' : 'Замовлення та утримання'}
                    </div>
                    <p className="font-black text-base text-slate-900">
                      {formatMoney(detail.order.totalAmount)} ₴
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {t('common.status')}: <strong>{t(`statuses.order.${detail.order.status}`)}</strong>
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {locale === 'en' ? 'Funds:' : 'Кошти:'}{' '}
                      <strong className="text-slate-900">
                        {detail.order.payoutStatus === 'held'
                          ? locale === 'en'
                            ? 'Held in escrow'
                            : 'В резерві (Escrow)'
                          : detail.order.payoutStatus === 'released'
                            ? locale === 'en'
                              ? 'Released (clawback on refund)'
                              : 'Виплачено (буде утримання)'
                            : detail.order.payoutStatus === 'clawback'
                              ? locale === 'en'
                                ? 'Deducted from business payout'
                                : 'Утримано з виплат бізнесу'
                              : locale === 'en'
                                ? 'Refunded'
                                : 'Повернено клієнту'}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Complaint Description */}
                <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 space-y-1.5 text-xs">
                  <div className="font-black text-red-900">
                    {locale === 'en' ? 'Customer Complaint:' : 'Суть скарги клієнта:'}
                  </div>
                  <p className="text-red-950 leading-relaxed">{detail.dispute.description}</p>
                  {detail.dispute.escalationReason && (
                    <p className="text-[11px] text-red-800 pt-1 border-t border-red-200/70">
                      <strong>
                        {locale === 'en' ? 'Escalation note:' : 'Причина передачі в BizX:'}
                      </strong>{' '}
                      {detail.dispute.escalationReason}
                    </p>
                  )}
                </div>

                {/* Order Items */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                  <div className="font-bold text-slate-700 uppercase text-[10px]">
                    {t('orders.items')}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(detail.order.items || []).map((item) => (
                      <div key={item.id} className="py-1.5 flex items-center justify-between gap-2">
                        <span className="text-slate-800 font-medium">
                          {item.productName} × {item.quantity}
                        </span>
                        <span className="font-bold text-slate-900">
                          {formatMoney(item.totalPrice)} ₴
                        </span>
                      </div>
                    ))}
                  </div>
                  {detail.order.notes && (
                    <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <strong>{t('orders.notes')}:</strong> {detail.order.notes}
                    </p>
                  )}
                </div>

                {/* Full Order Chat Transcript */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-slate-600" />
                    <span>
                      {locale === 'en'
                        ? 'Full Customer ↔ Store Chat History'
                        : 'Повна історія переписки Клієнт ↔ Заклад'}
                    </span>
                  </h3>
                  <OrderChatBox
                    messages={detail.messages}
                    viewerRole="platform"
                    canSend={
                      canResolve &&
                      ['escalated_platform', 'open_store'].includes(detail.dispute.status)
                    }
                    locale={locale}
                    resolveMediaUrl={(u) => platformApi.storage.resolveMediaUrl(u) || u}
                    onSendMessage={handleSendPlatformMessage}
                    onUploadAttachment={canResolve ? handleUploadAttachment : undefined}
                  />
                </div>

                {/* Verdict Controls */}
                {['escalated_platform', 'open_store'].includes(detail.dispute.status) ? (
                  canResolve ? (
                    <div className="p-4 rounded-xl border-2 border-slate-900/15 bg-slate-50 space-y-3.5">
                      <div className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        {locale === 'en' ? 'Arbitration Decision' : 'Винесення рішення BizX'}
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700">
                          {locale === 'en'
                            ? 'Decision explanation (visible in case log) *'
                            : 'Обґрунтування рішення (побачать сторони) *'}
                        </label>
                        <textarea
                          rows={2}
                          value={resolutionNote}
                          onChange={(e) => setResolutionNote(e.target.value)}
                          placeholder={
                            locale === 'en'
                              ? 'Summarize the evidence from chat and the final decision...'
                              : 'Опишіть підстави рішення на основі переписки та доказів...'
                          }
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                        />
                      </div>

                      {/* Strike option when deciding for customer */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={issueStrike}
                            onChange={(e) => setIssueStrike(e.target.checked)}
                            className="rounded border-slate-300"
                          />
                          <span>
                            {locale === 'en'
                              ? `Issue a strike to the store if resolved for customer (currently ${detail.dispute.storeActiveStrikes}/3)`
                              : `Видати страйк закладу при рішенні на користь клієнта (зараз ${detail.dispute.storeActiveStrikes}/3)`}
                          </span>
                        </label>
                        {issueStrike && (
                          <input
                            type="text"
                            value={strikeReason}
                            onChange={(e) => setStrikeReason(e.target.value)}
                            placeholder={
                              locale === 'en'
                                ? 'Strike reason (optional, defaults to decision explanation)'
                                : 'Причина страйку (необов’язково — за замовчуванням текст рішення)'
                            }
                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-900"
                          />
                        )}
                        {issueStrike && detail.dispute.storeActiveStrikes >= 2 && (
                          <div className="text-[11px] font-bold text-rose-700 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {locale === 'en'
                                ? 'Next strike reaches 3/3 — you will choose suspension duration before submitting.'
                                : 'Цей страйк стане 3-м — перед відправкою відкриється вікно вибору терміну блокування.'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/80">
                        <Button
                          variant="neutral"
                          size="lg"
                          disabled={isResolving}
                          onClick={() => handleClickDecision('business')}
                        >
                          <Building2 className="w-4 h-4 shrink-0" />
                          <span>
                            {locale === 'en'
                              ? 'Resolve for Business'
                              : 'Закрити на користь бізнесу'}
                          </span>
                        </Button>

                        <Button
                          variant="neutral"
                          size="lg"
                          disabled={isResolving}
                          onClick={() => handleClickDecision('customer')}
                        >
                          <UserIcon className="w-4 h-4 shrink-0" />
                          <span>
                            {locale === 'en'
                              ? 'Resolve for Customer (Refund)'
                              : 'На користь клієнта (Повернення)'}
                          </span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>
                        {locale === 'en'
                          ? 'Read-only access: you do not hold permission to issue dispute verdicts.'
                          : 'Режим перегляду: у вас немає права виносити рішення по скаргах.'}
                      </span>
                    </div>
                  )
                ) : (
                  detail.dispute.resolutionNote && (
                    <AlertBanner
                      tone="success"
                      title={locale === 'en' ? 'Final Resolution' : 'Підсумок розгляду'}
                    >
                      {detail.dispute.resolutionNote}
                    </AlertBanner>
                  )
                )}

                {/* Store Strike History & Revocation */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>
                        {locale === 'en'
                          ? `Store Strike History (${detail.dispute.storeActiveStrikes}/3 active)`
                          : `Історія страйків закладу (${detail.dispute.storeActiveStrikes}/3 активних)`}
                      </span>
                    </h4>
                  </div>

                  {detail.storeStrikes.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      {locale === 'en' ? 'No strikes recorded.' : 'Страйків ще не видавалось.'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {detail.storeStrikes.map((st) => (
                        <div
                          key={st.id}
                          className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            st.isActive
                              ? 'bg-rose-50/50 border-rose-200'
                              : 'bg-slate-50 border-slate-200 opacity-75'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <StatusBadge tone={st.isActive ? 'rose' : 'slate'} size="xs">
                                {st.isActive
                                  ? locale === 'en'
                                    ? 'Active'
                                    : 'Активний'
                                  : locale === 'en'
                                    ? 'Revoked / Expired'
                                    : 'Знято / Завершено'}
                              </StatusBadge>
                              <span className="text-[11px] text-slate-500">
                                {new Date(st.createdAt).toLocaleDateString(
                                  locale === 'en' ? 'en-US' : 'uk-UA'
                                )}
                              </span>
                              {st.issuedByName && (
                                <span className="text-[11px] text-slate-500">
                                  • {st.issuedByName}
                                </span>
                              )}
                            </div>
                            <p className="text-slate-800 font-medium">{st.reason}</p>
                            {st.revokeReason && (
                              <p className="text-[11px] text-emerald-700">
                                {locale === 'en' ? 'Revoked:' : 'Знято:'} {st.revokeReason}
                              </p>
                            )}
                          </div>

                          {st.isActive && canRevokeStrikes && (
                            <Button
                              variant="neutral"
                              size="xs"
                              onClick={() => {
                                setRevokingStrikeId(st.id);
                                setRevokeReason('');
                              }}
                              className="shrink-0 self-start sm:self-center"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{locale === 'en' ? 'Revoke strike' : 'Зняти страйк'}</span>
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {revokingStrikeId && (
                    <form
                      onSubmit={handleRevokeStrike}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-300 space-y-2"
                    >
                      <p className="text-xs font-bold text-slate-900">
                        {locale === 'en'
                          ? 'Revoke strike & lift suspension (if below 3 strikes)'
                          : 'Зняття страйку та дострокове розблокування (якщо < 3 страйків)'}
                      </p>
                      <input
                        type="text"
                        required
                        minLength={3}
                        value={revokeReason}
                        onChange={(e) => setRevokeReason(e.target.value)}
                        placeholder={
                          locale === 'en'
                            ? 'Reason for revoking strike...'
                            : 'Причина зняття страйку...'
                        }
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setRevokingStrikeId(null)}
                        >
                          {t('common.cancel')}
                        </Button>
                        <Button type="submit" variant="primary" size="xs" disabled={isRevoking}>
                          {isRevoking ? t('common.loading') : t('common.confirm')}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
          </div>
        )}
      </Modal>

      {/* Standard Confirmation Modal (for BOTH Business & Customer verdicts) — Unified Light Header */}
      <ConfirmModal
        isOpen={Boolean(confirmDecision && detail)}
        onClose={() => setConfirmDecision(null)}
        onConfirm={async () => {
          if (confirmDecision) await executeResolution(confirmDecision);
        }}
        tone="default"
        icon={<Scale className="w-4 h-4" />}
        title={
          confirmDecision === 'business'
            ? locale === 'en'
              ? 'Confirm Resolution for Business'
              : 'Підтвердження рішення на користь бізнесу'
            : locale === 'en'
              ? 'Confirm Resolution for Customer'
              : 'Підтвердження рішення на користь клієнта'
        }
        subtitle={detail?.dispute.orderNumber}
        confirmLabel={locale === 'en' ? 'Confirm Decision' : 'Підтвердити рішення'}
        cancelLabel={t('common.cancel')}
        confirmVariant="primary"
        isLoading={isResolving}
      >
        {detail && confirmDecision && (
          <>
            <p className="text-slate-700 leading-relaxed">
              {confirmDecision === 'business'
                ? locale === 'en'
                  ? `You are closing dispute for order ${detail.dispute.orderNumber} in favor of «${detail.dispute.storeName}». No refund or strike will be issued.`
                  : `Ви закриваєте скаргу по замовленню ${detail.dispute.orderNumber} на користь закладу «${detail.dispute.storeName}». Кошти залишаться за бізнесом, страйк не видається.`
                : locale === 'en'
                  ? `You are resolving dispute for order ${detail.dispute.orderNumber} in favor of customer (${formatMoney(detail.dispute.orderTotalAmount)} UAH refund).${issueStrike ? ' 1 strike will be issued to the store.' : ''}`
                  : `Ви закриваєте скаргу по замовленню ${detail.dispute.orderNumber} на користь клієнта з поверненням ${formatMoney(detail.dispute.orderTotalAmount)} ₴.${issueStrike ? ` Закладу «${detail.dispute.storeName}» буде видано страйк (${detail.dispute.storeActiveStrikes + 1}/3).` : ''}`}
            </p>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">
                {locale === 'en' ? 'Explanation' : 'Обґрунтування рішення'}
              </div>
              <p className="text-slate-800 whitespace-pre-wrap">{resolutionNote.trim()}</p>
            </div>
          </>
        )}
      </ConfirmModal>

      {/* 3rd-Strike Suspension Confirmation Modal — Unified Light Header + DurationPicker */}
      <ConfirmModal
        isOpen={Boolean(showThirdStrikeModal && detail)}
        onClose={() => setShowThirdStrikeModal(false)}
        onConfirm={async () => {
          await executeResolution('customer', selectedSuspensionDays);
        }}
        tone="danger"
        icon={<ShieldAlert className="w-4 h-4" />}
        title={
          locale === 'en'
            ? '3rd Strike — Automatic Store Suspension'
            : '3-й страйк — Призупинення бізнесу'
        }
        subtitle={detail?.dispute.storeName}
        confirmLabel={
          locale === 'en' ? 'Confirm 3rd Strike & Suspend' : 'Підтвердити страйк та заблокувати'
        }
        cancelLabel={t('common.cancel')}
        confirmVariant="destructive"
        isLoading={isResolving}
      >
        {detail && (
          <>
            <AlertBanner
              tone="warning"
              title={
                locale === 'en'
                  ? `Store «${detail.dispute.storeName}» currently has ${detail.dispute.storeActiveStrikes} active strikes.`
                  : `У закладу «${detail.dispute.storeName}» вже ${detail.dispute.storeActiveStrikes} активних страйків.`
              }
            >
              {locale === 'en'
                ? 'Issuing this strike will immediately suspend the store. Only a staff member with the dedicated «Revoke Strikes» permission can revoke strikes and lift the suspension early.'
                : 'Видача цього страйку негайно призупинить роботу закладу. Зняти страйки та достроково вивести бізнес із блокування зможе лише співробітник із окремим правом «Зняття страйків».'}
            </AlertBanner>

            <DurationPicker
              value={selectedSuspensionDays}
              onChange={setSelectedSuspensionDays}
              locale={locale}
              label={
                locale === 'en'
                  ? 'Select suspension duration:'
                  : 'Оберіть термін блокування закладу:'
              }
            />
          </>
        )}
      </ConfirmModal>
    </div>
  );
};
