import React, { useState, useEffect, useCallback } from 'react';
import { useBusinessStore } from '../store/useBusinessStore';
import { useTranslation } from '../hooks/useTranslation';
import { api } from '../lib/api';
import { resolveMediaUrl } from '../lib/media';
import type { EnrichedOrderResponse } from '@bizx/api-client';
import {
  formatCompactCount,
  STORE_QUICK_REPLIES,
  type OrderStatus,
  type OrderMessageItem,
  type OrderMessageAttachmentDto
} from '@bizx/common-types';
import { Card, Badge, Select, Button, OrderChatBox } from '@bizx/ui';
import {
  ShoppingBag,
  Phone,
  MapPin,
  MessageSquare,
  AlertTriangle,
  Eye,
  X,
  RotateCcw,
  Star,
  CheckCircle2,
  Clock,
  ShieldAlert
} from 'lucide-react';

export const OrdersView: React.FC<{ canEdit?: boolean; canRefund?: boolean }> = ({
  canEdit = true,
  canRefund = false
}) => {
  const { orders, activeStore, updateOrderStatus, refreshOrders, isLoading } = useBusinessStore();
  const { t, locale } = useTranslation();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderMessages, setOrderMessages] = useState<OrderMessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Status edit state inside details modal
  const [nextStatus, setNextStatus] = useState<OrderStatus>('pending');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Quick refund offer state
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [modalNotice, setModalNotice] = useState<{ text: string; isError?: boolean } | null>(null);

  const selectedOrder: EnrichedOrderResponse | null =
    orders.find((o) => o.id === selectedOrderId) || null;

  const formatPrice = (kopecks: number) =>
    (kopecks / 100).toLocaleString(locale === 'en' ? 'en-US' : 'uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const getStatusBadge = (status: string) => {
    const label = t(`statuses.order.${status}`);
    switch (status) {
      case 'delivered':
        return <Badge variant="success">{label}</Badge>;
      case 'confirmed':
      case 'processing':
      case 'shipped':
      case 'paid':
        return <Badge variant="default">{label}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">{label}</Badge>;
      case 'pending':
      default:
        return <Badge variant="warning">{label}</Badge>;
    }
  };

  const getPayoutBadge = (payoutStatus?: string) => {
    if (!payoutStatus) return null;
    if (payoutStatus === 'released') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {locale === 'en' ? 'Released to payout' : 'Зараховано до виплат'}
        </span>
      );
    }
    if (payoutStatus === 'refunded') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
          {locale === 'en' ? 'Refunded from hold' : 'Повернено з резерву'}
        </span>
      );
    }
    if (payoutStatus === 'clawback') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          {locale === 'en' ? 'Deducted from payout' : 'Утримано з виплат'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
        {locale === 'en' ? 'Held until delivery' : 'Утримано до завершення'}
      </span>
    );
  };

  const loadMessages = useCallback(async (orderId: string, markRead: boolean) => {
    try {
      const res = await api.orders.getMessages(orderId);
      if (res.success && res.data) {
        setOrderMessages(res.data);
      }
      if (markRead) {
        const rd = await api.orders.markMessagesRead(orderId).catch(() => null);
        if (rd?.success && rd.data && rd.data.updated > 0) {
          void refreshOrders();
          window.dispatchEvent(new CustomEvent('bizx:orders-updated'));
        }
      }
    } catch {
      // ignore
    }
  }, [refreshOrders]);

  // Open details -> load chat + mark read + 3s polling
  useEffect(() => {
    if (!selectedOrderId) {
      setOrderMessages([]);
      setShowRefundForm(false);
      setRefundReason('');
      setModalNotice(null);
      return;
    }

    const found = orders.find((o) => o.id === selectedOrderId);
    if (found) {
      setNextStatus(found.status as OrderStatus);
    }

    setLoadingMessages(true);
    void loadMessages(selectedOrderId, true).finally(() => setLoadingMessages(false));

    const timer = window.setInterval(() => {
      void loadMessages(selectedOrderId, true);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [selectedOrderId, loadMessages]);

  // Periodic background refresh of store orders list (every 15s)
  useEffect(() => {
    if (!activeStore?.id) return;
    const timer = window.setInterval(() => {
      void refreshOrders();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [activeStore?.id, refreshOrders]);

  const handleSaveStatus = async () => {
    if (!selectedOrder) return;
    setIsUpdatingStatus(true);
    setModalNotice(null);
    try {
      const ok = await updateOrderStatus(selectedOrder.id, nextStatus);
      if (ok) {
        await refreshOrders();
        window.dispatchEvent(new CustomEvent('bizx:orders-updated'));
        setModalNotice({
          text: locale === 'en' ? 'Order status updated' : 'Статус замовлення оновлено'
        });
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleOfferRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !refundReason.trim()) return;
    setIsSubmittingRefund(true);
    setModalNotice(null);
    try {
      const res = await api.orders.createRefundOffer(selectedOrder.id, {
        reason: refundReason.trim()
      });
      if (res.success) {
        setShowRefundForm(false);
        setRefundReason('');
        await Promise.all([refreshOrders(), loadMessages(selectedOrder.id, false)]);
        window.dispatchEvent(new CustomEvent('bizx:orders-updated'));
        setModalNotice({
          text:
            locale === 'en'
              ? 'Quick refund offer sent! Waiting for customer confirmation.'
              : 'Пропозицію швидкого повернення надіслано клієнту на підтвердження!'
        });
      }
    } catch (err: any) {
      setModalNotice({
        text: err?.data?.message || err?.message || 'Помилка оформлення повернення',
        isError: true
      });
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const handleSendMessage = async (dto: {
    body?: string;
    attachments?: OrderMessageAttachmentDto[];
  }) => {
    if (!selectedOrder) return;
    const res = await api.orders.sendMessage(selectedOrder.id, dto);
    if (res.success && res.data) {
      setOrderMessages((prev) => [...prev, res.data]);
    }
  };

  const handleUploadAttachment = async (file: File) => {
    if (!selectedOrder) throw new Error('No order selected');
    const res = await api.orders.uploadChatAttachment(selectedOrder.id, file);
    if (!res.success || !res.data) throw new Error('Upload failed');
    return res.data;
  };

  if (!activeStore) {
    return (
      <div className="p-8 text-center text-slate-500">
        {t('admin.selectStore')}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('orders.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('orders.subtitle')} — «{activeStore.name}»
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-500">
          {locale === 'en' ? `Total orders: ${orders.length}` : `Всього замовлень: ${orders.length}`}
        </div>
      </div>

      {/* Compact Orders List */}
      {orders.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100 overflow-hidden">
          {orders.map((order) => {
            const hasDispute = Boolean(order.activeDispute);
            const isEscalated = order.activeDispute?.status === 'escalated_platform';
            const unread = order.unreadCount || 0;

            return (
              <div
                key={order.id}
                className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  hasDispute
                    ? 'bg-red-50/55 hover:bg-red-50/90 border-l-4 border-l-red-600'
                    : unread > 0
                      ? 'bg-blue-50/35 hover:bg-blue-50/60'
                      : 'hover:bg-slate-50/80'
                }`}
              >
                {/* Compact Left Summary */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {order.orderNumber}
                      </span>
                      {getStatusBadge(order.status)}

                      {hasDispute && (
                        <span className="inline-flex items-center gap-1 h-5 px-2 rounded text-[10px] font-black uppercase tracking-wide bg-red-600 text-white animate-pulse">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>
                            {isEscalated
                              ? locale === 'en'
                                ? 'Escalated to BizX'
                                : 'Скарга в BizX'
                              : locale === 'en'
                                ? 'Urgent Dispute'
                                : 'Спір • Терміново'}
                          </span>
                        </span>
                      )}

                      {order.refundOfferStatus === 'pending_customer' && (
                        <span className="inline-flex items-center gap-1 h-5 px-2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>
                            {locale === 'en' ? 'Refund pending' : 'Очікує підтвердження повернення'}
                          </span>
                        </span>
                      )}

                      {order.review && (
                        <span className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          <span>{order.review.rating}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 text-[11px] text-slate-500 flex-wrap">
                      <span className="font-semibold text-slate-700 truncate max-w-[180px]">
                        {order.contactName}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(order.createdAt).toLocaleString(
                          locale === 'en' ? 'en-US' : 'uk-UA',
                          { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
                        )}
                      </span>
                      <span>•</span>
                      <span>
                        {order.itemsCount ?? order.items?.length ?? 0} {t('common.pcs')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount + Unread Messages Badge + Details Button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <span className="font-bold text-sm text-slate-900 tabular-nums">
                    {formatPrice(order.totalAmount)} ₴
                  </span>

                  {unread > 0 && (
                    <span
                      title={
                        locale === 'en'
                          ? `${unread} unread message(s)`
                          : `Непрочитаних повідомлень: ${unread}`
                      }
                      className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-blue-600 text-white text-[11px] font-bold shadow-2xs"
                    >
                      <MessageSquare className="w-3 h-3 shrink-0" />
                      <span>{formatCompactCount(unread)}</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    title={locale === 'en' ? 'Order details & chat' : 'Деталі замовлення та чат'}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                      hasDispute
                        ? 'bg-red-600 hover:bg-red-700 border-red-600 text-white'
                        : 'bg-white hover:bg-slate-900 hover:text-white border-slate-200 hover:border-slate-900 text-slate-700'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">{t('common.details')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center border-dashed border-slate-300">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">{t('orders.empty')}</h3>
          <p className="text-xs text-slate-500 mt-1">
            {locale === 'en'
              ? 'Incoming customer orders will appear here automatically.'
              : 'Нові замовлення клієнтів відображатимуться у цьому списку.'}
          </p>
        </Card>
      )}

      {/* Order Details + Messenger Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setSelectedOrderId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[92vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-black text-slate-900 font-mono">
                    {selectedOrder.orderNumber}
                  </h2>
                  {getStatusBadge(selectedOrder.status)}
                  {getPayoutBadge(selectedOrder.payoutStatus)}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {new Date(selectedOrder.createdAt).toLocaleString(
                    locale === 'en' ? 'en-US' : 'uk-UA'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body: Order Details + Quick Actions + Chat */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {modalNotice && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                    modalNotice.isError
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{modalNotice.text}</span>
                </div>
              )}

              {/* Urgent Dispute Banner */}
              {selectedOrder.activeDispute && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-red-800 uppercase">
                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                      {selectedOrder.activeDispute.status === 'escalated_platform'
                        ? locale === 'en'
                          ? 'Dispute Escalated to BizX Arbitration'
                          : 'Скаргу передано до арбітражу BizX'
                        : locale === 'en'
                          ? 'High Priority: Customer Opened a Dispute'
                          : 'Високий пріоритет: клієнт відкрив спір'}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-200">
                      {t(`disputes.categories.${selectedOrder.activeDispute.category}`)}
                    </span>
                  </div>
                  <p className="text-xs text-red-900 leading-relaxed">
                    {selectedOrder.activeDispute.description}
                  </p>
                </div>
              )}

              {/* Customer Info + Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {locale === 'en' ? 'Customer & Delivery' : 'Клієнт та доставка'}
                  </div>
                  <p className="font-bold text-slate-900">{selectedOrder.contactName}</p>
                  <p className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{selectedOrder.contactPhone}</span>
                  </p>
                  {selectedOrder.deliveryAddress && (
                    <p className="flex items-start gap-1.5 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{selectedOrder.deliveryAddress}</span>
                    </p>
                  )}
                  {selectedOrder.notes && (
                    <div className="pt-2 border-t border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                        {t('orders.notes')}
                      </span>
                      <p className="text-xs text-slate-800 bg-white border border-slate-200 rounded-lg p-2">
                        {selectedOrder.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {t('orders.items')}
                    </span>
                    <span className="font-black text-slate-900 text-sm">
                      {formatPrice(selectedOrder.totalAmount)} ₴
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {(selectedOrder.items || []).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 py-1 border-b border-slate-200/60 last:border-0"
                      >
                        <span className="text-slate-700 font-medium truncate">
                          {item.productName}{' '}
                          <span className="text-slate-400">× {item.quantity}</span>
                        </span>
                        <span className="font-bold text-slate-900 shrink-0">
                          {formatPrice(item.totalPrice)} ₴
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Controls Bar: Status Change + Quick Refund */}
              {(canEdit || canRefund) && (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {canEdit && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-700">
                          {t('common.status')}:
                        </span>
                        <div className="w-44">
                          <Select
                            value={nextStatus}
                            onChange={(val) => setNextStatus(val as OrderStatus)}
                            options={[
                              { value: 'pending', label: t('statuses.order.pending') },
                              { value: 'confirmed', label: t('statuses.order.confirmed') },
                              { value: 'paid', label: t('statuses.order.paid') },
                              { value: 'shipped', label: t('statuses.order.shipped') },
                              { value: 'delivered', label: t('statuses.order.delivered') },
                              { value: 'cancelled', label: t('statuses.order.cancelled') }
                            ]}
                          />
                        </div>
                        <Button
                          size="sm"
                          disabled={isUpdatingStatus || isLoading || nextStatus === selectedOrder.status}
                          onClick={handleSaveStatus}
                          className="text-xs font-bold"
                        >
                          {t('common.save')}
                        </Button>
                      </div>
                    )}

                    {canRefund &&
                      selectedOrder.status !== 'cancelled' &&
                      selectedOrder.paymentStatus !== 'refunded' &&
                      selectedOrder.refundOfferStatus !== 'pending_customer' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRefundForm((prev) => !prev)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>
                            {locale === 'en' ? 'Quick Refund' : 'Швидке повернення'}
                          </span>
                        </Button>
                      )}
                  </div>

                  {selectedOrder.refundOfferStatus === 'pending_customer' && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        {locale === 'en'
                          ? `Quick refund offer (${formatPrice(selectedOrder.refundOfferAmount ?? selectedOrder.totalAmount)} ₴) is awaiting customer confirmation.`
                          : `Пропозицію швидкого повернення (${formatPrice(selectedOrder.refundOfferAmount ?? selectedOrder.totalAmount)} ₴) надіслано — очікується підтвердження клієнта.`}
                      </span>
                    </div>
                  )}

                  {showRefundForm && (
                    <form
                      onSubmit={handleOfferRefund}
                      className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2.5"
                    >
                      <p className="text-xs font-bold text-amber-950">
                        {locale === 'en'
                          ? `Offer full refund (${formatPrice(selectedOrder.totalAmount)} ₴)`
                          : `Запропонувати швидке повернення (${formatPrice(selectedOrder.totalAmount)} ₴)`}
                      </p>
                      <p className="text-[11px] text-amber-900/80">
                        {locale === 'en'
                          ? 'Once the customer confirms, the order is cancelled, funds are returned, and any open dispute closes without sanctions.'
                          : 'Після підтвердження клієнтом замовлення автоматично скасується, кошти повернуться, а відкритий спір закриється без санкцій.'}
                      </p>
                      <input
                        type="text"
                        required
                        minLength={2}
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        placeholder={
                          locale === 'en'
                            ? 'Reason (e.g. Damaged packaging — full refund)'
                            : 'Причина (напр. Пошкоджено упаковку — повертаємо повну суму)'
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:border-slate-900"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRefundForm(false)}
                        >
                          {t('common.cancel')}
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isSubmittingRefund}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          {isSubmittingRefund
                            ? t('common.loading')
                            : locale === 'en'
                              ? 'Send Refund Offer'
                              : 'Надіслати клієнту'}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Star Review (if customer rated delivered order) */}
              {selectedOrder.review && (
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <span>{locale === 'en' ? 'Customer rating:' : 'Оцінка клієнта:'}</span>
                      <span className="inline-flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= selectedOrder.review!.rating
                                ? 'text-amber-500 fill-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </span>
                    </div>
                    {selectedOrder.review.comment && (
                      <p className="text-xs text-slate-700">{selectedOrder.review.comment}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Messenger */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="w-4 h-4 text-slate-600" />
                    <span>
                      {locale === 'en' ? 'Order Chat with Customer' : 'Чат із клієнтом по замовленню'}
                    </span>
                  </h3>
                </div>

                <OrderChatBox
                  messages={orderMessages}
                  viewerRole="store"
                  canSend={canEdit}
                  quickReplies={STORE_QUICK_REPLIES[locale]}
                  locale={locale}
                  isLoading={loadingMessages}
                  resolveMediaUrl={(u) => resolveMediaUrl(u) || u}
                  onSendMessage={handleSendMessage}
                  onUploadAttachment={canEdit ? handleUploadAttachment : undefined}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
