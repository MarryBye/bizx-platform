'use client';

import React, { useState } from 'react';
import { api } from '../lib/api';
import type { UserProfile } from '@bizx/common-types';
import { AuthCard } from '@bizx/ui';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialMode = 'login'
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (data: {
    mode: 'login' | 'register';
    email: string;
    password: string;
    name?: string;
  }) => {
    setError(null);
    setIsLoading(true);

    try {
      if (data.mode === 'login') {
        const res = await api.auth.login({
          email: data.email,
          password: data.password
        });
        if (res.success && res.data) {
          onSuccess(res.data.user);
          onClose();
          return;
        }
        setError('Невірний логін або пароль');
      } else {
        const res = await api.auth.register({
          name: data.name || '',
          email: data.email,
          password: data.password,
          role: 'client'
        });
        if (res.success && res.data) {
          onSuccess(res.data.user);
          onClose();
          return;
        }
        setError('Не вдалося зареєструватися. Перевірте введені дані');
      }
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      const msg = errorObj.data?.message || errorObj.message || 'Помилка авторизації';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
        <AuthCard
          badgeText="BIZX ID"
          title="Єдиний обліковий запис BizX"
          subtitle="Вхід до маркетплейсу, закладів та налаштувань профілю"
          initialMode={initialMode}
          allowRegister={true}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
          onClose={onClose}
          footerNotice="Реєструючись, ви отримуєте статус клієнта екосистеми BizX"
        />
      </div>
    </div>
  );
};
