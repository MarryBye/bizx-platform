import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator
} from 'react-native';
import { useMobileStoresStore } from '../store/useMobileStoresStore';
import { useMobileAuthStore } from '../store/useMobileAuthStore';

interface OrdersScreenProps {
  onGoToProfile: () => void;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({ onGoToProfile }) => {
  const { myOrders, fetchMyOrders, isLoading } = useMobileStoresStore();
  const { user } = useMobileAuthStore();

  useEffect(() => {
    if (user) {
      void fetchMyOrders();
    }
  }, [user, fetchMyOrders]);

  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toLocaleString('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Оплачено';
      case 'confirmed':
        return 'Підтверджено';
      case 'shipped':
        return 'Відправлено';
      case 'delivered':
        return 'Доставлено';
      case 'cancelled':
        return 'Скасовано';
      case 'pending':
      default:
        return 'В обробці';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'delivered':
        return 'bg-emerald-100 text-emerald-700';
      case 'confirmed':
      case 'shipped':
        return 'bg-blue-100 text-blue-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'pending':
      default:
        return 'bg-amber-100 text-amber-700';
    }
  };

  if (!user) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-6">
        <View className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm items-center w-full max-w-sm">
          <Text className="text-4xl mb-3">📋</Text>
          <Text className="text-lg font-black text-slate-900 mb-1">Історія покупок</Text>
          <Text className="text-xs text-slate-500 text-center mb-6 leading-5">
            Увійдіть у свій обліковий запис, щоб переглядати історію замовлень та відстежувати їхній статус
          </Text>
          <TouchableOpacity
            onPress={onGoToProfile}
            className="bg-blue-600 px-6 py-3.5 rounded-2xl items-center shadow-md w-full"
          >
            <Text className="text-white text-xs font-bold">Увійти в кабінет</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-xs font-bold text-blue-600 uppercase tracking-wider">
          Історія покупок
        </Text>
        <Text className="text-2xl font-black text-slate-900 mt-0.5">Мої замовлення</Text>
      </View>

      <View className="px-5 mt-3 space-y-3">
        {myOrders.length > 0 ? (
          myOrders.map((order) => (
            <View
              key={order.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm mb-3"
            >
              <View className="flex-row items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <Text className="font-black text-slate-900 text-sm">{order.orderNumber}</Text>
                  <Text className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('uk-UA')}
                  </Text>
                </div>

                <View className={`px-2.5 py-1 rounded-full ${getStatusColor(order.status)}`}>
                  <Text className="text-[10px] font-bold uppercase">{getStatusText(order.status)}</Text>
                </View>
              </View>

              <View className="pt-3 flex-row items-center justify-between">
                <div>
                  <Text className="text-xs font-semibold text-slate-700">
                    {order.storeName || 'Магазин BizX'}
                  </Text>
                  <Text className="text-[11px] text-slate-400">
                    {order.itemsCount} {order.itemsCount === 1 ? 'товар' : 'товари'}
                  </Text>
                </div>

                <Text className="text-base font-black text-slate-900">
                  {formatPrice(order.totalAmount)} ₴
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 items-center justify-center">
            <Text className="text-3xl mb-2">🛍️</Text>
            <Text className="text-sm font-bold text-slate-700">Замовлень ще немає</Text>
            <Text className="text-xs text-slate-400 mt-1 text-center">
              Зробіть першу покупку в каталозі закладів
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};
