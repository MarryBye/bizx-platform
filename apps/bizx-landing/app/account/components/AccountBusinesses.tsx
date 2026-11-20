'use client';

import React from 'react';
import Link from 'next/link';
import type { Store, UserSubscriptionDetails } from '@bizx/common-types';
import { StatusBadge } from '@bizx/ui';
import {
  Store as StoreIcon,
  CheckCircle2,
  AlertCircle,
  Building2,
  ExternalLink,
  Eye,
  Crown,
  UserCheck
} from 'lucide-react';

interface AccountBusinessesProps {
  locale: 'uk' | 'en';
  t: (key: string) => string;
  currentUserId?: string;
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
  currentUserId,
  myStores,
  subDetails,
  moderationNotice,
  onOpenCreateStoreModal,
  onSubmitForModeration,
  onSelectStoreToSuspend,
  onToggleStoreStatus
}) => {
  const isEn = locale === 'en';
  const hasOwnedStores = myStores.some(
    (s) => s.isOwner ?? Boolean(currentUserId && s.ownerId === currentUserId)
  );

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

      {hasOwnedStores && (subDetails?.needsStoreSelection || subDetails?.hasExceededStoreLimit) && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {isEn
                ? `Action required: select up to ${subDetails.maxAllowedStores} store(s) for your current plan`
                : `Потрібна дія: оберіть до ${subDetails.maxAllowedStores} заклад(ів) для вашого поточного тарифу`}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed">
            {isEn
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
            const isOwner = st.isOwner ?? Boolean(currentUserId && st.ownerId === currentUserId);
            const canManageStatus =
              isOwner || Boolean(st.myPermissions?.includes('store.status.manage'));
            const roleLabel = isOwner
              ? isEn
                ? 'Owner'
                : 'Власник'
              : st.myRoleName || (isEn ? 'Staff' : 'Персонал');

            return (
              <div
                key={st.id}
                className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {isOwner
                        ? isEn
                          ? 'Your business'
                          : 'Власний заклад'
                        : isEn
                          ? 'Staff access'
                          : 'Робочий доступ'}
                    </span>
                    <StatusBadge
                      tone={
                        isActive
                          ? 'emerald'
                          : isPending
                            ? 'blue'
                            : isDraft
                              ? 'amber'
                              : st.status === 'suspended'
                                ? 'rose'
                                : 'slate'
                      }
                      size="xs"
                      dot
                    >
                      {t(`statuses.store.${st.status}`)}
                    </StatusBadge>
                  </div>

                  <div>
                    <div className="text-sm font-bold text-slate-900">{st.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">/{st.slug}</div>
                    {st.description && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{st.description}</p>
                    )}
                  </div>

                  {isDraft && canManageStatus && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                      <div className="text-[11px] text-amber-900 leading-tight">
                        {isEn
                          ? 'This store is a draft. Submit it for BizX moderation when ready.'
                          : 'Заклад у статусі чернетки. Надішліть його на перевірку адміністраторам BizX, коли будете готові.'}
                      </div>
                      <button
                        type="button"
                        onClick={() => onSubmitForModeration(st.id)}
                        className="w-full py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition-colors"
                      >
                        {isEn ? 'Submit for BizX moderation' : 'Відправити на модерацію в BizX'}
                      </button>
                    </div>
                  )}

                  {isDraft && !canManageStatus && (
                    <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-600 leading-tight">
                      {isEn
                        ? 'This store is in draft mode and not published yet.'
                        : 'Заклад у статусі чернетки та ще не опублікований.'}
                    </div>
                  )}

                  {isPending && (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 leading-tight">
                      {isEn
                        ? 'Submitted for BizX moderation review.'
                        : 'Заявку надіслано на розгляд модераторам BizX. Заклад очікує підтвердження.'}
                    </div>
                  )}
                </div>

                <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                  <StatusBadge
                    tone={isOwner ? 'slate' : 'blue'}
                    size="xs"
                    icon={
                      isOwner ? (
                        <Crown className="w-3 h-3 text-amber-500" />
                      ) : (
                        <UserCheck className="w-3 h-3" />
                      )
                    }
                  >
                    {roleLabel}
                  </StatusBadge>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    {canManageStatus && st.status === 'active' && (
                      <button
                        type="button"
                        onClick={() => onSelectStoreToSuspend(st)}
                        className="text-[11px] font-bold text-slate-600 hover:text-rose-600 transition-colors"
                      >
                        {t('subscriptions.suspendStore')}
                      </button>
                    )}
                    {canManageStatus && st.status === 'suspended' && (
                      <button
                        type="button"
                        onClick={() => onToggleStoreStatus(st.id, st.status)}
                        className="text-[11px] font-bold text-emerald-700 hover:underline transition-colors"
                      >
                        {isEn ? 'Submit for BizX review' : 'На перевірку в BizX'}
                      </button>
                    )}
                    {(st.status === 'active' || st.status === 'draft' || st.status === 'pending') && (
                      <Link
                        href={`/store/${st.slug}`}
                        className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                      >
                        {st.status === 'active' ? (
                          <>
                            <span>{isEn ? 'Storefront' : 'Сайт закладу'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>{isEn ? 'Preview' : 'Превʼю'}</span>
                          </>
                        )}
                      </Link>
                    )}
                    <a
                      href="http://localhost:3102"
                      className="text-xs font-bold text-slate-900 hover:underline inline-flex items-center gap-1"
                    >
                      <span>{isEn ? 'Panel' : 'Панель'}</span>
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
