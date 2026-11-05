import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { MaterialIcon } from '../components/MaterialIcon';
import { useMobileAuthStore } from '../store/useMobileAuthStore';

export const AuthScreen: React.FC = () => {
  const { login, register, isLoading, error } = useMobileAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLocalError(null);

    if (!email.trim() || !password.trim()) {
      setLocalError('Будь ласка, заповніть email та пароль');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setLocalError("Будь ласка, введіть ваше повне ім'я");
        return;
      }
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role: 'client'
      });
    } else {
      await login({
        email: email.trim(),
        password
      });
    }
  };

  const displayError = localError || error;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-slate-50"
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 20,
          paddingVertical: 40
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-sm mx-auto">
          {/* Main Card */}
          <View className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Header Accent Bar */}
            <View className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="px-2 py-0.5 rounded bg-slate-900">
                  <Text className="text-[10px] font-black text-white tracking-wider">
                    BIZX ID
                  </Text>
                </View>
                <Text className="text-xs font-bold text-slate-600">
                  Мобільний клієнт
                </Text>
              </View>
              <MaterialIcon name="shield" size={16} color="#64748b" />
            </View>

            {/* Mode Switcher Tabs */}
            <View className="flex-row border-b border-slate-200 bg-white">
              <TouchableOpacity
                onPress={() => {
                  setMode('login');
                  setLocalError(null);
                }}
                activeOpacity={0.7}
                className={`flex-1 py-3 items-center border-b-2 ${
                  mode === 'login'
                    ? 'border-slate-900 bg-slate-50/50'
                    : 'border-transparent'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    mode === 'login' ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Вхід
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setMode('register');
                  setLocalError(null);
                }}
                activeOpacity={0.7}
                className={`flex-1 py-3 items-center border-b-2 ${
                  mode === 'register'
                    ? 'border-slate-900 bg-slate-50/50'
                    : 'border-transparent'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    mode === 'register' ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  Реєстрація
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Body */}
            <View className="p-6">
              <View className="mb-5">
                <Text className="text-xl font-black text-slate-900 tracking-tight">
                  {mode === 'login' ? 'Вхід у додаток' : 'Створення акаунту'}
                </Text>
                <Text className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {mode === 'login'
                    ? 'Введіть email та пароль вашого акаунту BizX'
                    : 'Зареєструйте новий клієнтський акаунт для замовлень'}
                </Text>
              </View>

              {/* Error Banner */}
              {displayError && (
                <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex-row items-start gap-2">
                  <MaterialIcon
                    name="error-outline"
                    size={16}
                    color="#dc2626"
                    style={{ marginTop: 2 }}
                  />
                  <Text className="text-xs text-red-700 flex-1 leading-snug">
                    {displayError}
                  </Text>
                </View>
              )}

              {/* Form Fields */}
              <View className="space-y-3.5">
                {mode === 'register' && (
                  <View>
                    <Text className="text-xs font-bold text-slate-700 mb-1">
                      Повне ім&apos;я
                    </Text>
                    <View className="flex-row items-center border border-slate-300 rounded-xl px-3 py-2 bg-white">
                      <MaterialIcon
                        name="person-outline"
                        size={18}
                        color="#94a3b8"
                      />
                      <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder="Тарас Шевченко"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="words"
                        className="flex-1 ml-2 text-xs text-slate-900 font-medium"
                      />
                    </View>
                  </View>
                )}

                <View>
                  <Text className="text-xs font-bold text-slate-700 mb-1">
                    Електронна пошта
                  </Text>
                  <View className="flex-row items-center border border-slate-300 rounded-xl px-3 py-2 bg-white">
                    <MaterialIcon name="mail-outline" size={18} color="#94a3b8" />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="name@example.com"
                      placeholderTextColor="#94a3b8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className="flex-1 ml-2 text-xs text-slate-900 font-medium"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-xs font-bold text-slate-700 mb-1">
                    Пароль доступу
                  </Text>
                  <View className="flex-row items-center border border-slate-300 rounded-xl px-3 py-2 bg-white">
                    <MaterialIcon name="lock-outline" size={18} color="#94a3b8" />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry
                      autoCapitalize="none"
                      className="flex-1 ml-2 text-xs text-slate-900 font-medium"
                    />
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isLoading}
                  activeOpacity={0.8}
                  className="w-full mt-3 py-3.5 bg-slate-900 rounded-xl items-center justify-center flex-row gap-2 shadow-sm"
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Text className="text-xs font-bold text-white">
                        {mode === 'login' ? 'Увійти в акаунт' : 'Зареєструватися'}
                      </Text>
                      <MaterialIcon
                        name="arrow-forward"
                        size={16}
                        color="#ffffff"
                      />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Notice */}
              <View className="mt-5 pt-4 border-t border-slate-100 items-center">
                <Text className="text-[11px] text-slate-400 text-center">
                  Єдиний обліковий запис BizX ID для веб-сайту та мобільного додатку
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
