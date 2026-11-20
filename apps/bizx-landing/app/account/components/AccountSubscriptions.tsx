'use client';

import React from 'react';
import Link from 'next/link';
import type { UserProfile, UserSubscriptionDetails, SubscriptionPlan } from '@bizx/common-types';
import { CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

interface AccountSubscriptionsProps {
  t: (key: string) => string;
  user: UserProfile | null;
  subDetails: UserSubscriptionDetails | null;
  allPlans: SubscriptionPlan[];
  subNotice: string | null;
  onSelectPlanForUpgrade: (plan: SubscriptionPlan) => void;
}

export const AccountSubscriptions: React.FC<AccountSubscriptionsProps> = ({
  t,
  user,
  subDetails,
  allPlans,
  subNotice,
  onSelectPlanForUpgrade
}) => {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-slate-900">{t('account.subscriptionsTab')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('account.subscriptionsTabDesc')}</p>
        </div>
        <Link
          href="/pricing"
          className="text-xs font-bold text-slate-900 hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
        >
          <span>{t('landing.ctaPricing')}</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </Link>
      </div>

      {subNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{subNotice}</span>
        </div>
      )}

      <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Поточний статус облікового запису
            </div>
            <div className="text-2xl font-black mt-0.5">
              {user?.subscriptionTier === 'free' && 'Базовий клієнт (Free)'}
              {user?.subscriptionTier === 'client_premium' && 'BizX Premium'}
              {user?.subscriptionTier === 'business_starter' && 'BizX Business Starter'}
              {user?.subscriptionTier === 'business_pro' && 'BizX Business Pro'}
              {user?.subscriptionTier === 'business_enterprise' && 'BizX Business Enterprise'}
              {!user?.subscriptionTier && 'Базовий'}
            </div>
          </div>

          <div className="self-start sm:self-auto px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white border border-white/20">
            {user?.subscriptionStatus === 'active' && '🟢 Активна підписка'}
            {user?.subscriptionStatus === 'expired' && '🔴 Термін дії минув'}
            {user?.subscriptionStatus === 'cancelled' && '🟡 Скасована'}
            {(!user?.subscriptionStatus || user?.subscriptionStatus === 'none') &&
              '⚪️ Безкоштовний план'}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Днів активності</div>
            <div className="text-base font-black mt-0.5 text-white">
              {user?.subscriptionDaysLeft ?? 0} днів
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Діє до</div>
            <div className="text-xs font-bold mt-1 text-slate-200">
              {user?.subscriptionExpiresAt
                ? new Date(user.subscriptionExpiresAt).toLocaleDateString('uk-UA')
                : 'Не обмежено'}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Ліміт закладів</div>
            <div className="text-base font-black mt-0.5 text-white">
              {subDetails?.activeStoresCount ?? 0} з {user?.maxAllowedStores ?? 0} бізнесів
            </div>
          </div>
        </div>
      </div>

      {subDetails?.hasExceededStoreLimit && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Увага: перевищено ліміт активних закладів для вашого тарифу</span>
          </div>
          <p className="leading-relaxed">
            Ви маєте <strong>{subDetails.activeStoresCount}</strong> активних закладів, тоді як
            поточний тариф дозволяє максимум <strong>{subDetails.maxAllowedStores}</strong>. Будь
            ласка, перейдіть у вкладку <strong>«Мої бізнеси та ролі»</strong> та призупиніть зайві
            заклади, або підвищте тарифний план нижче.
          </p>
        </div>
      )}

      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold text-slate-900">Змінити тарифний план</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {allPlans
            .filter((p) => p.target === 'business')
            .map((plan) => {
              const isCurrent =
                user?.subscriptionTier === plan.id &&
                (plan.id === 'free' || user?.subscriptionStatus === 'active');
              return (
                <div
                  key={plan.id}
                  className={`p-4 border rounded-xl flex flex-col justify-between space-y-3 ${
                    isCurrent
                      ? 'border-slate-900 bg-slate-50/70 ring-1 ring-slate-900'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{plan.name}</span>
                      {plan.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white uppercase">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-black text-slate-900 mt-2">
                      {plan.priceUah} ₴ <span className="text-[10px] text-slate-400 font-normal">/ міс</span>
                    </div>
                    <div className="text-[11px] font-semibold text-slate-600 mt-1">
                      Ліміт: {plan.maxStores} {plan.maxStores === 1 ? 'заклад' : 'заклади'}
                    </div>
                  </div>

                  <div>
                    {isCurrent ? (
                      <div className="w-full py-1.5 text-center text-xs font-bold text-slate-500 bg-slate-200/60 rounded-lg">
                        Поточний план
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectPlanForUpgrade(plan)}
                        className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                      >
                        Перейти на цей план
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
