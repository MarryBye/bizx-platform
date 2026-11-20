'use client';

import React from 'react';
import Link from 'next/link';
import type { Store, UserSubscriptionDetails } from '@bizx/common-types';
import {
  Store as StoreIcon,
  CheckCircle2,
  AlertCircle,
  Building2,
  ExternalLink,
  Eye
} from 'lucide-react';

interface AccountBusinessesProps {
  locale: 'uk' | 'en';
  t: (key: string) => string;
  myStores: Store[];
  subDetails: UserSubscriptionDetails | null;
  moderationNotice: string | null;
  onOpenCreateStoreModal: () => void;
  onSubmitForModeration: (storeId: string) => void;
  onSelectStoreToSuspend: (store: Store) => void;
  onToggleStoreStatus: (storeId: string, currentStatus: string) => void;
}

export const AccountBusinesses: React.FC<AccountBusinessesProps> = ({
  locale,
  t,
  myStores,
  subDetails,
  moderationNotice,
  onOpenCreateStoreModal,
  onSubmitForModeration,
  onSelectStoreToSuspend,
  onToggleStoreStatus
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">{t('account.myStoresTitle')}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t('account.businessesTabDesc')}</p>
        </div>
        <button
          type="button"
          onClick={onOpenCreateStoreModal}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
        >
          <StoreIcon className="w-4 h-4 shrink-0" />
          <span>{t('account.createStore')}</span>
        </button>
      </div>

      {moderationNotice && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{moderationNotice}</span>
        </div>
      )}

      {(subDetails?.needsStoreSelection || subDetails?.hasExceededStoreLimit) && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {locale === 'en'
                ? `Action required: select up to ${subDetails.maxAllowedStores} store(s) for your current plan`
                : `Потрібна дія: оберіть до ${subDetails.maxAllowedStores} заклад(ів) для вашого поточного тарифу`}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed">
            {locale === 'en'
              ? 'Your stores were temporarily paused after a plan downgrade. Submit the stores you want to keep active for BizX review, or upgrade your subscription.'
              : 'Через пониження тарифу всі заклади було тимчасово призупинено. Оберіть заклади в межах ліміту та відправте їх на перевірку в BizX, або підвищте тариф.'}
          </p>
        </div>
      )}

      {myStores.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-3">
          <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="text-xs font-bold text-slate-800">{t('account.noStoresYet')}</div>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            {t('account.createFirstStoreHint')}
          </p>
          <button
            type="button"
            onClick={onOpenCreateStoreModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            <StoreIcon className="w-4 h-4 shrink-0" />
            <span>{t('account.createStore')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {myStores.map((st) => {
            const isDraft = st.status === 'draft';
            const isPending = st.status === 'pending';
            const isActive = st.status === 'active';

            return (
              <div
                key={st.id}
                className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Торгова точка
                  </span>
                  {isDraft && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded uppercase">
                      В розробці
                    </span>
                  )}
                  {isPending && (
                    <span className="text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded uppercase">
                      На перевірці
                    </span>
                  )}
                  {isActive && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded uppercase">
                      Активний
                    </span>
                  )}
                  {!isDraft && !isPending && !isActive && (
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded uppercase">
                      {st.status}
                    </span>
                  )}
                </div>

                <div>
                  <div className="text-sm font-bold text-slate-900">{st.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">/{st.slug}</div>
                  {st.description && (
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{st.description}</p>
                  )}
                </div>

                {isDraft && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                    <div className="text-[11px] text-amber-900 leading-tight">
                      Заклад у статусі чернетки. Надішліть його на перевірку адміністраторам BizX,
                      коли будете готові.
                    </div>
                    <button
                      type="button"
                      onClick={() => onSubmitForModeration(st.id)}
                      className="w-full py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition-colors"
                    >
                      Відправити на модерацію в BizX
                    </button>
                  </div>
                )}

                {isPending && (
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 leading-tight">
                    Заявку надіслано на розгляд модераторам BizX. Заклад очікує підтвердження.
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-700">Власник</span>
                  <div className="flex items-center gap-2">
                    {st.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => onSelectStoreToSuspend(st)}
                        className="text-[11px] font-bold text-slate-600 hover:text-rose-600 transition-colors"
                      >
                        {t('subscriptions.suspendStore')}
                      </button>
                    )}
                    {st.status === 'suspended' && (
                      <button
                        type="button"
                        onClick={() => onToggleStoreStatus(st.id, st.status)}
                        className="text-[11px] font-bold text-emerald-700 hover:underline transition-colors"
                      >
                        {locale === 'en' ? 'Submit for BizX review' : 'На перевірку в BizX'}
                      </button>
                    )}
                    {(st.status === 'active' || st.status === 'draft' || st.status === 'pending') && (
                      <Link
                        href={`/store/${st.slug}`}
                        className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                      >
                        {st.status === 'active' ? (
                          <>
                            <span>{locale === 'en' ? 'Storefront' : 'Сайт закладу'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>{locale === 'en' ? 'Preview' : 'Превʼю'}</span>
                          </>
                        )}
                      </Link>
                    )}
                    <a
                      href="http://localhost:3102"
                      className="text-xs font-bold text-slate-900 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Панель</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
