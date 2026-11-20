'use client';

import React from 'react';
import type { StoreReviewsResponse } from '@bizx/common-types';
import { formatShortDate } from '@bizx/utils';
import { Star } from 'lucide-react';

interface StoreReviewsSectionProps {
  locale: 'uk' | 'en';
  displayRating: number;
  displayRatingCount: number;
  reviewsData: StoreReviewsResponse | null;
}

export const StoreReviewsSection: React.FC<StoreReviewsSectionProps> = ({
  locale,
  displayRating,
  displayRatingCount,
  reviewsData
}) => {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-slate-900">
            {locale === 'en' ? 'Customer Reviews' : 'Відгуки покупців'}
          </h2>
          <p className="text-xs text-slate-500">
            {locale === 'en'
              ? 'Only verified customers with delivered orders can rate a store.'
              : 'Оцінку можуть залишити лише покупці після успішно виконаного замовлення.'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-slate-900 flex items-center gap-1.5 justify-end">
            <Star className="w-6 h-6 text-amber-500 fill-amber-400" />
            <span>{displayRating.toFixed(1)}</span>
          </div>
          <div className="text-[11px] text-slate-500">
            {displayRatingCount} {locale === 'en' ? 'reviews' : 'оцінок'}
          </div>
        </div>
      </div>

      {reviewsData && reviewsData.reviews.length > 0 ? (
        <div className="space-y-3">
          {reviewsData.reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-900">{rev.customerName}</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= rev.rating ? 'text-amber-500 fill-amber-400' : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              {rev.comment && <p className="text-xs text-slate-700">{rev.comment}</p>}
              <p className="text-[10px] text-slate-400">
                {formatShortDate(rev.createdAt, locale)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-xs text-slate-400">
          {locale === 'en' ? 'No reviews yet' : 'Відгуків поки немає'}
        </div>
      )}
    </div>
  );
};
