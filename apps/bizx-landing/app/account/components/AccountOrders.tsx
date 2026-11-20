'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import type { EnrichedOrderResponse } from '@bizx/api-client';
import { StatusBadge, CountBadge } from '@bizx/ui';
import { ShoppingBag, ExternalLink, Clock, AlertTriangle, Loader2 } from 'lucide-react';

interface AccountOrdersProps {
  locale: 'uk' | 'en';
}

export const AccountOrders: React.FC<AccountOrdersProps> = ({ locale }) => {
  const isEn = locale === 'en';
  const [orders, setOrders] = useState<EnrichedOrderResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    api.orders
      .getMyOrders()
      .then((res) => {
        if (active && res.success && res.data) {
          setOrders(res.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const formatMoney = (kopecks: number) =>
    (kopecks / 100).toLocaleString(isEn ? 'en-US' : 'uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const statusTone = (status: string): 'emerald' | 'blue' | 'amber' | 'rose' | 'slate' => {
    if (status === 'delivered') return 'emerald';
    if (status === 'cancelled') return 'rose';
    if (status === 'pending') return 'amber';
    return 'blue';
  };

  return (
    <div className="space-y-5">
      <div className="border-b border-slate-100 pb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900">
            {isEn ? 'My Orders' : 'Мої замовлення'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isEn
              ? 'All purchases across BizX partner stores with quick access to order chats.'
              : 'Усі ваші покупки в закладах BizX зі швидким переходом до чату та статусів.'}
          </p>
        </div>
        <Link
          href="/stores"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shrink-0"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>{isEn ? 'Browse Stores' : 'Усі заклади'}</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="py-14 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
          <span>{isEn ? 'Loading orders...' : 'Завантаження замовлень...'}</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
          <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
          <div className="text-xs font-bold text-slate-700">
            {isEn ? 'You have no orders yet' : 'У вас ще немає замовлень'}
          </div>
          <Link
            href="/stores"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
          >
            {isEn ? 'Explore partner stores' : 'Перейти до каталогу закладів'}
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {orders.map((order) => (
            <div
              key={order.id}
              className="p-4 bg-white hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black font-mono text-slate-900">
                    {order.orderNumber}
                  </span>
                  <StatusBadge tone={statusTone(order.status)} size="xs" dot>
                    {order.status}
                  </StatusBadge>
                  {(order.unreadCount ?? 0) > 0 && (
                    <CountBadge count={order.unreadCount || 0} tone="blue" />
                  )}
                  {order.activeDispute && (
                    <StatusBadge tone="rose" size="xs" icon={<AlertTriangle className="w-3 h-3" />}>
                      {isEn ? 'Dispute' : 'Спір'}
                    </StatusBadge>
                  )}
                </div>
                <div className="text-xs font-bold text-slate-700">
                  {order.storeName || 'BizX Store'} · {order.itemsCount ?? order.items?.length ?? 0}{' '}
                  {isEn ? 'item(s)' : 'поз.'}
                </div>
                <div className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(order.createdAt).toLocaleString(isEn ? 'en-US' : 'uk-UA')}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-sm font-black text-slate-900">
                    {formatMoney(order.totalAmount)} ₴
                  </div>
                </div>
                {order.storeSlug && (
                  <Link
                    href={`/store/${order.storeSlug}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-800"
                  >
                    <span>{isEn ? 'Open store' : 'У заклад'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
