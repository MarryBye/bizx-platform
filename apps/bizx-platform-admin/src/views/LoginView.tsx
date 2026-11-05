import React, { useState } from 'react';
import { platformApi } from '../lib/api';
import type { UserProfile } from '@bizx/common-types';
import { AuthScreen } from '@bizx/ui';

interface LoginViewProps {
  onSuccess: (user: UserProfile) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (data: { email: string; password: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await platformApi.auth.login({
        email: data.email,
        password: data.password
      });

      if (res.success && res.data) {
        const loggedUser = res.data.user;
        if (loggedUser.systemRole !== 'platform_admin' && loggedUser.role !== 'admin') {
          setError('Доступ обмежено: акаунт не має прав адміністратора платформи BizX');
          platformApi.client.setAccessToken(null);
          return;
        }
        onSuccess(loggedUser);
        return;
      }
      setError('Невірний логін або пароль оператора');
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      setError(errObj.data?.message || errObj.message || 'Помилка авторизації');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScreen
      badgeText="BIZX PLATFORM"
      title="BizX Core Control"
      subtitle="Внутрішня консоль для персоналу та операторів платформи"
      allowRegister={false}
      onSubmit={handleLogin}
      isLoading={isLoading}
      error={error}
      footerNotice="Консоль призначена виключно для співробітників та операторів BizX"
    />
  );
};
