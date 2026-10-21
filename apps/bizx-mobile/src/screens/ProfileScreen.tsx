import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { MaterialIcon } from '../components/MaterialIcon';
import { SafeImage } from '../components/SafeImage';
import { useMobileAuthStore } from '../store/useMobileAuthStore';

export const ProfileScreen: React.FC = () => {
  const { user, login, register, updateProfile, logout, isLoading, error } = useMobileAuthStore();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Minimal profile edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
    }
  }, [user]);

  const handleAuthSubmit = async () => {
    if (!email.trim() || !password.trim()) return;

    if (isRegisterMode) {
      if (!name.trim()) return;
      await register({ name, email, password, role: 'client' });
    } else {
      await login({ email, password });
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const ok = await updateProfile({
        name: editName.trim(),
        phone: editPhone.trim()
      });
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Logged In View
  if (user) {
    return (
      <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Metro Header */}
        <View className="px-5 pt-4 pb-2">
          <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Особистий кабінет BizX
          </Text>
          <Text className="text-2xl font-black text-slate-900 mt-0.5">Мій профіль</Text>
        </View>

        {/* User Badge Tile */}
        <View className="px-5 mt-3">
          <View className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex-row items-center gap-3.5">
            <View className="w-14 h-14 rounded-full bg-slate-900 border border-slate-200 overflow-hidden items-center justify-center shrink-0">
              <SafeImage
                sourceUrl={user.avatarUrl}
                className="w-full h-full"
                resizeMode="cover"
                fallback={<Text className="text-white font-black text-lg">{user.name?.[0] || 'U'}</Text>}
              />
            </View>

            <View className="flex-1 min-w-0">
              <Text className="text-base font-black text-slate-900" numberOfLines={1}>
                {user.name}
              </Text>
              <Text className="text-xs text-slate-500 font-mono" numberOfLines={1}>
                {user.email}
              </Text>
              <View className="mt-1.5 self-start px-2 py-0.5 bg-slate-100 border border-slate-200 rounded">
                <Text className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Клієнт BizX
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Minimal Edit Profile Form */}
        <View className="px-5 mt-4">
          <View className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3.5">
            <View className="border-b border-slate-100 pb-2 flex-row items-center justify-between">
              <Text className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Налаштування даних
              </Text>
              {saveSuccess && (
                <View className="flex-row items-center gap-1">
                  <MaterialIcon name="check-circle" size={14} color="#059669" />
                  <Text className="text-[11px] font-bold text-emerald-600">Збережено</Text>
                </View>
              )}
            </View>

            <View className="space-y-1">
              <Text className="text-[11px] font-bold text-slate-600">Ім&apos;я користувача</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Ваше ім'я"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium"
              />
            </View>

            <View className="space-y-1">
              <Text className="text-[11px] font-bold text-slate-600">Контактний телефон</Text>
              <TextInput
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+380..."
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium"
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={isSaving}
              activeOpacity={0.8}
              className="w-full bg-slate-900 py-2.5 rounded-lg items-center shadow-sm flex-row justify-center gap-1.5 mt-1"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <MaterialIcon name="save" size={14} color="#ffffff" />
                  <Text className="text-white text-xs font-bold">Зберегти зміни</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Portal Referral Note */}
        <View className="px-5 mt-4">
          <View className="bg-slate-100/80 border border-slate-200 rounded-xl p-4">
            <View className="flex-row items-center gap-2 mb-1.5">
              <MaterialIcon name="shield" size={16} color="#0f172a" />
              <Text className="text-xs font-bold text-slate-900">
                Центр безпеки та бізнесів
              </Text>
            </View>
            <Text className="text-[11px] text-slate-600 leading-relaxed">
              Зміна пароля, двофакторна автентифікація (2FA), керування вашими магазинами та інтеграціями доступні через веб-портал:
            </Text>
            <Text className="text-xs font-bold text-slate-900 font-mono mt-1">
              bizx.ua/account
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <View className="px-5 mt-4">
          <TouchableOpacity
            onPress={logout}
            activeOpacity={0.7}
            className="bg-white border border-slate-200 py-3 rounded-xl items-center flex-row justify-center gap-1.5"
          >
            <MaterialIcon name="logout" size={16} color="#dc2626" />
            <Text className="text-xs font-bold text-red-600">Вийти з облікового запису</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Guest / Auth Form
  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Metro Header */}
      <View className="px-5 pt-4 pb-2">
        <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Вхід для покупців
        </Text>
        <Text className="text-2xl font-black text-slate-900 mt-0.5">Особистий кабінет</Text>
      </View>

      <View className="px-5 mt-3 space-y-4">
        {/* Auth Card */}
        <View className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
          {/* Tabs */}
          <View className="flex-row bg-slate-100 p-1 rounded-lg">
            <TouchableOpacity
              onPress={() => setIsRegisterMode(false)}
              className={`flex-1 py-2 rounded-md items-center ${
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
              className={`flex-1 py-2 rounded-md items-center ${
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
            <View className="p-3 bg-red-50 rounded-lg border border-red-200">
              <Text className="text-xs text-red-600 font-medium">{error}</Text>
            </View>
          )}

          {isRegisterMode && (
            <View className="space-y-1">
              <Text className="text-[11px] font-bold text-slate-700">Ваше ім&apos;я *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Іван Петренко"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900"
              />
            </View>
          )}

          <View className="space-y-1">
            <Text className="text-[11px] font-bold text-slate-700">Email *</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="user@example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900"
            />
          </View>

          <View className="space-y-1">
            <Text className="text-[11px] font-bold text-slate-700">Пароль *</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900"
            />
          </View>

          <TouchableOpacity
            onPress={handleAuthSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
            className="w-full bg-slate-900 py-3 rounded-lg items-center shadow-sm flex-row justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white text-xs font-bold">
                {isRegisterMode ? 'Зареєструватися' : 'Увійти в кабінет'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};
