import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  Linking,
  KeyboardAvoidingView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcon } from '../components/MaterialIcon';
import { SafeImage } from '../components/SafeImage';
import { mobileApi } from '../lib/api';
import {
  DISPUTE_CATEGORIES,
  CUSTOMER_QUICK_REPLIES,
  type DisputeCategory,
  type OrderMessageItem,
  type OrderMessageAttachmentDto
} from '@bizx/common-types';
import type { EnrichedOrderResponse } from '@bizx/api-client';

interface OrderDetailScreenProps {
  orderId: string;
  onBack: () => void;
  onOrderUpdated?: () => void;
}

const DISPUTE_CATEGORY_LABELS: Record<DisputeCategory, string> = {
  not_received: 'Замовлення не отримано',
  damaged: 'Пошкоджений товар',
  wrong_item: 'Надіслано не той товар',
  missing_items: 'Неповна комплектація',
  poor_quality: 'Низька якість товару',
  other: 'Інша проблема'
};

export const OrderDetailScreen: React.FC<OrderDetailScreenProps> = ({
  orderId,
  onBack,
  onOrderUpdated
}) => {
  const [order, setOrder] = useState<EnrichedOrderResponse | null>(null);
  const [messages, setMessages] = useState<OrderMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Composer state
  const [text, setText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<OrderMessageAttachmentDto[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // More menu (`⋯`) & Dispute modals
  const [menuOpen, setMenuOpen] = useState(false);
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState<DisputeCategory>('damaged');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Rating state
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const formatPrice = (kopecks: number) =>
    (kopecks / 100).toLocaleString('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Підтверджено';
      case 'processing':
        return 'Комплектується';
      case 'shipped':
        return 'В дорозі';
      case 'delivered':
        return 'Виконано';
      case 'cancelled':
        return 'Скасовано';
      default:
        return 'Очікує підтвердження';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'cancelled':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'shipped':
      case 'confirmed':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      default:
        return 'bg-amber-50 border-amber-200 text-amber-700';
    }
  };

  const loadOrderAndMessages = useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      try {
        const [orderRes, msgRes] = await Promise.all([
          mobileApi.orders.getOrder(orderId),
          mobileApi.orders.getMessages(orderId)
        ]);
        if (orderRes.success && orderRes.data) {
          setOrder(orderRes.data);
        }
        if (msgRes.success && msgRes.data) {
          const list = msgRes.data;
          setMessages(list);
          const hasUnread = list.some(
            (m) =>
              (m.senderType === 'store' || m.senderType === 'platform') && !m.readByCustomerAt
          );
          if (hasUnread) {
            await mobileApi.orders.markMessagesRead(orderId).catch(() => {});
            onOrderUpdated?.();
          }
        }
      } catch (err: any) {
        if (!silent) {
          setErrorMsg(err?.message || 'Не вдалося завантажити замовлення');
        }
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [orderId, onOrderUpdated]
  );

  useEffect(() => {
    void loadOrderAndMessages(false);
    const interval = setInterval(() => {
      void loadOrderAndMessages(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [loadOrderAndMessages]);

  const handlePickAttachment = async () => {
    setErrorMsg(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted && Platform.OS !== 'web') {
        setErrorMsg('Надайте доступ до галереї, щоб прикріпити фото');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      setIsUploading(true);

      const formData = new FormData();
      const fileName = asset.fileName || `photo-${Date.now()}.jpg`;
      const mimeType = asset.mimeType || 'image/jpeg';

      if (Platform.OS === 'web') {
        const webFile = (asset as any).file;
        if (webFile instanceof File || webFile instanceof Blob) {
          formData.append('file', webFile, fileName);
        } else {
          const resp = await fetch(asset.uri);
          const blob = await resp.blob();
          formData.append('file', blob, fileName);
        }
      } else {
        formData.append('file', {
          uri: asset.uri,
          name: fileName,
          type: mimeType
        } as any);
      }

      const res = await mobileApi.orders.uploadChatAttachment(orderId, formData);
      if (res.success && res.data) {
        setPendingAttachments((prev) => [...prev, res.data]);
      } else {
        setErrorMsg(res.error || 'Не вдалося завантажити файл');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Помилка завантаження фото');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (overrideBody?: string) => {
    const body = (overrideBody !== undefined ? overrideBody : text).trim();
    if (!body && pendingAttachments.length === 0) return;

    setIsSending(true);
    setErrorMsg(null);
    try {
      const res = await mobileApi.orders.sendMessage(orderId, {
        body: body || undefined,
        attachments: pendingAttachments
      });
      if (res.success && res.data) {
        if (overrideBody === undefined) setText('');
        setPendingAttachments([]);
        setMessages((prev) => [...prev, res.data]);
        onOrderUpdated?.();
      } else {
        setErrorMsg(res.error || 'Не вдалося надіслати повідомлення');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Не вдалося надіслати повідомлення');
    } finally {
      setIsSending(false);
    }
  };

  const handleRespondRefund = async (accept: boolean) => {
    setIsActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await mobileApi.orders.respondRefundOffer(orderId, { accept });
      if (res.success) {
        await loadOrderAndMessages(true);
        onOrderUpdated?.();
      } else {
        setErrorMsg(res.error || 'Не вдалося обробити повернення');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Не вдалося обробити повернення');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleOpenDispute = async () => {
    if (disputeDescription.trim().length < 5) {
      setErrorMsg('Опишіть проблему детальніше (мін. 5 символів)');
      return;
    }
    setIsActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await mobileApi.orders.openDispute(orderId, {
        category: disputeCategory,
        description: disputeDescription.trim()
      });
      if (res.success) {
        setDisputeModalOpen(false);
        setDisputeDescription('');
        await loadOrderAndMessages(true);
        onOrderUpdated?.();
      } else {
        setErrorMsg(res.error || 'Не вдалося відкрити спір');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Не вдалося відкрити спір');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleWithdrawDispute = async () => {
    if (!order?.activeDispute) return;
    setIsActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await mobileApi.orders.withdrawDispute(orderId, order.activeDispute.id);
      if (res.success) {
        setWithdrawModalOpen(false);
        await loadOrderAndMessages(true);
        onOrderUpdated?.();
      } else {
        setErrorMsg(res.error || 'Не вдалося відкликати спір');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Не вдалося відкликати спір');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEscalateDispute = async () => {
    if (!order?.activeDispute) return;
    setIsActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await mobileApi.orders.escalateDispute(orderId, order.activeDispute.id, {
        reason: escalateReason.trim() || undefined
      });
      if (res.success) {
        setEscalateModalOpen(false);
        setEscalateReason('');
        await loadOrderAndMessages(true);
        onOrderUpdated?.();
      } else {
        setErrorMsg(res.error || 'Не вдалося передати скаргу');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Не вдалося передати скаргу');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    setIsSubmittingReview(true);
    setErrorMsg(null);
    try {
      const res = await mobileApi.orders.createReview(orderId, {
        rating: ratingValue,
        comment: ratingComment.trim() || undefined
      });
      if (res.success) {
        setRatingComment('');
        await loadOrderAndMessages(true);
        onOrderUpdated?.();
      } else {
        setErrorMsg(res.error || 'Не вдалося зберегти оцінку');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Не вдалося зберегти оцінку');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading || !order) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0f172a" />
        <Text className="text-xs text-slate-400 mt-2">Завантаження замовлення...</Text>
      </View>
    );
  }

  const activeDispute = order.activeDispute;
  const canOpenDispute = !activeDispute && order.status !== 'cancelled';

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Bar */}
      <View className="bg-white border-b border-slate-200 px-4 py-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5 flex-1">
          <TouchableOpacity
            onPress={onBack}
            className="w-9 h-9 rounded-lg bg-slate-100 items-center justify-center border border-slate-200"
          >
            <MaterialIcon name="arrow-back" size={18} color="#0f172a" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-sm font-black text-slate-900 font-mono" numberOfLines={1}>
              {order.orderNumber}
            </Text>
            <Text className="text-[11px] text-slate-500" numberOfLines={1}>
              {order.storeName || 'Заклад'} · {new Date(order.createdAt).toLocaleDateString('uk-UA')}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <View className={`px-2 py-1 rounded border ${getStatusClass(order.status)}`}>
            <Text className="text-[10px] font-bold uppercase">{getStatusText(order.status)}</Text>
          </View>

          <TouchableOpacity
            onPress={() => setMenuOpen(true)}
            className="w-9 h-9 rounded-lg bg-slate-100 items-center justify-center border border-slate-200"
          >
            <MaterialIcon name="more-vert" size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}
      >
        {errorMsg && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 flex-row items-center justify-between">
            <Text className="text-xs text-red-700 font-medium flex-1 pr-2">{errorMsg}</Text>
            <TouchableOpacity onPress={() => setErrorMsg(null)}>
              <MaterialIcon name="close" size={16} color="#b91c1c" />
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Refund Confirmation Banner */}
        {order.refundOfferStatus === 'pending_customer' && (
          <View className="bg-emerald-50 border border-emerald-300 rounded-xl p-4">
            <View className="flex-row items-center gap-2 mb-1.5">
              <MaterialIcon name="currency-exchange" size={18} color="#047857" />
              <Text className="text-xs font-black text-emerald-900 uppercase">
                Пропозиція швидкого повернення
              </Text>
            </View>
            <Text className="text-xs text-emerald-900 leading-4">
              Заклад пропонує повернути{' '}
              <Text className="font-black">
                {formatPrice(order.refundOfferAmount || order.totalAmount)} ₴
              </Text>
              {order.refundOfferReason ? ` («${order.refundOfferReason}»)` : ''}. Після вашого
              підтвердження замовлення буде скасовано, а кошти повернено автоматично.
            </Text>
            <View className="flex-row gap-2 mt-3">
              <TouchableOpacity
                disabled={isActionLoading}
                onPress={() => handleRespondRefund(true)}
                className="flex-1 bg-emerald-700 py-2.5 rounded-lg items-center"
              >
                <Text className="text-xs font-bold text-white">Підтвердити повернення</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={isActionLoading}
                onPress={() => handleRespondRefund(false)}
                className="px-4 py-2.5 bg-white border border-emerald-300 rounded-lg items-center"
              >
                <Text className="text-xs font-bold text-emerald-800">Відхилити</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Active Dispute Banner */}
        {activeDispute && (
          <View
            className={`rounded-xl p-4 border ${
              activeDispute.status === 'escalated_platform'
                ? 'bg-red-50 border-red-300'
                : 'bg-amber-50 border-amber-300'
            }`}
          >
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center gap-1.5">
                <MaterialIcon
                  name="report-problem"
                  size={16}
                  color={activeDispute.status === 'escalated_platform' ? '#b91c1c' : '#b45309'}
                />
                <Text
                  className={`text-xs font-black uppercase ${
                    activeDispute.status === 'escalated_platform'
                      ? 'text-red-900'
                      : 'text-amber-900'
                  }`}
                >
                  {activeDispute.status === 'escalated_platform'
                    ? 'Скарга на розгляді BizX'
                    : 'Відкрито спір із закладом'}
                </Text>
              </View>
            </View>
            <Text className="text-[11px] font-bold text-slate-800 mt-0.5">
              Причина: {DISPUTE_CATEGORY_LABELS[activeDispute.category]}
            </Text>
            <Text className="text-xs text-slate-700 mt-1 leading-4">
              {activeDispute.description}
            </Text>
            <View className="flex-row gap-2 mt-3">
              <TouchableOpacity
                onPress={() => setWithdrawModalOpen(true)}
                className="flex-1 bg-white border border-slate-300 py-2 rounded-lg items-center"
              >
                <Text className="text-[11px] font-bold text-slate-800">Відкликати спір</Text>
              </TouchableOpacity>
              {activeDispute.status === 'open_store' && (
                <TouchableOpacity
                  onPress={() => setEscalateModalOpen(true)}
                  className="flex-1 bg-red-600 py-2 rounded-lg items-center"
                >
                  <Text className="text-[11px] font-bold text-white">Передати в BizX</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Order Details Card */}
        <View className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
            Склад замовлення
          </Text>
          <View className="space-y-2">
            {(order.items || []).map((item) => (
              <View
                key={item.id}
                className="flex-row items-center justify-between py-1.5 border-b border-slate-100"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-xs font-bold text-slate-900">{item.productName}</Text>
                  <Text className="text-[11px] text-slate-400">
                    {item.quantity} × {formatPrice(item.unitPrice)} ₴
                  </Text>
                </View>
                <Text className="text-xs font-black text-slate-900">
                  {formatPrice(item.totalPrice)} ₴
                </Text>
              </View>
            ))}
          </View>

          <View className="flex-row items-center justify-between pt-3 mt-1">
            <Text className="text-xs font-bold text-slate-600">Разом до сплати</Text>
            <View className="items-end">
              <Text className="text-base font-black text-slate-900">
                {formatPrice(order.totalAmount)} ₴
              </Text>
              {order.paymentStatus === 'refunded' && (
                <Text className="text-[10px] font-bold text-emerald-700">Кошти повернено</Text>
              )}
            </View>
          </View>

          {order.deliveryAddress ? (
            <View className="mt-3 pt-3 border-t border-slate-100">
              <Text className="text-[10px] font-bold text-slate-400 uppercase">Доставка</Text>
              <Text className="text-xs text-slate-700 mt-0.5">{order.deliveryAddress}</Text>
            </View>
          ) : null}

          {order.notes ? (
            <View className="mt-2.5 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
              <Text className="text-[10px] font-bold text-slate-500 uppercase">
                Ваш коментар до замовлення
              </Text>
              <Text className="text-xs text-slate-800 mt-0.5">{order.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Star Rating Card (Delivered orders only) */}
        {order.status === 'delivered' && (
          <View className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <Text className="text-xs font-black text-slate-900 mb-1">Оцінка закладу</Text>
            {order.review ? (
              <View>
                <View className="flex-row items-center gap-1 my-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <MaterialIcon
                      key={star}
                      name={star <= order.review!.rating ? 'star' : 'star-border'}
                      size={20}
                      color={star <= order.review!.rating ? '#f59e0b' : '#cbd5e1'}
                    />
                  ))}
                  <Text className="text-xs font-bold text-slate-700 ml-1">
                    {order.review.rating}/5
                  </Text>
                </View>
                {order.review.comment ? (
                  <Text className="text-xs text-slate-600 mt-1">{order.review.comment}</Text>
                ) : null}
              </View>
            ) : (
              <View>
                <Text className="text-[11px] text-slate-500 mb-2">
                  Замовлення виконано! Поділіться враженням про заклад:
                </Text>
                <View className="flex-row items-center gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRatingValue(star)}>
                      <MaterialIcon
                        name={star <= ratingValue ? 'star' : 'star-border'}
                        size={28}
                        color={star <= ratingValue ? '#f59e0b' : '#cbd5e1'}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  value={ratingComment}
                  onChangeText={setRatingComment}
                  placeholder="Короткий відгук (необов'язково)..."
                  placeholderTextColor="#94a3b8"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 mb-2.5"
                />
                <TouchableOpacity
                  disabled={isSubmittingReview}
                  onPress={handleSubmitReview}
                  className="bg-slate-900 py-2.5 rounded-lg items-center"
                >
                  {isSubmittingReview ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text className="text-xs font-bold text-white">Надіслати оцінку</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Order Messenger Card */}
        <View className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <View className="px-4 py-3 border-b border-slate-100 flex-row items-center justify-between bg-slate-50">
            <View className="flex-row items-center gap-2">
              <MaterialIcon name="chat" size={16} color="#0f172a" />
              <Text className="text-xs font-black text-slate-900">Чат підтримки замовлення</Text>
            </View>
            <Text className="text-[10px] text-slate-400 font-medium">Онлайн</Text>
          </View>

          {/* Messages List */}
          <View className="p-3.5 bg-slate-50/50 space-y-2.5 min-h-[180px]">
            {messages.length === 0 ? (
              <View className="py-8 items-center">
                <MaterialIcon name="forum" size={26} color="#cbd5e1" />
                <Text className="text-xs font-semibold text-slate-500 mt-2">
                  Повідомлень ще немає
                </Text>
                <Text className="text-[11px] text-slate-400 text-center mt-0.5">
                  Напишіть закладу, щоб уточнити деталі доставки або товарів
                </Text>
              </View>
            ) : (
              messages.map((m) => {
                if (m.senderType === 'system') {
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

                const isOwn = m.senderType === 'customer';
                const isPlatform = m.senderType === 'platform';
                const isRead = Boolean(m.readByStoreAt);

                return (
                  <View
                    key={m.id}
                    className={`mb-2 ${isOwn ? 'items-end' : 'items-start'}`}
                  >
                    <View
                      className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 border ${
                        isOwn
                          ? 'bg-slate-900 border-slate-900 rounded-br-sm'
                          : isPlatform
                          ? 'bg-indigo-50 border-indigo-200 rounded-bl-sm'
                          : 'bg-white border-slate-200 rounded-bl-sm'
                      }`}
                    >
                      {!isOwn && (
                        <Text
                          className={`text-[10px] font-black mb-0.5 ${
                            isPlatform ? 'text-indigo-700' : 'text-slate-500'
                          }`}
                        >
                          {isPlatform ? 'Арбітраж BizX' : m.senderName || 'Підтримка закладу'}
                        </Text>
                      )}

                      {m.body ? (
                        <Text
                          className={`text-xs leading-4 ${
                            isOwn ? 'text-white' : 'text-slate-800'
                          }`}
                        >
                          {m.body}
                        </Text>
                      ) : null}

                      {m.attachments && m.attachments.length > 0 && (
                        <View className="mt-2 gap-1.5">
                          {m.attachments.map((att, idx) => {
                            const isImage = att.mimeType.startsWith('image/');
                            return isImage ? (
                              <TouchableOpacity
                                key={`${m.id}-att-${idx}`}
                                onPress={() => Linking.openURL(att.url).catch(() => {})}
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
                                onPress={() => Linking.openURL(att.url).catch(() => {})}
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
                        <Text
                          className={`text-[9px] ${
                            isOwn ? 'text-slate-400' : 'text-slate-400'
                          }`}
                        >
                          {new Date(m.createdAt).toLocaleTimeString('uk-UA', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                        {isOwn && (
                          <Text
                            className={`text-[10px] font-bold ${
                              isRead ? 'text-sky-400' : 'text-slate-400'
                            }`}
                          >
                            {isRead ? '✓✓' : '✓'}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Quick-reply Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 6 }}
            className="border-t border-slate-100 bg-white"
          >
            {CUSTOMER_QUICK_REPLIES.uk.map((phrase) => (
              <TouchableOpacity
                key={phrase}
                onPress={() => setText(phrase)}
                className="bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-full"
              >
                <Text className="text-[11px] font-medium text-slate-700">{phrase}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Pending attachments preview */}
          {pendingAttachments.length > 0 && (
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
                  <TouchableOpacity
                    onPress={() =>
                      setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))
                    }
                  >
                    <MaterialIcon name="close" size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Composer */}
          <View className="p-2.5 border-t border-slate-200 bg-white flex-row items-center gap-2">
            <TouchableOpacity
              disabled={isUploading}
              onPress={handlePickAttachment}
              className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 items-center justify-center"
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <MaterialIcon name="add-photo-alternate" size={19} color="#334155" />
              )}
            </TouchableOpacity>

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Написати повідомлення..."
              placeholderTextColor="#94a3b8"
              multiline
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 max-h-24"
            />

            <TouchableOpacity
              disabled={isSending || (!text.trim() && pendingAttachments.length === 0)}
              onPress={() => handleSendMessage()}
              className={`w-9 h-9 rounded-lg items-center justify-center ${
                isSending || (!text.trim() && pendingAttachments.length === 0)
                  ? 'bg-slate-200'
                  : 'bg-slate-900'
              }`}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <MaterialIcon name="send" size={17} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* `⋯` Action Menu Modal */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setMenuOpen(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <View className="bg-white rounded-t-2xl p-4 pb-8 space-y-2">
            <Text className="text-xs font-black text-slate-400 uppercase px-2 mb-1">
              Дії по замовленню {order.orderNumber}
            </Text>

            {canOpenDispute && (
              <TouchableOpacity
                onPress={() => {
                  setMenuOpen(false);
                  setDisputeModalOpen(true);
                }}
                className="flex-row items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200"
              >
                <MaterialIcon name="report-problem" size={20} color="#b45309" />
                <View className="flex-1">
                  <Text className="text-xs font-bold text-amber-900">Відкрити спір</Text>
                  <Text className="text-[11px] text-amber-700">
                    Повідомити заклад про проблему із замовленням
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {activeDispute && (
              <TouchableOpacity
                onPress={() => {
                  setMenuOpen(false);
                  setWithdrawModalOpen(true);
                }}
                className="flex-row items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200"
              >
                <MaterialIcon name="check-circle" size={20} color="#047857" />
                <View className="flex-1">
                  <Text className="text-xs font-bold text-emerald-900">Відкликати спір</Text>
                  <Text className="text-[11px] text-emerald-700">
                    Питання вирішено — закрити спір без санкцій
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {activeDispute?.status === 'open_store' && (
              <TouchableOpacity
                onPress={() => {
                  setMenuOpen(false);
                  setEscalateModalOpen(true);
                }}
                className="flex-row items-center gap-3 p-3 rounded-xl bg-red-50 border border-red-200"
              >
                <MaterialIcon name="gavel" size={20} color="#b91c1c" />
                <View className="flex-1">
                  <Text className="text-xs font-bold text-red-900">Передати скаргу в BizX</Text>
                  <Text className="text-[11px] text-red-700">
                    Якщо заклад не відповідає або порушує правила
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            {!canOpenDispute && !activeDispute && (
              <View className="p-3 bg-slate-50 rounded-xl">
                <Text className="text-xs text-slate-500 text-center">
                  Для скасованого замовлення відкриття спору недоступне
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setMenuOpen(false)}
              className="mt-2 py-3 rounded-xl bg-slate-100 items-center"
            >
              <Text className="text-xs font-bold text-slate-700">Закрити</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Open Dispute Modal */}
      <Modal
        visible={disputeModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setDisputeModalOpen(false)}
      >
        <View className="flex-1 bg-black/50 justify-center p-4">
          <View className="bg-white rounded-2xl p-5 max-w-md w-full self-center">
            <Text className="text-base font-black text-slate-900">Відкрити спір</Text>
            <Text className="text-xs text-slate-500 mt-1 mb-3">
              Оберіть причину та опишіть ситуацію. Заклад отримає термінове сповіщення.
            </Text>

            <View className="flex-row flex-wrap gap-1.5 mb-3">
              {DISPUTE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setDisputeCategory(cat)}
                  className={`px-2.5 py-1.5 rounded-lg border ${
                    disputeCategory === cat
                      ? 'bg-slate-900 border-slate-900'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-[11px] font-bold ${
                      disputeCategory === cat ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {DISPUTE_CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={disputeDescription}
              onChangeText={setDisputeDescription}
              placeholder="Детально опишіть проблему (мін. 5 символів)..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 min-h-[84px]"
              style={{ textAlignVertical: 'top' }}
            />

            <View className="flex-row gap-2 mt-4">
              <TouchableOpacity
                onPress={() => setDisputeModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 rounded-lg items-center"
              >
                <Text className="text-xs font-bold text-slate-700">Скасувати</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={isActionLoading}
                onPress={handleOpenDispute}
                className="flex-1 py-2.5 bg-amber-600 rounded-lg items-center"
              >
                <Text className="text-xs font-bold text-white">Відкрити спір</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Withdraw Confirmation Modal */}
      <Modal
        visible={withdrawModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setWithdrawModalOpen(false)}
      >
        <View className="flex-1 bg-black/50 justify-center p-4">
          <View className="bg-white rounded-2xl p-5 max-w-md w-full self-center">
            <Text className="text-base font-black text-slate-900">Відкликати спір?</Text>
            <Text className="text-xs text-slate-600 mt-1.5 leading-4">
              Підтвердіть, що питання успішно вирішено. Спір буде закрито без жодних санкцій для
              закладу.
            </Text>
            <View className="flex-row gap-2 mt-4">
              <TouchableOpacity
                onPress={() => setWithdrawModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 rounded-lg items-center"
              >
                <Text className="text-xs font-bold text-slate-700">Назад</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={isActionLoading}
                onPress={handleWithdrawDispute}
                className="flex-1 py-2.5 bg-emerald-700 rounded-lg items-center"
              >
                <Text className="text-xs font-bold text-white">Підтвердити</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Escalate Confirmation Modal */}
      <Modal
        visible={escalateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEscalateModalOpen(false)}
      >
        <View className="flex-1 bg-black/50 justify-center p-4">
          <View className="bg-white rounded-2xl p-5 max-w-md w-full self-center">
            <Text className="text-base font-black text-red-900">Передати скаргу в BizX?</Text>
            <Text className="text-xs text-slate-600 mt-1.5 leading-4 mb-3">
              Модератори BizX перевірять ваше замовлення та всю переписку в чаті. Якщо заклад
              порушив правила, йому може бути винесено страйк.
            </Text>
            <TextInput
              value={escalateReason}
              onChangeText={setEscalateReason}
              placeholder="Додатковий коментар для модератора (необов'язково)..."
              placeholderTextColor="#94a3b8"
              multiline
              className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 min-h-[64px]"
              style={{ textAlignVertical: 'top' }}
            />
            <View className="flex-row gap-2 mt-4">
              <TouchableOpacity
                onPress={() => setEscalateModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 rounded-lg items-center"
              >
                <Text className="text-xs font-bold text-slate-700">Скасувати</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={isActionLoading}
                onPress={handleEscalateDispute}
                className="flex-1 py-2.5 bg-red-600 rounded-lg items-center"
              >
                <Text className="text-xs font-bold text-white">Передати в BizX</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};
