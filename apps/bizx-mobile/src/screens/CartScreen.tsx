import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput
} from 'react-native';
import { MaterialIcon } from '../components/MaterialIcon';
import { SafeImage } from '../components/SafeImage';
import { MobilePhoneInput } from '../components/MobilePhoneInput';
import {
  MobileButton,
  MobileAlertBanner,
  MobileEmptyState,
  MobileSectionHeader
} from '../components/MobilePrimitives';
import { useCartStore } from '../store/useCartStore';
import { useMobileAuthStore } from '../store/useMobileAuthStore';
import { mobileApi } from '../lib/api';
import { formatMoney } from '@bizx/utils';
import type { StoreMarketingSubscriptionState } from '@bizx/common-types';

interface CartScreenProps {
  onGoToStores?: () => void;
  onGoToOrders?: () => void;
  onContinueShopping?: () => void;
  onOrderSuccess?: () => void;
}

export const CartScreen: React.FC<CartScreenProps> = ({
  onGoToStores,
  onGoToOrders,
  onContinueShopping,
  onOrderSuccess
}) => {
  const handleStores = onGoToStores || onContinueShopping || (() => {});
  const handleOrders = onGoToOrders || onOrderSuccess || (() => {});

  const { items, storeId, updateQuantity, clearCart, getTotalAmount } =
    useCartStore();
  const { user } = useMobileAuthStore();

  const [contactName, setContactName] = useState(user?.name || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '+380');
  const [deliveryAddress, setDeliveryAddress] = useState('м. Київ, Відділення Нової Пошти');
  const [notes, setNotes] = useState('');
  const [marketingSub, setMarketingSub] = useState<StoreMarketingSubscriptionState | null>(null);
  const [optInMarketing, setOptInMarketing] = useState(false);

  useEffect(() => {
    let active = true;
    if (!storeId || !user) {
      setMarketingSub(null);
      setOptInMarketing(false);
      return;
    }
    mobileApi.broadcasts
      .getStoreMarketingSubscription(storeId)
      .then((res) => {
        if (active && res.success && res.data) {
          setMarketingSub(res.data);
          if (!res.data.showCheckoutOptIn) setOptInMarketing(false);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [storeId, user]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);

  const formatPrice = (kopecks: number) => formatMoney(kopecks, 'uk');

  const handleCheckout = async () => {
    if (!storeId || items.length === 0) return;
    if (!contactName.trim() || !contactPhone.trim()) {
      setErrorMessage('Вкажіть контактне ім’я та номер телефону');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        storeId,
        contactName,
        contactPhone,
        paymentMethod: 'card' as const,
        deliveryAddress: deliveryAddress || 'Самовивіз',
        notes: notes || undefined,
        ...(marketingSub?.showCheckoutOptIn ? { subscribeToStoreMarketing: optInMarketing } : {}),
        items: items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity
        }))
      };

      const res = await mobileApi.orders.createOrder(payload);
      if (res.success && res.data) {
        setCreatedOrderNumber(res.data.orderNumber);
        clearCart();
      } else {
        setErrorMessage('Не вдалося створити замовлення');
      }
    } catch (err: any) {
      const msg = err.data?.message || err.message || 'Помилка оформлення замовлення';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Order Success Screen
  if (createdOrderNumber) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-6">
        <View className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm items-center w-full max-w-sm">
          <View className="w-14 h-14 rounded-full bg-emerald-50 items-center justify-center mb-4 border border-emerald-200">
            <MaterialIcon name="check-circle-outline" size={32} color="#059669" />
          </View>
          <Text className="text-lg font-black text-slate-900 mb-1">Замовлення прийнято!</Text>
          <Text className="text-xs font-bold text-slate-900 mb-2 font-mono">{createdOrderNumber}</Text>
          <Text className="text-xs text-slate-500 text-center mb-6 leading-5">
            Дякуємо за покупку! Партнер отримав ваше замовлення та розпочав його обробку.
          </Text>

          <View className="w-full gap-2">
            <MobileButton
              label="Переглянути замовлення"
              onPress={() => {
                setCreatedOrderNumber(null);
                handleOrders();
              }}
            />
            <MobileButton
              label="Продовжити покупки"
              variant="secondary"
              onPress={() => {
                setCreatedOrderNumber(null);
                handleStores();
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  // Empty Cart Screen
  if (items.length === 0) {
    return (
      <MobileEmptyState
        iconName="remove-shopping-cart"
        title="Кошик порожній"
        description="Перейдіть до каталогу та оберіть потрібні товари для замовлення"
        actionLabel="Перейти до магазинів"
        onAction={handleStores}
      />
    );
  }

  const totalAmount = getTotalAmount();

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ paddingBottom: 120 }}>
      <MobileSectionHeader eyebrow="Оформлення покупки" title="Мій кошик" />

      {/* Cart Items List */}
      <View className="px-5 mt-2 space-y-3">
        {items.map((item) => (
          <View
            key={item.product.id}
            className="bg-white border border-slate-200 rounded-xl p-3 flex-row items-center shadow-sm mb-2"
          >
            <View className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 items-center justify-center mr-3 overflow-hidden">
              <SafeImage
                sourceUrl={item.product.imageUrl}
                className="w-full h-full"
                resizeMode="contain"
                fallback={<MaterialIcon name="inventory-2" size={22} color="#94a3b8" />}
              />
            </View>

            <View className="flex-1 pr-2">
              <Text className="font-bold text-slate-900 text-xs" numberOfLines={1}>
                {item.product.name}
              </Text>
              <Text className="font-bold text-slate-900 text-sm mt-0.5">
                {formatPrice(item.product.price * item.quantity)} ₴
              </Text>
            </View>

            {/* Quantity Controls */}
            <View className="flex-row items-center gap-1.5 bg-slate-100 rounded-lg p-1 border border-slate-200">
              <TouchableOpacity
                onPress={() => updateQuantity(item.product.id, -1)}
                className="w-6 h-6 bg-white rounded items-center justify-center border border-slate-200"
              >
                <Text className="text-slate-700 font-black text-xs">-</Text>
              </TouchableOpacity>
              <Text className="text-xs font-bold text-slate-900 px-1">{item.quantity}</Text>
              <TouchableOpacity
                onPress={() => updateQuantity(item.product.id, 1)}
                className="w-6 h-6 bg-white rounded items-center justify-center border border-slate-200"
              >
                <Text className="text-slate-700 font-black text-xs">+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Checkout Form */}
      <View className="px-5 mt-3">
        <View className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
          <Text className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Контактні дані покупця
          </Text>

          {errorMessage && <MobileAlertBanner tone="danger" message={errorMessage} />}

          <View className="space-y-1">
            <Text className="text-[11px] font-semibold text-slate-600">Ім&apos;я одержувача *</Text>
            <TextInput
              value={contactName}
              onChangeText={setContactName}
              placeholder="Марія Бондаренко"
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900"
            />
          </View>

          <View className="space-y-1">
            <Text className="text-[11px] font-semibold text-slate-600">Телефон *</Text>
            <MobilePhoneInput value={contactPhone} onChange={setContactPhone} locale="uk" />
          </View>

          <View className="space-y-1">
            <Text className="text-[11px] font-semibold text-slate-600">Адреса доставки</Text>
            <TextInput
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="м. Київ, Відділення Нової Пошти №..."
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900"
            />
          </View>

          <View className="space-y-1">
            <Text className="text-[11px] font-semibold text-slate-600">Примітка до замовлення</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Коментар кур'єру або побажання..."
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900"
            />
          </View>

          {user && marketingSub?.showCheckoutOptIn && (
            <TouchableOpacity
              onPress={() => setOptInMarketing((v) => !v)}
              activeOpacity={0.8}
              className="flex-row items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 mt-1"
            >
              <View
                className={`w-5 h-5 rounded border items-center justify-center mt-0.5 ${
                  optInMarketing ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-300'
                }`}
              >
                {optInMarketing && <MaterialIcon name="check" size={14} color="#ffffff" />}
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-900">
                  Отримувати акції та знижки від закладу
                </Text>
                <Text className="text-[10px] text-slate-500 mt-0.5 leading-4">
                  Необов’язково. Повідомлення приходитимуть у Пошту BizX. Відписатися можна в 1 клік у будь-який момент.
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Total & Submit Button */}
          <View className="pt-3 border-t border-slate-100 mt-2">
            <View className="flex-row items-baseline justify-between mb-3">
              <Text className="text-xs text-slate-500 font-semibold">До сплати:</Text>
              <Text className="text-xl font-black text-slate-900">
                {formatPrice(totalAmount)} ₴
              </Text>
            </View>

            <MobileButton
              label="Підтвердити замовлення"
              onPress={handleCheckout}
              loading={isSubmitting}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
