import React from 'react';
import { SafeAreaView, Text, View, TouchableOpacity, StatusBar } from 'react-native';
import './global.css';
import { useMobileStore } from './src/store/useMobileStore';

export default function App() {
  const { count, increment, reset } = useMobileStore();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center p-6">
      <StatusBar barStyle="dark-content" />

      <View className="w-full max-w-sm bg-white p-6 rounded-2xl border border-slate-200 shadow-sm items-center">
        <Text className="text-2xl font-bold text-slate-900 mb-2">BizX Mobile</Text>
        <Text className="text-sm text-slate-500 text-center mb-6">
          Чистый шаблон на Expo SDK 52 + React Native + NativeWind v4 + Zustand.
        </Text>

        <View className="bg-slate-100 px-6 py-3 rounded-xl mb-6 items-center w-full">
          <Text className="text-xs uppercase font-semibold text-slate-400">Счетчик Zustand</Text>
          <Text className="text-3xl font-black text-blue-600 mt-1">{count}</Text>
        </View>

        <View className="flex-row gap-3 w-full">
          <TouchableOpacity
            className="flex-1 bg-blue-600 py-3 rounded-xl items-center"
            onPress={increment}
          >
            <Text className="text-white font-semibold text-sm">+ Прибавить</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 bg-slate-200 py-3 rounded-xl items-center"
            onPress={reset}
          >
            <Text className="text-slate-700 font-semibold text-sm">Сброс</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
