import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator
} from 'react-native';
import { useCartStore } from '../store/useCartStore';
import { useMobileAuthStore } from '../store/useMobileAuthStore';
import { mobileApi } from '../lib/api';

interface CartScreenProps {
  onGoToStores: () => void;
  onGoToOrders: () => void;
}

export const CartScreen: React.FC<CartScreenProps> = ({ onGoToStores, onGoToOrders }) => {
  const { items, storeId, updateQuantity, removeFromCart, clearCart, getTotalAmount } =
    useCartStore();
  const { user } = useMobileAuthStore();

  const [contactName, setContactName] = useState(user?.name || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '+380');
  const [deliveryAddress, setDeliveryAddress] = useState('м. Київ, Відділення Нової Пошти');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderNumber, setCreatedOrderNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toLocaleString('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleCheckout = async () => {
    if (!storeId || items.length === 0) return;
    setErrorMessage(null);

    if (!contactName.trim() || contactPhone.length < 5) {
      setErrorMessage("Будь ласка, вкажіть контактне ім'я та телефон");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await mobileApi.orders.createOrder({
        storeId,
        contactName,
        contactPhone,
        deliveryAddress: deliveryAddress || undefined,
        notes: notes || undefined,
        paymentMethod: 'card',
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity
        }))
      });

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
        <View className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm items-center w-full max-w-sm">
          <View className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 items-center justify-center mb-4">
            <Text className="text-3xl">✓</Text>
          </View>
          <Text className="text-xl font-black text-slate-900 mb-1">Замовлення прийнято!</Text>
          <Text className="text-sm font-bold text-blue-600 mb-2">{createdOrderNumber}</Text>
          <Text className="text-xs text-slate-500 text-center mb-6 leading-5">
            Дякуємо за покупку! Партнер отримав ваше замовлення та незабаром розпочне його збирання.
          </Text>

          <TouchableOpacity
            onPress={() => {
              setCreatedOrderNumber(null);
              onGoToOrders();
            }}
            className="w-full bg-blue-600 py-3.5 rounded-2xl items-center shadow-md mb-2"
          >
            <Text className="text-white text-sm font-bold">Переглянути замовлення</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setCreatedOrderNumber(null);
              onGoToStores();
            }}
            className="w-full bg-slate-100 py-3 rounded-2xl items-center"
          >
            <Text className="text-slate-600 text-xs font-semibold">Продовжити покупки</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Empty Cart Screen
  if (items.length === 0) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-6">
        <View className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm items-center w-full max-w-sm">
          <Text className="text-4xl mb-3">🛒</Text>
          <Text className="text-lg font-black text-slate-900 mb-1">Кошик порожній</Text>
          <Text className="text-xs text-slate-500 text-center mb-6 leading-5">
            Перейдіть до каталогу та оберіть потрібні товари для оформлення замовлення
          </Text>
          <TouchableOpacity
            onPress={onGoToStores}
            className="bg-blue-600 px-6 py-3.5 rounded-2xl items-center shadow-md"
          >
            <Text className="text-white text-xs font-bold">Перейти до магазинів</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const totalAmount = getTotalAmount();

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-xs font-bold text-blue-600 uppercase tracking-wider">
          Оформлення покупки
        </Text>
        <Text className="text-2xl font-black text-slate-900 mt-0.5">Мій кошик</Text>
      </View>

      {/* Cart Items List */}
      <View className="px-5 mt-2 space-y-3">
        {items.map((item) => (
          <View
            key={item.product.id}
            className="bg-white border border-slate-200/90 rounded-2xl p-3 flex-row items-center shadow-sm mb-2"
          >
            <View className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 items-center justify-center mr-3 overflow-hidden">
              {item.product.imageUrl ? (
                <Image
                  source={{ uri: item.product.imageUrl }}
                  className="w-full h-full"
                  resizeMode="contain"
                />
              ) : (
                <Text className="text-xl">📦</Text>
              )}
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
            <View className="flex-row items-center gap-2 bg-slate-100 rounded-xl p-1">
              <TouchableOpacity
                onPress={() => updateQuantity(item.product.id, -1)}
                className="w-7 h-7 bg-white rounded-lg items-center justify-center border border-slate-200"
              >
                <Text className="text-slate-700 font-black text-xs">-</Text>
              </TouchableOpacity>
              <Text className="text-xs font-bold text-slate-900 px-1">{item.quantity}</Text>
              <TouchableOpacity
                onPress={() => updateQuantity(item.product.id, 1)}
                className="w-7 h-7 bg-white rounded-lg items-center justify-center border border-slate-200"
              >
                <Text className="text-slate-700 font-black text-xs">+</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Checkout Form */}
      <View className="px-5 mt-4">
        <View className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
          <Text className="text-sm font-bold text-slate-900 uppercase tracking-wider text-[11px]">
            Контактні дані покупця
          </Text>

          {errorMessage && (
            <View className="p-3 bg-red-50 rounded-xl border border-red-200">
              <Text className="text-xs text-red-600 font-medium">{errorMessage}</Text>
            </View>
          )}

          <View className="space-y-1">
            <Text className="text-[11px] font-semibold text-slate-600">Ім'я одержувача *</Text>
            <TextInput
              value={contactName}
              onChangeText={setContactName}
              placeholder="Марія Бондаренко"
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
            />
          </View>

          <View className="space-y-1">
            <Text className="text-[11px] font-semibold text-slate-600">Телефон *</Text>
            <TextInput
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="+380..."
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
            />
          </View>

          <View className="space-y-1">
            <Text className="text-[11px] font-semibold text-slate-600">Адреса доставки</Text>
            <TextInput
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="м. Київ, Відділення Нової Пошти №..."
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
            />
          </View>

          <View className="space-y-1">
            <Text className="text-[11px] font-semibold text-slate-600">Примітка до замовлення</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Коментар кур'єру або побажання..."
              placeholderTextColor="#94a3b8"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
            />
          </View>

          {/* Total & Submit Button */}
          <View className="pt-3 border-t border-slate-100 mt-2">
            <View className="flex-row items-baseline justify-between mb-3">
              <Text className="text-xs text-slate-500 font-semibold">До сплати:</Text>
              <Text className="text-xl font-black text-slate-900">
                {formatPrice(totalAmount)} ₴
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleCheckout}
              disabled={isSubmitting}
              className="w-full bg-blue-600 py-3.5 rounded-2xl items-center shadow-md flex-row justify-center gap-2"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-white text-sm font-bold">Підтвердити замовлення</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
