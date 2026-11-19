'use client';

import React, { useState } from 'react';
import { api } from '../lib/api';
import { useTranslation } from '../hooks/useTranslation';
import { translateApiError } from '@bizx/utils';
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
  const { t, locale } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (data: {
    mode: 'login' | 'register';
    loginMethod?: 'email' | 'phone';
    email: string;
    phone?: string;
    password: string;
    name?: string;
  }) => {
    setError(null);
    setIsLoading(true);

    try {
      if (data.mode === 'login') {
        const res = await api.auth.login(
          data.loginMethod === 'phone'
            ? { phone: data.phone, password: data.password }
            : { email: data.email, password: data.password }
        );
        if (res.success && res.data) {
          onSuccess(res.data.user);
          onClose();
          return;
        }
        setError(t('errors.invalidCredentials'));
      } else {
        const res = await api.auth.register({
          name: data.name || '',
          email: data.email,
          phone: data.phone || undefined,
          password: data.password
        });
        if (res.success && res.data) {
          onSuccess(res.data.user);
          onClose();
          return;
        }
        setError(t('auth.registerError'));
      }
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      const msg = errorObj.data?.message || errorObj.message;
      setError(translateApiError(msg, 'auth.loginError'));
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
          locale={locale}
          initialMode={initialMode}
          allowRegister={true}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          error={error}
          onClose={onClose}
          footerNotice={
            locale === 'en'
              ? 'By registering, you receive a unified BizX ecosystem account'
              : 'Реєструючись, ви отримуєте єдиний обліковий запис екосистеми BizX'
          }
        />
      </div>
    </div>
  );
};
