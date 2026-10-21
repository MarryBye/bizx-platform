import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator
} from 'react-native';
import { MaterialIcon } from '../components/MaterialIcon';
import { SafeImage } from '../components/SafeImage';
import { useMobileStoresStore } from '../store/useMobileStoresStore';
import { useCartStore } from '../store/useCartStore';
import type { Store } from '@bizx/common-types';

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
                <MaterialIcon name="storefront" size={48} color="#475569" />
              </View>
            }
          />
          <View className="w-full h-full bg-black/40 absolute inset-0" />

          {/* Top Nav: Back button */}
          <View className="flex-row items-center justify-between z-10">
            <TouchableOpacity
              onPress={onBack}
              className="w-10 h-10 rounded-full bg-white/95 items-center justify-center shadow-md"
            >
              <MaterialIcon name="arrow-back" size={20} color="#1e293b" />
            </TouchableOpacity>

            {totalCartCount > 0 && (
              <TouchableOpacity
                onPress={onGoToCart}
                className="bg-blue-600 px-3.5 py-2 rounded-full flex-row items-center gap-1.5 shadow-md"
              >
                <MaterialIcon name="shopping-cart" size={14} color="#ffffff" />
                <Text className="text-xs font-bold text-white">Кошик ({totalCartCount})</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Store Profile Card */}
        <View className="px-5 -mt-6">
          <View className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm">
            <View className="flex-row items-center gap-3">
              <View className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden items-center justify-center">
                <SafeImage
                  sourceUrl={store.logoUrl}
                  className="w-full h-full"
                  resizeMode="cover"
                  fallback={<MaterialIcon name="storefront" size={24} color="#2563eb" />}
                />
              </View>

              <View className="flex-1">
                <Text className="text-xl font-black text-slate-900">{store.name}</Text>
                <View className="flex-row items-center gap-1 mt-0.5">
                  <MaterialIcon name="place" size={13} color="#64748b" />
                  <Text className="text-xs text-slate-500 font-medium">{store.address || 'Україна'}</Text>
                </View>
              </View>
            </View>

            {store.description && (
              <Text className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100 leading-4">
                {store.description}
              </Text>
            )}

            {store.phone && (
              <View className="flex-row items-center gap-1 mt-2.5">
                <MaterialIcon name="phone" size={13} color="#64748b" />
                <Text className="text-xs text-slate-500 font-medium">Телефон: {store.phone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Product Category Filter Chips */}
        {storeCategories.length > 0 && (
          <View className="my-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            >
              <TouchableOpacity
                onPress={() => setSelectedProductCategoryId(null)}
                className={`px-3.5 py-1.5 rounded-xl border ${
                  selectedProductCategoryId === null
                    ? 'bg-blue-600 border-blue-600'
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
                  className={`px-3.5 py-1.5 rounded-xl border ${
                    selectedProductCategoryId === c.id
                      ? 'bg-blue-600 border-blue-600'
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
              <ActivityIndicator size="small" color="#2563eb" />
              <Text className="text-xs text-slate-400 mt-2">Завантаження товарів...</Text>
            </View>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const inCartCount = getProductCartCount(product.id);

              return (
                <View
                  key={product.id}
                  className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex-row items-center shadow-sm mb-3"
                >
                  {/* Thumbnail */}
                  <View className="w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden items-center justify-center mr-3 shrink-0">
                    <SafeImage
                      sourceUrl={product.imageUrl}
                      className="w-full h-full"
                      resizeMode="contain"
                      fallback={<MaterialIcon name="inventory-2" size={24} color="#94a3b8" />}
                    />
                  </View>

                  {/* Details */}
                  <View className="flex-1 pr-2 justify-between h-20">
                    <div>
                      <Text className="font-bold text-slate-900 text-sm" numberOfLines={1}>
                        {product.name}
                      </Text>
                      {product.description && (
                        <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={2}>
                          {product.description}
                        </Text>
                      )}
                    </div>

                    <View className="flex-row items-baseline gap-2">
                      <Text className="text-base font-black text-slate-900">
                        {formatPrice(product.price)} ₴
                      </Text>
                      {product.oldPrice && (
                        <Text className="text-xs text-slate-400 line-through">
                          {formatPrice(product.oldPrice)} ₴
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Add to Cart Button */}
                  <TouchableOpacity
                    onPress={() => addToCart(product)}
                    className={`px-3 py-2 rounded-xl flex-row items-center gap-1 ${
                      inCartCount > 0 ? 'bg-emerald-600' : 'bg-blue-600'
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
            <View className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 items-center justify-center">
              <Text className="text-sm font-bold text-slate-700">Товари відсутні</Text>
              <Text className="text-xs text-slate-400 mt-1">
                У цій категорії ще немає доданих позицій
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};
