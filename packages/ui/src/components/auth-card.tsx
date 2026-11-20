import React, { useState } from 'react';
import { cn } from '../lib/utils';
import {
  Mail,
  Lock,
  User,
  Phone,
  X,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { PhoneInput } from './phone-input';

export interface AuthCardProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  locale?: 'uk' | 'en';
  initialMode?: 'login' | 'register';
  allowRegister?: boolean;
  externalRegisterUrl?: string;
  externalRegisterText?: string;
  onSubmit: (data: {
    mode: 'login' | 'register';
    loginMethod?: 'email' | 'phone';
    email: string;
    phone?: string;
    password: string;
    name?: string;
  }) => Promise<void> | void;
  isLoading?: boolean;
  error?: string | null;
  onClose?: () => void;
  footerNotice?: React.ReactNode;
  className?: string;
}

const AUTH_COPY = {
  uk: {
    authorization: 'Авторизація',
    close: 'Закрити',
    tabLogin: 'Вхід',
    tabRegister: 'Реєстрація',
    loginTitle: 'Вхід у систему',
    registerTitle: 'Створення акаунту',
    loginSubtitleEmail: 'Введіть email та пароль вашого облікового запису',
    loginSubtitlePhone: 'Введіть номер телефону та пароль вашого облікового запису',
    registerSubtitle: 'Заповніть реєстраційні дані для доступу до сервісу',
    methodEmail: 'Email',
    methodPhone: 'Телефон',
    fullName: "Повне ім'я",
    fullNamePlaceholder: 'Тарас Шевченко',
    email: 'Електронна пошта',
    phone: 'Номер телефону',
    optional: "необов'язково",
    password: 'Пароль доступу',
    wait: 'Зачекайте...',
    submitLogin: 'Увійти в акаунт',
    submitRegister: 'Зареєструватися',
    defaultExternalRegister: 'Немає облікового запису? Зареєструватися'
  },
  en: {
    authorization: 'Authorization',
    close: 'Close',
    tabLogin: 'Sign in',
    tabRegister: 'Sign up',
    loginTitle: 'Sign in to account',
    registerTitle: 'Create account',
    loginSubtitleEmail: 'Enter your email address and password to continue',
    loginSubtitlePhone: 'Enter your phone number and password to continue',
    registerSubtitle: 'Fill in your registration details to access the platform',
    methodEmail: 'Email',
    methodPhone: 'Phone',
    fullName: 'Full name',
    fullNamePlaceholder: 'John Doe',
    email: 'Email address',
    phone: 'Phone number',
    optional: 'optional',
    password: 'Password',
    wait: 'Please wait...',
    submitLogin: 'Sign in',
    submitRegister: 'Create account',
    defaultExternalRegister: "Don't have an account? Register"
  }
} as const;

export const AuthCard: React.FC<AuthCardProps> = ({
  title,
  subtitle,
  badgeText = 'BIZX ID',
  locale = 'uk',
  initialMode = 'login',
  allowRegister = true,
  externalRegisterUrl,
  externalRegisterText,
  onSubmit,
  isLoading = false,
  error = null,
  onClose,
  footerNotice,
  className
}) => {
  const copy = AUTH_COPY[locale] || AUTH_COPY.uk;
  const [mode, setMode] = useState<'login' | 'register'>(
    allowRegister ? initialMode : 'login'
  );
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      mode,
      loginMethod: mode === 'login' ? loginMethod : 'email',
      email: email.trim(),
      phone: phone.trim() || undefined,
      password,
      name: mode === 'register' ? name.trim() : undefined
    });
  };

  const displayTitle =
    title || (mode === 'login' ? copy.loginTitle : copy.registerTitle);
  const displaySubtitle =
    subtitle ||
    (mode === 'login'
      ? loginMethod === 'phone'
        ? copy.loginSubtitlePhone
        : copy.loginSubtitleEmail
      : copy.registerSubtitle);

  return (
    <div
      className={cn(
        'w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-sm overflow-visible text-slate-900',
        className
      )}
    >
      {/* Metro Accent Bar / Header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-extrabold text-[11px] tracking-wider uppercase">
            {badgeText}
          </span>
          <span className="text-xs font-bold text-slate-600">{copy.authorization}</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            aria-label={copy.close}
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
            {copy.tabLogin}
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
            {copy.tabRegister}
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

        {/* Email / Phone Login Method Switcher */}
        {mode === 'login' && (
          <div className="mb-4 p-1 bg-slate-100 rounded-lg grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setLoginMethod('email')}
              className={cn(
                'flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all',
                loginMethod === 'email'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{copy.methodEmail}</span>
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('phone')}
              className={cn(
                'flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all',
                loginMethod === 'phone'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{copy.methodPhone}</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                {copy.fullName}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={copy.fullNamePlaceholder}
                  disabled={isLoading}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 font-medium disabled:bg-slate-100"
                />
              </div>
            </div>
          )}

          {(mode === 'register' || loginMethod === 'email') && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                {copy.email}
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
          )}

          {(mode === 'register' || loginMethod === 'phone') && (
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                {copy.phone}
                {mode === 'register' && (
                  <span className="ml-1.5 text-[11px] font-normal text-slate-400">
                    ({copy.optional})
                  </span>
                )}
              </label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                required={mode === 'login' && loginMethod === 'phone'}
                disabled={isLoading}
                locale={locale}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              {copy.password}
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
                <span>{copy.wait}</span>
              </>
            ) : (
              <>
                <span>
                  {mode === 'login' ? copy.submitLogin : copy.submitRegister}
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
              <span>{externalRegisterText || copy.defaultExternalRegister}</span>
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
  languageSelector?: React.ReactNode;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ languageSelector, ...props }) => {
  return (
    <div className="relative min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {languageSelector && (
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
          {languageSelector}
        </div>
      )}
      <AuthCard {...props} />
    </div>
  );
};
