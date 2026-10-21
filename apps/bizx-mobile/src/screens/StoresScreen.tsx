import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator
} from 'react-native';
import { MaterialIcon } from '../components/MaterialIcon';
import { useMobileStoresStore } from '../store/useMobileStoresStore';
import type { Store } from '@bizx/common-types';

interface StoresScreenProps {
  onSelectStore: (store: Store) => void;
}

export const StoresScreen: React.FC<StoresScreenProps> = ({ onSelectStore }) => {
  const {
    stores,
    categories,
    selectedCategoryId,
    setSelectedCategoryId,
    searchQuery,
    setSearchQuery,
    isLoading
  } = useMobileStoresStore();

  const filteredStores = stores.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      !selectedCategoryId || s.categoryId === selectedCategoryId;
    return matchesSearch && matchesCategory;
  });

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Top Banner / Welcome */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-xs font-bold text-blue-600 uppercase tracking-wider">
          Платформа партнерських магазинів
        </Text>
        <Text className="text-2xl font-black text-slate-900 mt-0.5">
          Каталог закладів
        </Text>
      </View>

      {/* Search Input */}
      <View className="px-5 my-3">
        <View className="bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm flex-row items-center">
          <MaterialIcon name="search" size={20} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Пошук магазину за назвою або містом..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-sm text-slate-800 p-0"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcon name="close" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories Horizontal Carousel */}
      <View className="my-2">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          <TouchableOpacity
            onPress={() => setSelectedCategoryId(null)}
            className={`px-4 py-2 rounded-xl border ${
              selectedCategoryId === null
                ? 'bg-blue-600 border-blue-600 shadow-sm'
                : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                selectedCategoryId === null ? 'text-white' : 'text-slate-700'
              }`}
            >
              Всі заклади
            </Text>
          </TouchableOpacity>

          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setSelectedCategoryId(c.id)}
              className={`px-4 py-2 rounded-xl border ${
                selectedCategoryId === c.id
                  ? 'bg-blue-600 border-blue-600 shadow-sm'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  selectedCategoryId === c.id ? 'text-white' : 'text-slate-700'
                }`}
              >
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Stores List */}
      <View className="px-5 mt-3 space-y-4">
        {isLoading && stores.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-xs text-slate-400 mt-3 font-medium">Завантаження магазинів...</Text>
          </View>
        ) : filteredStores.length > 0 ? (
          filteredStores.map((store) => (
            <TouchableOpacity
              key={store.id}
              activeOpacity={0.85}
              onPress={() => onSelectStore(store)}
              className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm mb-3"
            >
              {/* Store Banner */}
              <View className="w-full h-36 bg-slate-800 relative justify-end">
                {store.bannerUrl ? (
                  <Image
                    source={{ uri: store.bannerUrl }}
                    className="w-full h-full absolute inset-0"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-full h-full bg-slate-800 absolute inset-0 items-center justify-center">
                    <MaterialIcon name="storefront" size={48} color="#475569" />
                  </View>
                )}
                <View className="w-full h-full bg-black/25 absolute inset-0" />

                {/* Status Badge */}
                <View className="absolute top-3 right-3 bg-white/95 px-2.5 py-1 rounded-full shadow-sm">
                  <Text className="text-[10px] font-black text-emerald-600 uppercase">
                    Працює
                  </Text>
                </View>
              </View>

              {/* Store Header with Logo */}
              <View className="p-4 pt-3">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-lg font-black text-slate-900">
                      {store.name}
                    </Text>
                    {store.description && (
                      <Text
                        numberOfLines={2}
                        className="text-xs text-slate-500 mt-1 leading-4"
                      >
                        {store.description}
                      </Text>
                    )}
                  </View>

                  {/* Logo thumbnail */}
                  <View className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden items-center justify-center -mt-8 shadow-sm">
                    {store.logoUrl ? (
                      <Image
                        source={{ uri: store.logoUrl }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <MaterialIcon name="storefront" size={24} color="#2563eb" />
                    )}
                  </View>
                </View>

                {/* Address & Phone */}
                <View className="mt-3 pt-3 border-t border-slate-100 flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1 mr-2 gap-1">
                    <MaterialIcon name="place" size={14} color="#64748b" />
                    <Text className="text-xs text-slate-500 font-medium" numberOfLines={1}>
                      {store.address || 'Україна'}
                    </Text>
                  </View>
                  <Text className="text-xs font-bold text-blue-600">
                    Переглянути товари →
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 items-center justify-center">
            <View className="w-16 h-16 rounded-2xl bg-slate-100 items-center justify-center mb-3">
              <MaterialIcon name="search-off" size={32} color="#94a3b8" />
            </View>
            <Text className="text-sm font-bold text-slate-700">Магазинів не знайдено</Text>
            <Text className="text-xs text-slate-400 text-center mt-1">
              Спробуйте змінити пошуковий запит або обрати іншу категорію
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};
