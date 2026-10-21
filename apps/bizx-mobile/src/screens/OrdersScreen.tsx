import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { MaterialIcon } from '../components/MaterialIcon';
import { useMobileStoresStore } from '../store/useMobileStoresStore';
import { useMobileAuthStore } from '../store/useMobileAuthStore';

interface OrdersScreenProps {
  onGoToProfile?: () => void;
  onExploreStores?: () => void;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({ onGoToProfile, onExploreStores }) => {
  const { myOrders, fetchMyOrders } = useMobileStoresStore();
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
      case 'pending':
      default:
        return 'Очікує підтвердження';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'shipped':
      case 'confirmed':
        return 'bg-slate-100 text-slate-800 border border-slate-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'pending':
      default:
        return 'bg-amber-50 text-amber-700 border border-amber-200';
    }
  };

  if (!user) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-6">
        <View className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm items-center w-full max-w-sm">
          <View className="w-14 h-14 rounded-xl bg-slate-100 items-center justify-center mb-4">
            <MaterialIcon name="receipt-long" size={28} color="#94a3b8" />
          </View>
          <Text className="text-base font-black text-slate-900 mb-1">Історія покупок</Text>
          <Text className="text-xs text-slate-500 text-center mb-6 leading-5">
            Увійдіть у свій обліковий запис, щоб переглядати історію замовлень та відстежувати їхній статус
          </Text>
          <TouchableOpacity
            onPress={onGoToProfile}
            className="bg-slate-900 px-5 py-3 rounded-lg items-center shadow-sm w-full"
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
        <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Історія покупок
        </Text>
        <Text className="text-2xl font-black text-slate-900 mt-0.5">Мої замовлення</Text>
      </View>

      <View className="px-5 mt-3 space-y-3">
        {myOrders.length > 0 ? (
          myOrders.map((order) => (
            <View
              key={order.id}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-3"
            >
              <View className="flex-row items-center justify-between border-b border-slate-100 pb-2.5">
                <View>
                  <Text className="font-black text-slate-900 text-xs font-mono">{order.orderNumber}</Text>
                  <Text className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString('uk-UA')}
                  </Text>
                </View>

                <View className={`px-2 py-0.5 rounded ${getStatusColor(order.status)}`}>
                  <Text className="text-[10px] font-bold uppercase">{getStatusText(order.status)}</Text>
                </View>
              </View>

              <View className="pt-3 flex-row items-center justify-between">
                <View>
                  <Text className="text-xs font-semibold text-slate-800">
                    {order.storeName || 'Магазин BizX'}
                  </Text>
                  <Text className="text-[11px] text-slate-400">
                    {order.itemsCount} {order.itemsCount === 1 ? 'позиція' : 'позиції'}
                  </Text>
                </View>

                <Text className="text-sm font-black text-slate-900">
                  {formatPrice(order.totalAmount)} ₴
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View className="bg-white border border-dashed border-slate-300 rounded-xl p-8 items-center justify-center">
            <View className="w-12 h-12 rounded-xl bg-slate-100 items-center justify-center mb-2">
              <MaterialIcon name="shopping-bag" size={24} color="#94a3b8" />
            </View>
            <Text className="text-sm font-bold text-slate-700">Замовлень ще немає</Text>
            <Text className="text-xs text-slate-400 mt-1 text-center mb-4">
              Зробіть першу покупку в каталозі закладів
            </Text>
            {onExploreStores && (
              <TouchableOpacity
                onPress={onExploreStores}
                className="bg-slate-900 px-4 py-2 rounded-lg items-center shadow-sm"
              >
                <Text className="text-white text-xs font-bold">Перейти до магазинів</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
};
