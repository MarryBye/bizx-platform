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
import { MobilePhoneInput } from '../components/MobilePhoneInput';
import { useMobileAuthStore } from '../store/useMobileAuthStore';
import { useMobileTranslation } from '../hooks/useMobileTranslation';

export const AuthScreen: React.FC = () => {
  const { login, register, isLoading, error } = useMobileAuthStore();
  const { t, locale } = useMobileTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLocalError(null);

    if (mode === 'register') {
      if (!name.trim() || !email.trim() || !password.trim()) {
        setLocalError(t('errors.invalidCredentials'));
        return;
      }
      await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        role: 'client'
      });
    } else if (loginMethod === 'phone') {
      if (!phone.trim() || !password.trim()) {
        setLocalError(t('errors.invalidPhone'));
        return;
      }
      await login({
        phone: phone.trim(),
        password
      });
    } else {
      if (!email.trim() || !password.trim()) {
        setLocalError(t('errors.invalidCredentials'));
        return;
      }
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
                  {locale === 'en' ? 'Mobile App' : 'Мобільний клієнт'}
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
                  {t('common.login')}
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
                  {t('common.register')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Body */}
            <View className="p-6">
              <View className="mb-4">
                <Text className="text-xl font-black text-slate-900 tracking-tight">
                  {mode === 'login' ? t('auth.signInTitle') : t('auth.signUpTitle')}
                </Text>
              </View>

              {/* Email / Phone Login Switcher */}
              {mode === 'login' && (
                <View className="flex-row bg-slate-100 p-1 rounded-xl mb-4">
                  <TouchableOpacity
                    onPress={() => {
                      setLoginMethod('email');
                      setLocalError(null);
                    }}
                    className={`flex-1 py-2 rounded-lg items-center ${
                      loginMethod === 'email' ? 'bg-white shadow-xs' : ''
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        loginMethod === 'email' ? 'text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      {t('auth.loginByEmail')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setLoginMethod('phone');
                      setLocalError(null);
                    }}
                    className={`flex-1 py-2 rounded-lg items-center ${
                      loginMethod === 'phone' ? 'bg-white shadow-xs' : ''
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        loginMethod === 'phone' ? 'text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      {t('auth.loginByPhone')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

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

              <View className="space-y-3.5">
                {mode === 'register' && (
                  <View>
                    <Text className="text-xs font-bold text-slate-700 mb-1">
                      {t('auth.fullName')}
                    </Text>
                    <View className="flex-row items-center border border-slate-300 rounded-xl px-3 py-2 bg-white">
                      <MaterialIcon name="person-outline" size={18} color="#94a3b8" />
                      <TextInput
                        value={name}
                        onChangeText={setName}
                        placeholder={locale === 'en' ? 'John Doe' : 'Тарас Шевченко'}
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="words"
                        className="flex-1 ml-2 text-xs text-slate-900 font-medium"
                      />
                    </View>
                  </View>
                )}

                {(mode === 'register' || loginMethod === 'email') && (
                  <View>
                    <Text className="text-xs font-bold text-slate-700 mb-1">
                      {t('auth.email')}
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
                )}

                {(mode === 'register' || loginMethod === 'phone') && (
                  <View>
                    <Text className="text-xs font-bold text-slate-700 mb-1">
                      {t('auth.phone')}
                      {mode === 'register' ? ` (${t('common.optional')})` : ''}
                    </Text>
                    <MobilePhoneInput value={phone} onChange={setPhone} locale={locale} />
                  </View>
                )}

                <View>
                  <Text className="text-xs font-bold text-slate-700 mb-1">
                    {t('auth.password')}
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
                        {mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
                      </Text>
                      <MaterialIcon name="arrow-forward" size={16} color="#ffffff" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
