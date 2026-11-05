import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { AuthScreen } from '@bizx/ui';

export const LoginView: React.FC = () => {
  const { login, isLoading, error } = useAuthStore();

  const handleLogin = async (data: { email: string; password: string }) => {
    await login({ email: data.email, password: data.password });
  };

  return (
    <AuthScreen
      badgeText="BIZX MERCHANT"
      title="Вхід у кабінет бізнесу"
      subtitle="Керування закладом, товарами та аналітикою продажів"
      allowRegister={false}
      externalRegisterUrl="http://localhost:3100/account"
      externalRegisterText="Немає облікового запису? Зареєструйтесь на порталі BizX"
      onSubmit={handleLogin}
      isLoading={isLoading}
      error={error}
      footerNotice="Панель керування торговими точками для бізнес-партнерів мережі BizX"
    />
  );
};
