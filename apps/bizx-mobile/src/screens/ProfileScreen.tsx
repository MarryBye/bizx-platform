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
import { useMobileAuthStore } from '../store/useMobileAuthStore';

export const ProfileScreen: React.FC = () => {
  const { user, login, register, logout, isLoading, error } = useMobileAuthStore();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleAuthSubmit = async () => {
    if (!email.trim() || !password.trim()) return;

    if (isRegisterMode) {
      if (!name.trim()) return;
      await register({ name, email, password, role: 'client' });
    } else {
      await login({ email, password });
    }
  };

  // Logged In View
  if (user) {
    return (
      <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            Особистий кабінет
          </Text>
          <Text className="text-2xl font-black text-slate-900 mt-0.5">Мій профіль</Text>
        </View>

        {/* User Card */}
        <View className="px-5 mt-3">
          <View className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm items-center">
            <View className="w-20 h-20 rounded-full bg-blue-100 border-2 border-white shadow-sm overflow-hidden items-center justify-center mb-3">
              {user.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Text className="text-3xl">👤</Text>
              )}
            </View>

            <Text className="text-lg font-black text-slate-900">{user.name}</Text>
            <Text className="text-xs text-slate-500 mt-0.5">{user.email}</Text>
            {user.phone && <Text className="text-xs text-slate-500 mt-0.5">{user.phone}</Text>}

            <View className="mt-3 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">
              <Text className="text-[10px] font-bold text-blue-700 uppercase">
                Покупець (Client)
              </Text>
            </View>
          </View>
        </View>

        {/* Extra Stub Menus */}
        <View className="px-5 mt-5 space-y-2.5">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Налаштування та сервіси
          </Text>

          <TouchableOpacity
            activeOpacity={0.7}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 flex-row items-center justify-between shadow-sm mb-2"
          >
            <View className="flex-row items-center gap-3">
              <Text className="text-xl">❤️</Text>
              <div>
                <Text className="text-sm font-bold text-slate-800">Обрані магазини</Text>
                <Text className="text-[11px] text-slate-400">Список улюблених партнерів</Text>
              </div>
            </View>
            <Text className="text-xs font-bold text-slate-400">Скоро →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 flex-row items-center justify-between shadow-sm mb-2"
          >
            <View className="flex-row items-center gap-3">
              <Text className="text-xl">🔔</Text>
              <div>
                <Text className="text-sm font-bold text-slate-800">Сповіщення</Text>
                <Text className="text-[11px] text-slate-400">Акції, знижки та статус замовлень</Text>
              </div>
            </View>
            <Text className="text-xs font-bold text-slate-400">Скоро →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 flex-row items-center justify-between shadow-sm mb-2"
          >
            <View className="flex-row items-center gap-3">
              <Text className="text-xl">💳</Text>
              <div>
                <Text className="text-sm font-bold text-slate-800">Збережені картки</Text>
                <Text className="text-[11px] text-slate-400">Безпечна оплата в 1 клік</Text>
              </div>
            </View>
            <Text className="text-xs font-bold text-slate-400">Скоро →</Text>
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity
            onPress={logout}
            className="bg-red-50 border border-red-200 p-4 rounded-2xl items-center mt-4"
          >
            <Text className="text-xs font-bold text-red-600">Вийти з облікового запису</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Guest / Auth Form
  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-xs font-bold text-blue-600 uppercase tracking-wider">
          Вхід для покупців
        </Text>
        <Text className="text-2xl font-black text-slate-900 mt-0.5">Особистий кабінет</Text>
      </View>

      <View className="px-5 mt-3 space-y-4">
        {/* Auth Card */}
        <View className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
          {/* Tabs */}
          <View className="flex-row bg-slate-100 p-1 rounded-xl">
            <TouchableOpacity
              onPress={() => setIsRegisterMode(false)}
              className={`flex-1 py-2 rounded-lg items-center ${
                !isRegisterMode ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  !isRegisterMode ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                Вхід
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsRegisterMode(true)}
              className={`flex-1 py-2 rounded-lg items-center ${
                isRegisterMode ? 'bg-white shadow-sm' : ''
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isRegisterMode ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                Реєстрація
              </Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View className="p-3 bg-red-50 rounded-xl border border-red-200">
              <Text className="text-xs text-red-600 font-medium">{error}</Text>
            </View>
          )}

          {isRegisterMode && (
            <View className="space-y-1">
              <Text className="text-[11px] font-semibold text-slate-600">Ваше ім'я *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Іван Петренко"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
              />
            </View>
          )}

          <View className="space-y-1">
            <Text className="text-[11px] font-semibold text-slate-600">Email *</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="user@example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
            />
          </View>

          <View className="space-y-1">
            <Text className="text-[11px] font-semibold text-slate-600">Пароль *</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
            />
          </View>

          <TouchableOpacity
            onPress={handleAuthSubmit}
            disabled={isLoading}
            className="w-full bg-blue-600 py-3.5 rounded-2xl items-center shadow-md flex-row justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white text-xs font-bold">
                {isRegisterMode ? 'Зареєструватися' : 'Увійти'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};
