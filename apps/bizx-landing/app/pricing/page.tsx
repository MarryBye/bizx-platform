'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { SiteHeader } from '../components/SiteHeader';
import { AuthModal } from '../components/AuthModal';
import type { UserProfile, SubscriptionPlan, SubscriptionTier } from '@bizx/common-types';
import {
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
  Building2,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function PricingPage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [targetTab, setTargetTab] = useState<'business' | 'client'>('business');
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<SubscriptionPlan | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState<string | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const userRes = await api.auth.me();
      if (userRes.success && userRes.data) {
        setUser(userRes.data);
      }
    } catch {
      setUser(null);
    }

    try {
      const plansRes = await api.subscriptions.getPlans();
      if (plansRes.success && plansRes.data) {
        setPlans(plansRes.data);
      }
    } catch {
      // Fallback in case endpoint is pending
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setSelectedPlanForModal(plan);
    setSubscribeError(null);
  };

  const handleConfirmSubscribe = async () => {
    if (!selectedPlanForModal || !user) return;
    setIsSubscribing(true);
    setSubscribeError(null);

    try {
      const res = await api.subscriptions.subscribe({
        tier: selectedPlanForModal.id as SubscriptionTier,
        periodDays: 30
      });

      if (res.success) {
        setSubscribeSuccess(`Тариф «${selectedPlanForModal.name}» успішно активовано на 30 днів!`);
        setSelectedPlanForModal(null);
        await loadData();
        setTimeout(() => setSubscribeSuccess(null), 5000);
        return;
      }
      setSubscribeError('Не вдалося оновити тариф. Спробуйте пізніше.');
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      setSubscribeError(errObj.data?.message || errObj.message || 'Помилка активації підписки');
    } finally {
      setIsSubscribing(false);
    }
  };

  const filteredPlans = plans.filter((p) => p.target === targetTab);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>BizX Тарифи та Підписки</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Прозорі тарифи для покупок та масштабування бізнесу
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Отримуйте бонуси покупця або підключайте торгові точки, керуйте асортиментом та аналітикою продажів у єдиній комерційній екосистемі.
          </p>

          {/* Switcher Tabs */}
          <div className="pt-4 flex justify-center">
            <div className="p-1 bg-white border border-slate-200 rounded-xl inline-flex gap-1 shadow-sm">
              <button
                type="button"
                onClick={() => setTargetTab('business')}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                  targetTab === 'business'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Для бізнесу та мерчантів
              </button>
              <button
                type="button"
                onClick={() => setTargetTab('client')}
                className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                  targetTab === 'client'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                Для покупців та клієнтів
              </button>
            </div>
          </div>
        </div>

        {/* Global Success / Notice */}
        {subscribeSuccess && (
          <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-3 shadow-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex-1 font-semibold">{subscribeSuccess}</div>
            <Link
              href="/account"
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors text-xs"
            >
              Перейти в кабінет
            </Link>
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div
          className={`grid gap-6 ${
            targetTab === 'business'
              ? 'grid-cols-1 md:grid-cols-3 items-stretch'
              : 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto items-stretch'
          }`}
        >
          {filteredPlans.map((plan) => {
            const isCurrent = user?.subscriptionTier === plan.id;
            const isPopular = plan.popular;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between bg-white border rounded-2xl p-6 transition-all shadow-sm ${
                  isPopular
                    ? 'border-slate-900 shadow-md ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Popular / Badge Flag */}
                {plan.badge && (
                  <div className="absolute -top-3 left-6">
                    <span
                      className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isPopular
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div>
                  <div className="pt-1">
                    <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">
                        {plan.priceUah === 0 ? '0 ₴' : `${plan.priceUah} ₴`}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{plan.period}</span>
                    </div>
                  </div>

                  {/* Limit summary for business */}
                  {plan.target === 'business' && (
                    <div className="mt-4 py-2 px-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>Ліміт закладів:</span>
                      <span className="font-bold text-slate-900">
                        {plan.maxStores} {plan.maxStores === 1 ? 'бізнес' : 'бізнеси'}
                      </span>
                    </div>
                  )}

                  {/* Features List */}
                  <div className="mt-6 space-y-3">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Що входить у тариф:
                    </div>
                    <ul className="space-y-2.5">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Button */}
                <div className="mt-8 pt-4 border-t border-slate-100">
                  {isCurrent ? (
                    <div className="w-full py-2.5 px-4 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold text-center">
                      Ваш поточний тариф
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm ${
                        isPopular
                          ? 'bg-slate-900 hover:bg-slate-800 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                      }`}
                    >
                      <span>
                        {!user ? 'Увійти для підключення' : 'Обрати цей тариф'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Metro FAQ Grid */}
        <div className="mt-20 pt-10 border-t border-slate-200">
          <div className="text-center max-w-xl mx-auto mb-10 space-y-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Часті запитання про тарифи
            </h2>
            <p className="text-xs text-slate-500">
              Все, що потрібно знати про роботу підписок, тестовий період та ліміти закладів
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Як працює тестова оплата?</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                На етапі бета-тестування BizX реальні банківські кошти не списуються. Ви можете обрати будь-який тариф в один клік і відразу отримати повний функціонал на 30 днів.
              </p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Що буде при зниженні тарифу?</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Якщо ви мали 5 закладів, а перейшли на тариф з лімітом у 3 заклади, система запропонує вам призупинити зайві бізнеси у кабінеті, щоб решта 3 продовжили активну роботу.
              </p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Що стається після завершення підписки?</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Якщо підписку не продовжено, заклади тимчасово переходять у статус «Призупинено» і приховуються з каталогу для покупців, а доступ до панелі бізнесу блокується до оплати.
              </p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Чи можна змінити тариф у будь-який момент?</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Так, ви можете підвищити тариф або перейти на інший рівень підписки у будь-який момент прямо з особистого кабінету або цієї сторінки.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {selectedPlanForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-black text-[10px] tracking-wider uppercase">
                  BIZX PAY
                </span>
                <span className="text-xs font-bold text-slate-700">Активація підписки</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanForModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {subscribeError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{subscribeError}</span>
                </div>
              )}

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Обраний тариф:</span>
                  <span className="text-sm font-black text-slate-900">{selectedPlanForModal.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Вартість:</span>
                  <span className="text-base font-black text-slate-900">
                    {selectedPlanForModal.priceUah === 0 ? '0 ₴' : `${selectedPlanForModal.priceUah} ₴ / міс`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Термін дії:</span>
                  <span className="font-semibold text-slate-700">30 днів</span>
                </div>
                {selectedPlanForModal.target === 'business' && (
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Ліміт закладів:</span>
                    <span className="font-semibold text-slate-700">До {selectedPlanForModal.maxStores} закладів</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                ℹ️ <strong>Тестовий режим:</strong> Справжня платіжна картка не вимагається. Натискаючи кнопку, ви активуєте підписку на тестовий 30-денний період.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlanForModal(null)}
                  className="px-3 py-2 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Скасувати
                </button>
                <button
                  type="button"
                  disabled={isSubscribing}
                  onClick={handleConfirmSubscribe}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isSubscribing ? 'Активація...' : 'Підтвердити активацію'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal for Guests */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          loadData();
        }}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <div>© {new Date().getFullYear()} BizX Commerce Platform. Всі права захищено.</div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-700">
              Головна
            </Link>
            <Link href="/pricing" className="text-slate-900 font-bold">
              Тарифи
            </Link>
            <Link href="/account" className="hover:text-slate-700">
              Особистий кабінет
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
