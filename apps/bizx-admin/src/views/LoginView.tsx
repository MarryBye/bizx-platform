import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';
import { AuthScreen, LanguageSelector } from '@bizx/ui';

export const LoginView: React.FC = () => {
  const { login, isLoading, error } = useAuthStore();
  const { t, locale, setLocale } = useTranslation();

  const handleLogin = async (data: {
    loginMethod?: 'email' | 'phone';
    email: string;
    phone?: string;
    password: string;
  }) => {
    if (data.loginMethod === 'phone') {
      await login({ phone: data.phone, password: data.password });
    } else {
      await login({ email: data.email, password: data.password });
    }
  };

  return (
    <AuthScreen
      badgeText="BIZX MERCHANT"
      locale={locale}
      title={t('admin.merchantTitle')}
      subtitle={t('auth.merchantSubtitle')}
      allowRegister={false}
      externalRegisterUrl="http://localhost:3100/account"
      externalRegisterText={t('auth.merchantRegisterLink')}
      onSubmit={handleLogin}
      isLoading={isLoading}
      error={error}
      footerNotice={t('auth.merchantNotice')}
      languageSelector={
        <LanguageSelector
          value={locale}
          onChange={setLocale}
          variant="minimal"
          align="right"
        />
      }
    />
  );
};
