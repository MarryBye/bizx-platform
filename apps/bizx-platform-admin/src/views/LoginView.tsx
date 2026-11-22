import React, { useState } from 'react';
import { platformApi } from '../lib/api';
import { useTranslation } from '../hooks/useTranslation';
import { translateApiError } from '@bizx/utils';
import type { UserProfile } from '@bizx/common-types';
import { AuthScreen, LanguageSelector } from '@bizx/ui';

interface LoginViewProps {
  onSuccess: (user: UserProfile) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { t, locale, setLocale } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (data: {
    loginMethod?: 'email' | 'phone';
    email: string;
    phone?: string;
    password: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await platformApi.auth.login(
        data.loginMethod === 'phone'
          ? { phone: data.phone, password: data.password }
          : { email: data.email, password: data.password }
      );

      if (res.success && res.data) {
        const loggedUser = res.data.user;
        if (!loggedUser.isPlatformStaff) {
          setError(t('auth.staffOnlyError'));
          await platformApi.auth.logout().catch(() => {});
          platformApi.client.setAccessToken(null);
          return;
        }
        if (
          loggedUser.preferredLanguage &&
          (loggedUser.preferredLanguage === 'uk' || loggedUser.preferredLanguage === 'en')
        ) {
          setLocale(loggedUser.preferredLanguage);
        }
        onSuccess(loggedUser);
        return;
      }
      setError(t('errors.invalidCredentials'));
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      setError(translateApiError(errObj.data?.message || errObj.message, 'auth.loginError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreen
      badgeText="BIZX PLATFORM"
      locale={locale}
      title="BizX Core Control"
      subtitle={t('auth.platformSubtitle')}
      allowRegister={false}
      onSubmit={handleLogin}
      isLoading={isLoading}
      error={error}
      footerNotice={t('auth.platformNotice')}
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
