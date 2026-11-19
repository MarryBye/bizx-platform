import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { MaterialIcon } from '../components/MaterialIcon';
import { MobileBadge, MobileCountBadge, getOrderStatusMeta } from '../components/MobileBadge';
import { useMobileStoresStore } from '../store/useMobileStoresStore';
import { useMobileAuthStore } from '../store/useMobileAuthStore';
import type { CustomerOrderSummary } from '@bizx/api-client';

interface OrdersScreenProps {
  onGoToProfile?: () => void;
  onExploreStores?: () => void;
  onSelectOrder: (order: CustomerOrderSummary) => void;
}

export const OrdersScreen: React.FC<OrdersScreenProps> = ({
  onGoToProfile,
  onExploreStores,
  onSelectOrder
}) => {
  const { myOrders, fetchMyOrders, fetchUnreadSummary } = useMobileStoresStore();
  const { user } = useMobileAuthStore();

  useEffect(() => {
    if (user) {
      void fetchMyOrders();
      void fetchUnreadSummary();
    }
  }, [user, fetchMyOrders, fetchUnreadSummary]);

  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toLocaleString('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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
            Увійдіть у свій обліковий запис, щоб переглядати історію замовлень, спілкуватись із підтримкою та залишати відгуки
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
      <View className="px-5 pt-4 pb-2 flex-row items-end justify-between">
        <View>
          <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Історія покупок
          </Text>
          <Text className="text-2xl font-black text-slate-900 mt-0.5">Мої замовлення</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            void fetchMyOrders();
            void fetchUnreadSummary();
          }}
          className="w-9 h-9 rounded-lg bg-white border border-slate-200 items-center justify-center shadow-sm"
        >
          <MaterialIcon name="refresh" size={18} color="#334155" />
        </TouchableOpacity>
      </View>

      <View className="px-5 mt-3 space-y-3">
        {myOrders.length > 0 ? (
          myOrders.map((order) => {
            const unread = order.unreadCount || 0;
            const hasActiveDispute = Boolean(order.activeDispute);
            const hasPendingRefund = order.refundOfferStatus === 'pending_customer';

            return (
              <TouchableOpacity
                key={order.id}
                activeOpacity={0.8}
                onPress={() => onSelectOrder(order)}
                className={`bg-white border rounded-xl p-4 shadow-sm mb-3 ${
                  hasActiveDispute
                    ? 'border-red-300'
                    : hasPendingRefund
                    ? 'border-emerald-300'
                    : 'border-slate-200'
                }`}
              >
                <View className="flex-row items-center justify-between border-b border-slate-100 pb-2.5">
                  <View className="flex-row items-center gap-2">
                    <View>
                      <Text className="font-black text-slate-900 text-xs font-mono">
                        {order.orderNumber}
                      </Text>
                      <Text className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString('uk-UA')}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-1.5">
                    <MobileCountBadge count={unread} tone="blue" iconName="chat-bubble" />
                    {(() => {
                      const st = getOrderStatusMeta(order.status);
                      return <MobileBadge tone={st.tone} label={st.label} uppercase />;
                    })()}
                  </View>
                </View>

                <View className="pt-3 flex-row items-center justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-xs font-semibold text-slate-800" numberOfLines={1}>
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

                {/* Status highlights & chat CTA */}
                <View className="mt-2.5 pt-2.5 border-t border-slate-100 flex-row items-center justify-between flex-wrap gap-1.5">
                  <View className="flex-row items-center gap-1.5 flex-wrap">
                    {hasActiveDispute && (
                      <MobileBadge
                        tone="rose"
                        iconName="report-problem"
                        label={
                          order.activeDispute?.status === 'escalated_platform'
                            ? 'На розгляді BizX'
                            : 'Відкрито спір'
                        }
                      />
                    )}
                    {hasPendingRefund && (
                      <MobileBadge
                        tone="emerald"
                        iconName="currency-exchange"
                        label="Підтвердіть повернення"
                      />
                    )}
                    {order.review && (
                      <MobileBadge
                        tone="amber"
                        iconName="star"
                        label={`${order.review.rating}/5`}
                      />
                    )}
                    {order.status === 'delivered' && !order.review && (
                      <MobileBadge tone="slate" iconName="star-border" label="Оцінити" />
                    )}
                  </View>

                  <View className="flex-row items-center gap-1">
                    <Text className="text-[11px] font-bold text-slate-700">Деталі та чат</Text>
                    <MaterialIcon name="chevron-right" size={16} color="#475569" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
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
