import React, { useState } from 'react';
import { cn } from '../lib/utils';
import { Mail, Lock, User, X, ArrowRight, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';

export interface AuthCardProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  initialMode?: 'login' | 'register';
  allowRegister?: boolean;
  externalRegisterUrl?: string;
  externalRegisterText?: string;
  onSubmit: (data: {
    mode: 'login' | 'register';
    email: string;
    password: string;
    name?: string;
  }) => Promise<void> | void;
  isLoading?: boolean;
  error?: string | null;
  onClose?: () => void;
  footerNotice?: React.ReactNode;
  className?: string;
}

export const AuthCard: React.FC<AuthCardProps> = ({
  title,
  subtitle,
  badgeText = 'BIZX ID',
  initialMode = 'login',
  allowRegister = true,
  externalRegisterUrl,
  externalRegisterText = 'Немає облікового запису? Зареєструватися',
  onSubmit,
  isLoading = false,
  error = null,
  onClose,
  footerNotice,
  className
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(
    allowRegister ? initialMode : 'login'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      mode,
      email: email.trim(),
      password,
      name: mode === 'register' ? name.trim() : undefined
    });
  };

  const displayTitle =
    title || (mode === 'login' ? 'Вхід у систему' : 'Створення акаунту');
  const displaySubtitle =
    subtitle ||
    (mode === 'login'
      ? 'Введіть email та пароль вашого облікового запису'
      : 'Заповніть реєстраційні дані для доступу до сервісу');

  return (
    <div
      className={cn(
        'w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-slate-900',
        className
      )}
    >
      {/* Metro Accent Bar / Header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-extrabold text-[11px] tracking-wider uppercase">
            {badgeText}
          </span>
          <span className="text-xs font-bold text-slate-600">Авторизація</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            aria-label="Закрити"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mode Switcher Tabs (Only when allowRegister is true) */}
      {allowRegister && (
        <div className="flex border-b border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={cn(
              'flex-1 py-3 text-xs font-bold transition-colors border-b-2 text-center',
              mode === 'login'
                ? 'border-slate-900 text-slate-900 bg-slate-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            Вхід
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={cn(
              'flex-1 py-3 text-xs font-bold transition-colors border-b-2 text-center',
              mode === 'register'
                ? 'border-slate-900 text-slate-900 bg-slate-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            Реєстрація
          </button>
        </div>
      )}

      {/* Main Content Form */}
      <div className="p-6">
        <div className="mb-5">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            {displayTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {displaySubtitle}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Повне ім&apos;я
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Тарас Шевченко"
                  disabled={isLoading}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 font-medium disabled:bg-slate-100"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Електронна пошта
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={isLoading}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 font-medium disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              Пароль доступу
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 font-medium disabled:bg-slate-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Зачекайте...</span>
              </>
            ) : (
              <>
                <span>
                  {mode === 'login' ? 'Увійти в акаунт' : 'Зареєструватися'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Redirect to external registration if registration is disabled on this panel */}
        {!allowRegister && externalRegisterUrl && (
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <a
              href={externalRegisterUrl}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:underline"
            >
              <span>{externalRegisterText}</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        )}

        {/* Optional Custom Footer Notice */}
        {footerNotice && (
          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 text-center">
            {footerNotice}
          </div>
        )}
      </div>
    </div>
  );
};

export interface AuthScreenProps extends AuthCardProps {
  appTag?: string;
}

export const AuthScreen: React.FC<AuthScreenProps> = (props) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <AuthCard {...props} />
    </div>
  );
};
