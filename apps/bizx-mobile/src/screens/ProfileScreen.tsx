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
import { MobilePhoneInput } from '../components/MobilePhoneInput';
import { MobileBadge, MobileCountBadge } from '../components/MobileBadge';
import { useMobileAuthStore } from '../store/useMobileAuthStore';
import { useMobileTranslation } from '../hooks/useMobileTranslation';
import { InboxModal } from './InboxModal';
import { mobileApi } from '../lib/api';

export const ProfileScreen: React.FC = () => {
  const { user, updateProfile, logout } = useMobileAuthStore();
  const { t, locale, mode, setMode } = useMobileTranslation();

  // Minimal profile edit form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxUnread, setInboxUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setInboxUnread(0);
      return;
    }
    mobileApi.inbox
      .getUnreadSummary()
      .then((res) => {
        if (res.success && res.data) {
          setInboxUnread(res.data.totalUnreadMessages || 0);
        }
      })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
    }
  }, [user]);

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
            {t('account.title')}
          </Text>
          <Text className="text-2xl font-black text-slate-900 mt-0.5">{t('mobile.tabProfile')}</Text>
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
              <View className="mt-1.5">
                <MobileBadge tone="slate" label="Клієнт BizX" uppercase />
              </View>
            </View>
          </View>
        </View>

        {/* Minimal Edit Profile Form */}
        <View className="px-5 mt-4">
          <View className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3.5">
            <View className="border-b border-slate-100 pb-2 flex-row items-center justify-between">
              <Text className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {t('account.personalInfo')}
              </Text>
              {saveSuccess && (
                <View className="flex-row items-center gap-1">
                  <MaterialIcon name="check-circle" size={14} color="#059669" />
                  <Text className="text-[11px] font-bold text-emerald-600">{t('common.success')}</Text>
                </View>
              )}
            </View>

            <View className="space-y-1">
              <Text className="text-[11px] font-bold text-slate-600">{t('auth.fullName')}</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Ваше ім'я"
                placeholderTextColor="#94a3b8"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 font-medium"
              />
            </View>

            <View className="space-y-1">
              <Text className="text-[11px] font-bold text-slate-600">{t('auth.phone')}</Text>
              <MobilePhoneInput value={editPhone} onChange={setEditPhone} locale={locale} />
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
                  <Text className="text-white text-xs font-bold">{t('account.saveChanges')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Language Selection Card */}
        <View className="px-5 mt-4">
          <View className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <View className="flex-row items-center gap-2 mb-2">
              <MaterialIcon name="language" size={16} color="#0f172a" />
              <Text className="text-xs font-bold text-slate-900">
                {t('mobile.languagePreference')}
              </Text>
            </View>
            <Text className="text-[11px] text-slate-500 mb-3">
              {t('account.languageDesc')}
            </Text>

            <View className="space-y-2">
              <TouchableOpacity
                onPress={() => setMode('auto')}
                activeOpacity={0.7}
                className={`flex-row items-center justify-between p-2.5 rounded-lg border ${
                  mode === 'auto'
                    ? 'bg-slate-900 border-slate-900'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    mode === 'auto' ? 'text-white' : 'text-slate-800'
                  }`}
                >
                  {t('mobile.systemLanguage')}
                </Text>
                {mode === 'auto' && (
                  <MaterialIcon name="check" size={14} color="#ffffff" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setMode('uk');
                  updateProfile({ preferredLanguage: 'uk' } as any).catch(() => {});
                }}
                activeOpacity={0.7}
                className={`flex-row items-center justify-between p-2.5 rounded-lg border ${
                  mode === 'uk'
                    ? 'bg-slate-900 border-slate-900'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    mode === 'uk' ? 'text-white' : 'text-slate-800'
                  }`}
                >
                  🇺🇦 {t('account.ukrainian')}
                </Text>
                {mode === 'uk' && (
                  <MaterialIcon name="check" size={14} color="#ffffff" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setMode('en');
                  updateProfile({ preferredLanguage: 'en' } as any).catch(() => {});
                }}
                activeOpacity={0.7}
                className={`flex-row items-center justify-between p-2.5 rounded-lg border ${
                  mode === 'en'
                    ? 'bg-slate-900 border-slate-900'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    mode === 'en' ? 'text-white' : 'text-slate-800'
                  }`}
                >
                  🇬🇧 {t('account.english')}
                </Text>
                {mode === 'en' && (
                  <MaterialIcon name="check" size={14} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Account Inbox Button */}
        <View className="px-5 mt-4">
          <TouchableOpacity
            onPress={() => setInboxOpen(true)}
            activeOpacity={0.75}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-3 flex-1 pr-2">
              <View className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 items-center justify-center">
                <MaterialIcon name="mail" size={20} color="#4338ca" />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-black text-slate-900">
                  {locale === 'en' ? 'Account Inbox' : 'Пошта та сповіщення BizX'}
                </Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">
                  {locale === 'en'
                    ? 'BizX notices, support chats & partner offers'
                    : 'Листи BizX, загальна підтримка та пропозиції'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center gap-2">
              <MobileCountBadge count={inboxUnread} tone="blue" />
              <MaterialIcon name="chevron-right" size={18} color="#94a3b8" />
            </View>
          </TouchableOpacity>
        </View>

        <InboxModal
          visible={inboxOpen}
          onClose={() => setInboxOpen(false)}
          onUnreadChanged={setInboxUnread}
        />

        {/* Portal Referral Note */}
        <View className="px-5 mt-4">
          <View className="bg-slate-100/80 border border-slate-200 rounded-xl p-4">
            <View className="flex-row items-center gap-2 mb-1.5">
              <MaterialIcon name="shield" size={16} color="#0f172a" />
              <Text className="text-xs font-bold text-slate-900">
                {locale === 'en' ? 'Security & Business Center' : 'Центр безпеки та бізнесів'}
              </Text>
            </View>
            <Text className="text-[11px] text-slate-600 leading-relaxed">
              {locale === 'en'
                ? 'Password change, two-factor authentication (2FA), store and integration management are available via the web portal:'
                : 'Зміна пароля, двофакторна автентифікація (2FA), керування вашими магазинами та інтеграціями доступні через веб-портал:'}
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
            <Text className="text-xs font-bold text-red-600">{t('common.logout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return null;
};
