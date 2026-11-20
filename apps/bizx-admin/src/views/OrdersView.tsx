import React, { useState, useEffect, useCallback } from 'react';
import { useBusinessStore } from '../store/useBusinessStore';
import { useTranslation } from '../hooks/useTranslation';
import { api } from '../lib/api';
import { resolveMediaUrl } from '../lib/media';
import type { EnrichedOrderResponse } from '@bizx/api-client';
import {
  STORE_QUICK_REPLIES,
  type OrderStatus,
  type OrderMessageItem,
  type OrderMessageAttachmentDto
} from '@bizx/common-types';
import {
  Card,
  Select,
  Button,
  Input,
  OrderChatBox,
  Modal,
  StatusBadge,
  CountBadge,
  AlertBanner
} from '@bizx/ui';
import {
  ShoppingBag,
  Phone,
  MapPin,
  MessageSquare,
  AlertTriangle,
  Eye,
  RotateCcw,
  Star,
  Clock,
  ShieldAlert,
  Search
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
        return (
          <StatusBadge tone="emerald" size="xs" dot>
            {label}
          </StatusBadge>
        );
      case 'confirmed':
      case 'processing':
      case 'shipped':
      case 'paid':
        return (
          <StatusBadge tone="blue" size="xs" dot>
            {label}
          </StatusBadge>
        );
      case 'cancelled':
        return (
          <StatusBadge tone="rose" size="xs" dot>
            {label}
          </StatusBadge>
        );
      case 'pending':
      default:
        return (
          <StatusBadge tone="amber" size="xs" dot>
            {label}
          </StatusBadge>
        );
    }
  };

  const getPayoutBadge = (payoutStatus?: string) => {
    if (!payoutStatus) return null;
    if (payoutStatus === 'released') {
      return (
        <StatusBadge tone="emerald" size="xs" className="rounded">
          {locale === 'en' ? 'Released to payout' : 'Зараховано до виплат'}
        </StatusBadge>
      );
    }
    if (payoutStatus === 'refunded') {
      return (
        <StatusBadge tone="slate" size="xs" className="rounded">
          {locale === 'en' ? 'Refunded from hold' : 'Повернено з резерву'}
        </StatusBadge>
      );
    }
    if (payoutStatus === 'clawback') {
      return (
        <StatusBadge tone="rose" size="xs" className="rounded">
          {locale === 'en' ? 'Deducted from payout' : 'Утримано з виплат'}
        </StatusBadge>
      );
    }
    return (
      <StatusBadge tone="amber" size="xs" className="rounded">
        {locale === 'en' ? 'Held until delivery' : 'Утримано до завершення'}
      </StatusBadge>
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

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'disputed') {
      if (!o.activeDispute) return false;
    } else if (statusFilter === 'unread') {
      if (!o.unreadCount || o.unreadCount <= 0) return false;
    } else if (statusFilter !== 'all' && o.status !== statusFilter) {
      return false;
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.contactName.toLowerCase().includes(q) ||
      o.contactPhone.toLowerCase().includes(q)
    );
  });

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
          {locale === 'en'
            ? `Showing ${filteredOrders.length} of ${orders.length}`
            : `Показано ${filteredOrders.length} із ${orders.length}`}
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              locale === 'en'
                ? 'Search by order #, customer or phone...'
                : 'Пошук за № замовлення, клієнтом або телефоном...'
            }
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-52">
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: locale === 'en' ? 'All statuses' : 'Усі статуси' },
              { value: 'unread', label: locale === 'en' ? 'With unread messages' : 'З непрочитаними' },
              { value: 'disputed', label: locale === 'en' ? 'Active disputes' : 'Активні спори' },
              { value: 'pending', label: t('statuses.order.pending') },
              { value: 'paid', label: t('statuses.order.paid') },
              { value: 'confirmed', label: t('statuses.order.confirmed') },
              { value: 'shipped', label: t('statuses.order.shipped') },
              { value: 'delivered', label: t('statuses.order.delivered') },
              { value: 'cancelled', label: t('statuses.order.cancelled') }
            ]}
          />
        </div>
      </div>

      {/* Compact Orders List */}
      {filteredOrders.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-100 overflow-hidden">
          {filteredOrders.map((order) => {
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
                        <StatusBadge
                          tone="rose"
                          size="xs"
                          icon={<AlertTriangle className="w-3 h-3" />}
                          className="animate-pulse"
                        >
                          {isEscalated
                            ? locale === 'en'
                              ? 'Escalated to BizX'
                              : 'Скарга в BizX'
                            : locale === 'en'
                              ? 'Urgent Dispute'
                              : 'Спір • Терміново'}
                        </StatusBadge>
                      )}

                      {order.refundOfferStatus === 'pending_customer' && (
                        <StatusBadge tone="amber" size="xs" icon={<Clock className="w-3 h-3" />}>
                          {locale === 'en' ? 'Refund pending' : 'Очікує підтвердження повернення'}
                        </StatusBadge>
                      )}

                      {order.review && (
                        <StatusBadge
                          tone="amber"
                          size="xs"
                          icon={<Star className="w-3 h-3 fill-amber-400 text-amber-500" />}
                        >
                          {order.review.rating}
                        </StatusBadge>
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

                  <CountBadge
                    count={unread}
                    tone="blue"
                    icon={<MessageSquare className="w-3 h-3 shrink-0" />}
                    title={
                      locale === 'en'
                        ? `${unread} unread message(s)`
                        : `Непрочитаних повідомлень: ${unread}`
                    }
                    className="h-6 px-2 text-[11px]"
                  />

                  <Button
                    variant={hasDispute ? 'destructive' : 'neutral'}
                    size="sm"
                    onClick={() => setSelectedOrderId(order.id)}
                    title={locale === 'en' ? 'Order details & chat' : 'Деталі замовлення та чат'}
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">{t('common.details')}</span>
                  </Button>
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

      {/* Order Details + Messenger Modal — Unified Light Header */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrderId(null)}
        size="3xl"
        tone={selectedOrder?.activeDispute ? 'danger' : 'default'}
        icon={<ShoppingBag className="w-4 h-4" />}
        title={selectedOrder ? <span className="font-mono">{selectedOrder.orderNumber}</span> : undefined}
        badge={
          selectedOrder ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              {getStatusBadge(selectedOrder.status)}
              {getPayoutBadge(selectedOrder.payoutStatus)}
            </div>
          ) : undefined
        }
        subtitle={
          selectedOrder
            ? new Date(selectedOrder.createdAt).toLocaleString(
                locale === 'en' ? 'en-US' : 'uk-UA'
              )
            : undefined
        }
      >
        {selectedOrder && (
          <div className="space-y-5">
            {modalNotice && (
              <AlertBanner tone={modalNotice.isError ? 'danger' : 'success'}>
                {modalNotice.text}
              </AlertBanner>
            )}

            {/* Urgent Dispute Banner */}
            {selectedOrder.activeDispute && (
              <AlertBanner
                tone="danger"
                title={
                  <div className="flex items-center justify-between gap-2 flex-wrap w-full">
                    <span className="inline-flex items-center gap-1.5 uppercase">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      {selectedOrder.activeDispute.status === 'escalated_platform'
                        ? locale === 'en'
                          ? 'Dispute Escalated to BizX Arbitration'
                          : 'Скаргу передано до арбітражу BizX'
                        : locale === 'en'
                          ? 'High Priority: Customer Opened a Dispute'
                          : 'Високий пріоритет: клієнт відкрив спір'}
                    </span>
                    <StatusBadge tone="rose" size="xs" className="rounded">
                      {t(`disputes.categories.${selectedOrder.activeDispute.category}`)}
                    </StatusBadge>
                  </div>
                }
              >
                {selectedOrder.activeDispute.description}
              </AlertBanner>
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
        )}
      </Modal>
    </div>
  );
};
