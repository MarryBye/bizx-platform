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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 mb-2">
            <Store className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            BizX Business Portal
          </h1>
          <p className="text-sm text-slate-500">
            Кабінет керування магазином, товарами та аналітикою продажів
          </p>
        </div>

        {/* Main Auth Form */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setIsRegisterMode(false)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  !isRegisterMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Вхід
              </button>
              <button
                type="button"
                onClick={() => setIsRegisterMode(true)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  isRegisterMode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Реєстрація бізнесу
              </button>
            </div>
            <CardTitle className="text-base pt-3">
              {isRegisterMode ? 'Створення акаунту партнера' : 'Вхід у кабінет партнера'}
            </CardTitle>
            <CardDescription>
              {isRegisterMode
                ? 'Введіть ваші дані для реєстрації нового бізнесу'
                : 'Введіть email та пароль вашого облікового запису'}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-xs bg-red-50 text-red-600 border border-red-200 rounded-xl">
                  {error}
                </div>
              )}

              {isRegisterMode && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">{"Ім'я та Прізвище"}</label>
                  <Input
                    required
                    placeholder="Олександр Коваленко"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Електронна пошта</label>
                <Input
                  required
                  type="email"
                  placeholder="name@business.ua"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Пароль</label>
                <Input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </CardContent>

            <CardFooter className="pt-2">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading
                  ? 'Зачекайте...'
                  : isRegisterMode
                  ? 'Зареєструвати бізнес'
                  : 'Увійти в кабінет'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};
