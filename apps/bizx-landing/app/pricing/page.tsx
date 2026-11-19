'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { SiteHeader } from '../components/SiteHeader';
import { AuthModal } from '../components/AuthModal';
import { useTranslation } from '../hooks/useTranslation';
import { translateApiError } from '@bizx/utils';
import type { UserProfile, SubscriptionPlan, SubscriptionTier } from '@bizx/common-types';
import { ConfirmModal, AlertBanner } from '@bizx/ui';
import {
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
  Building2,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
  CreditCard
} from 'lucide-react';

export default function PricingPage() {
  const { t, locale } = useTranslation();
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
        setSubscribeSuccess(t('pricing.subscribeSuccess'));
        setSelectedPlanForModal(null);
        await loadData();
        setTimeout(() => setSubscribeSuccess(null), 5000);
        return;
      }
      setSubscribeError(t('pricing.subscribeError'));
    } catch (err: unknown) {
      const errObj = err as { data?: { message?: string }; message?: string };
      setSubscribeError(translateApiError(errObj.data?.message || errObj.message, 'pricing.subscribeError'));
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
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{t('pricing.title')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {t('pricing.title')}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
            {t('pricing.subtitle')}
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
                {t('pricing.forBusiness')}
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
                {t('pricing.forClients')}
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
              {t('landing.ctaPortal')}
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
                {plan.badge && (
                  <div className="absolute -top-3 left-6">
                    <span
                      className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isPopular
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {isPopular ? t('pricing.popular') : plan.badge}
                    </span>
                  </div>
                )}

                <div>
                  <div className="pt-1">
                    <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900">
                        {plan.priceUah === 0 ? `0 ₴` : `${plan.priceUah} ₴`}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        / {t('pricing.perMonth')}
                      </span>
                    </div>
                  </div>

                  {plan.target === 'business' && (
                    <div className="mt-4 py-2 px-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-semibold text-slate-700 flex items-center justify-between">
                      <span>{locale === 'en' ? 'Store limit:' : 'Ліміт закладів:'}</span>
                      <span className="font-bold text-slate-900">
                        {plan.maxStores}{' '}
                        {locale === 'en'
                          ? plan.maxStores === 1
                            ? 'store'
                            : 'stores'
                          : plan.maxStores === 1
                            ? 'бізнес'
                            : 'бізнеси'}
                      </span>
                    </div>
                  )}

                  <div className="mt-6 space-y-3">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {locale === 'en' ? "What's included:" : 'Що входить у тариф:'}
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

                <div className="mt-8 pt-4 border-t border-slate-100">
                  {isCurrent ? (
                    <div className="w-full py-2.5 px-4 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold text-center">
                      {t('pricing.currentPlan')}
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
                        {!user ? t('pricing.loginToSubscribe') : t('pricing.upgradePlan')}
                      </span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
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
              {t('pricing.faqTitle')}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{t('pricing.faq1Q')}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{t('pricing.faq1A')}</p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{t('pricing.faq2Q')}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{t('pricing.faq2A')}</p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{t('pricing.faq3Q')}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{t('pricing.faq3A')}</p>
            </div>

            <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                <HelpCircle className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  {locale === 'en'
                    ? 'How does plan activation work?'
                    : 'Як відбувається підключення тарифу?'}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{t('pricing.noCardNeeded')}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Modal — Unified Light ConfirmModal */}
      <ConfirmModal
        isOpen={Boolean(selectedPlanForModal)}
        onClose={() => setSelectedPlanForModal(null)}
        onConfirm={handleConfirmSubscribe}
        nested={false}
        tone="info"
        icon={<CreditCard className="w-4 h-4" />}
        title={t('pricing.activate30Days')}
        subtitle="BIZX PAY"
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        confirmVariant="primary"
        isLoading={isSubscribing}
        error={subscribeError}
      >
        {selectedPlanForModal && (
          <>
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">
                  {t('subscriptions.currentPlan')}:
                </span>
                <span className="text-sm font-black text-slate-900">
                  {selectedPlanForModal.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">{t('common.price')}:</span>
                <span className="text-base font-black text-slate-900">
                  {selectedPlanForModal.priceUah === 0
                    ? '0 ₴'
                    : `${selectedPlanForModal.priceUah} ₴ / ${t('pricing.perMonth')}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{locale === 'en' ? 'Duration:' : 'Термін дії:'}</span>
                <span className="font-semibold text-slate-700">30 {t('common.days')}</span>
              </div>
              {selectedPlanForModal.target === 'business' && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{locale === 'en' ? 'Store limit:' : 'Ліміт закладів:'}</span>
                  <span className="font-semibold text-slate-700">
                    {selectedPlanForModal.maxStores}
                  </span>
                </div>
              )}
            </div>

            <AlertBanner tone="info">{t('pricing.noCardNeeded')}</AlertBanner>
          </>
        )}
      </ConfirmModal>

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
          <div>
            © {new Date().getFullYear()} BizX Commerce Platform. {t('landing.footerRights')}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-slate-700">
              {t('nav.home')}
            </Link>
            <Link href="/pricing" className="text-slate-900 font-bold">
              {t('nav.pricing')}
            </Link>
            <Link href="/account" className="hover:text-slate-700">
              {t('nav.account')}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
