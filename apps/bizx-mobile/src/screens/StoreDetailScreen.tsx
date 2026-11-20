import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { MaterialIcon } from '../components/MaterialIcon';
import { SafeImage } from '../components/SafeImage';
import { useMobileStoresStore } from '../store/useMobileStoresStore';
import { useCartStore } from '../store/useCartStore';
import { useMobileAuthStore } from '../store/useMobileAuthStore';
import { mobileApi } from '../lib/api';
import type { Store, StoreReviewItem, StoreMarketingSubscriptionState } from '@bizx/common-types';

interface StoreDetailScreenProps {
  store: Store;
  onBack: () => void;
  onGoToCart: () => void;
}

export const StoreDetailScreen: React.FC<StoreDetailScreenProps> = ({
  store,
  onBack,
  onGoToCart
}) => {
  const {
    storeProducts,
    storeCategories,
    selectedProductCategoryId,
    setSelectedProductCategoryId,
    isLoading
  } = useMobileStoresStore();

  const { addToCart, items, getTotalCount } = useCartStore();
  const { user } = useMobileAuthStore();
  const [section, setSection] = useState<'catalog' | 'reviews'>('catalog');
  const [reviews, setReviews] = useState<StoreReviewItem[]>([]);
  const [ratingAvg, setRatingAvg] = useState<number>(store.ratingAvg ?? 0);
  const [ratingCount, setRatingCount] = useState<number>(store.ratingCount ?? 0);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [marketingSub, setMarketingSub] = useState<StoreMarketingSubscriptionState | null>(null);
  const [isTogglingSub, setIsTogglingSub] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setMarketingSub(null);
      return;
    }
    mobileApi.broadcasts
      .getStoreMarketingSubscription(store.id)
      .then((res) => {
        if (active && res.success && res.data) setMarketingSub(res.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [store.id, user]);

  const handleToggleMarketingSub = async () => {
    if (!user || isTogglingSub) return;
    setIsTogglingSub(true);
    try {
      const res = await mobileApi.broadcasts.updateStoreMarketingSubscription(store.id, {
        subscribed: !marketingSub?.subscribed,
        source: 'storefront_button'
      });
      if (res.success && res.data) setMarketingSub(res.data);
    } catch {
      // ignore
    } finally {
      setIsTogglingSub(false);
    }
  };

  useEffect(() => {
    let active = true;
    setIsLoadingReviews(true);
    mobileApi.stores
      .getReviews(store.id)
      .then((res) => {
        if (!active || !res.success || !res.data) return;
        setReviews(res.data.reviews || []);
        setRatingAvg(res.data.ratingAvg ?? 0);
        setRatingCount(res.data.ratingCount ?? 0);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoadingReviews(false);
      });
    return () => {
      active = false;
    };
  }, [store.id]);

  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toLocaleString('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const filteredProducts = storeProducts.filter((p) => {
    if (!selectedProductCategoryId) return true;
    return p.categoryId === selectedProductCategoryId;
  });

  const getProductCartCount = (productId: string) => {
    const item = items.find((i) => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const totalCartCount = getTotalCount();

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Banner with Back Button */}
        <View className="w-full h-44 bg-slate-900 relative justify-between p-4">
          <SafeImage
            sourceUrl={store.bannerUrl}
            className="w-full h-full absolute inset-0"
            resizeMode="cover"
            fallback={
              <View className="w-full h-full bg-slate-800 absolute inset-0 items-center justify-center">
                <MaterialIcon name="storefront" size={44} color="#64748b" />
              </View>
            }
          />
          <View className="w-full h-full bg-black/40 absolute inset-0" />

          {/* Top Nav: Back button */}
          <View className="flex-row items-center justify-between z-10">
            <TouchableOpacity
              onPress={onBack}
              activeOpacity={0.8}
              className="w-9 h-9 rounded-lg bg-white/95 items-center justify-center shadow-md border border-slate-200"
            >
              <MaterialIcon name="arrow-back" size={18} color="#0f172a" />
            </TouchableOpacity>

            {totalCartCount > 0 && (
              <TouchableOpacity
                onPress={onGoToCart}
                activeOpacity={0.8}
                className="bg-slate-900 px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 shadow-md border border-slate-800"
              >
                <MaterialIcon name="shopping-cart" size={14} color="#ffffff" />
                <Text className="text-xs font-bold text-white">Кошик ({totalCartCount})</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Store Profile Card */}
        <View className="px-5 -mt-6">
          <View className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <View className="flex-row items-center gap-3">
              <View className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden items-center justify-center">
                <SafeImage
                  sourceUrl={store.logoUrl}
                  className="w-full h-full"
                  resizeMode="cover"
                  fallback={<MaterialIcon name="storefront" size={24} color="#0f172a" />}
                />
              </View>

              <View className="flex-1">
                <Text className="text-lg font-black text-slate-900">{store.name}</Text>
                <View className="flex-row items-center flex-wrap gap-2 mt-0.5">
                  <View className="flex-row items-center gap-1">
                    <MaterialIcon name="place" size={13} color="#64748b" />
                    <Text className="text-xs text-slate-500 font-medium">{store.address || 'Україна'}</Text>
                  </View>
                  {ratingCount > 0 && (
                    <View className="flex-row items-center gap-1 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                      <MaterialIcon name="star" size={12} color="#f59e0b" />
                      <Text className="text-[11px] font-black text-amber-900">
                        {Number(ratingAvg || 0).toFixed(1)}
                      </Text>
                      <Text className="text-[10px] font-medium text-amber-700">({ratingCount})</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {store.description && (
              <Text className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100 leading-4">
                {store.description}
              </Text>
            )}

            {user && store.status === 'active' && (
              <TouchableOpacity
                onPress={handleToggleMarketingSub}
                disabled={isTogglingSub}
                activeOpacity={0.8}
                className={`mt-3 py-2 px-3 rounded-lg border flex-row items-center justify-center gap-2 ${
                  marketingSub?.subscribed
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <MaterialIcon
                  name={marketingSub?.subscribed ? 'notifications-active' : 'notifications-none'}
                  size={15}
                  color={marketingSub?.subscribed ? '#059669' : '#2563eb'}
                />
                <Text
                  className={`text-xs font-bold ${
                    marketingSub?.subscribed ? 'text-emerald-800' : 'text-slate-700'
                  }`}
                >
                  {marketingSub?.subscribed
                    ? 'Ви підписані на акції закладу'
                    : 'Підписатися на розсилку акцій'}
                </Text>
              </TouchableOpacity>
            )}

            {store.phone && (
              <View className="flex-row items-center gap-1 mt-2.5">
                <MaterialIcon name="phone" size={13} color="#64748b" />
                <Text className="text-xs text-slate-500 font-medium">Телефон: {store.phone}</Text>
              </View>
            )}

            {/* Catalog / Reviews Switcher */}
            <View className="flex-row gap-2 mt-3 pt-3 border-t border-slate-100">
              <TouchableOpacity
                onPress={() => setSection('catalog')}
                className={`flex-1 py-2 rounded-lg items-center border ${
                  section === 'catalog'
                    ? 'bg-slate-900 border-slate-900'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    section === 'catalog' ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  Каталог ({storeProducts.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSection('reviews')}
                className={`flex-1 py-2 rounded-lg items-center border ${
                  section === 'reviews'
                    ? 'bg-slate-900 border-slate-900'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    section === 'reviews' ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  Відгуки ({ratingCount})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {section === 'reviews' ? (
          <View className="px-5 mt-4 space-y-2.5">
            {isLoadingReviews ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="small" color="#0f172a" />
              </View>
            ) : reviews.length > 0 ? (
              reviews.map((rev) => (
                <View
                  key={rev.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm mb-2.5"
                >
                  <View className="flex-row items-center justify-between mb-1.5">
                    <Text className="text-xs font-bold text-slate-900">
                      {rev.customerName || 'Покупець'}
                    </Text>
                    <View className="flex-row items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <MaterialIcon
                          key={star}
                          name={star <= rev.rating ? 'star' : 'star-border'}
                          size={14}
                          color={star <= rev.rating ? '#f59e0b' : '#cbd5e1'}
                        />
                      ))}
                    </View>
                  </View>
                  {rev.comment ? (
                    <Text className="text-xs text-slate-600 leading-4">{rev.comment}</Text>
                  ) : null}
                  <Text className="text-[10px] text-slate-400 mt-1.5">
                    {new Date(rev.createdAt).toLocaleDateString('uk-UA')}
                  </Text>
                </View>
              ))
            ) : (
              <View className="bg-white border border-dashed border-slate-300 rounded-xl p-8 items-center">
                <MaterialIcon name="star-border" size={28} color="#94a3b8" />
                <Text className="text-sm font-bold text-slate-700 mt-2">Відгуків ще немає</Text>
                <Text className="text-xs text-slate-400 text-center mt-1">
                  Оцінити заклад можна після отримання виконаного замовлення
                </Text>
              </View>
            )}
          </View>
        ) : (
          <>
            {/* Product Category Filter Chips */}
        {storeCategories.length > 0 && (
          <View className="my-3.5">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 6 }}
            >
              <TouchableOpacity
                onPress={() => setSelectedProductCategoryId(null)}
                className={`px-3 py-1.5 rounded-lg border ${
                  selectedProductCategoryId === null
                    ? 'bg-slate-900 border-slate-900'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    selectedProductCategoryId === null ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  Всі товари
                </Text>
              </TouchableOpacity>

              {storeCategories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setSelectedProductCategoryId(c.id)}
                  className={`px-3 py-1.5 rounded-lg border ${
                    selectedProductCategoryId === c.id
                      ? 'bg-slate-900 border-slate-900'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      selectedProductCategoryId === c.id ? 'text-white' : 'text-slate-700'
                    }`}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Products List */}
        <View className="px-5 mt-2">
          {isLoading && storeProducts.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <ActivityIndicator size="small" color="#0f172a" />
              <Text className="text-xs text-slate-400 mt-2">Завантаження товарів...</Text>
            </View>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const inCartCount = getProductCartCount(product.id);

              return (
                <View
                  key={product.id}
                  className="bg-white border border-slate-200 rounded-xl p-3 flex-row items-center shadow-sm mb-3"
                >
                  {/* Thumbnail */}
                  <View className="w-18 h-18 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden items-center justify-center mr-3 shrink-0">
                    <SafeImage
                      sourceUrl={product.imageUrl}
                      className="w-full h-full"
                      resizeMode="contain"
                      fallback={<MaterialIcon name="inventory-2" size={24} color="#94a3b8" />}
                    />
                  </View>

                  {/* Details */}
                  <View className="flex-1 pr-2 justify-between min-h-[4.5rem]">
                    <View>
                      <Text className="font-bold text-slate-900 text-xs" numberOfLines={1}>
                        {product.name}
                      </Text>
                      {product.description && (
                        <Text className="text-[11px] text-slate-400 mt-0.5" numberOfLines={2}>
                          {product.description}
                        </Text>
                      )}
                    </View>

                    <View className="flex-row items-baseline gap-2 mt-1">
                      <Text className="text-sm font-black text-slate-900">
                        {formatPrice(product.price)} ₴
                      </Text>
                      {product.oldPrice && (
                        <Text className="text-[10px] text-slate-400 line-through">
                          {formatPrice(product.oldPrice)} ₴
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Add to Cart Button */}
                  <TouchableOpacity
                    onPress={() => addToCart(product)}
                    activeOpacity={0.8}
                    className={`px-3 py-1.5 rounded-lg flex-row items-center gap-1 ${
                      inCartCount > 0
                        ? 'bg-emerald-600'
                        : 'bg-slate-900'
                    }`}
                  >
                    <Text className="text-white text-xs font-bold">
                      {inCartCount > 0 ? `+${inCartCount}` : 'В кошик'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <View className="bg-white border border-dashed border-slate-300 rounded-xl p-8 items-center justify-center">
              <Text className="text-sm font-bold text-slate-700">Товари відсутні</Text>
              <Text className="text-xs text-slate-400 mt-1">
                У цій категорії ще немає доданих позицій
              </Text>
            </View>
            )}
          </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};
