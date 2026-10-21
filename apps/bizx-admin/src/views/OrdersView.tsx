import React from 'react';
import { useBusinessStore } from '../store/useBusinessStore';
import { Card, CardContent, Badge, Select } from '@bizx/ui';
import { ShoppingBag, Phone, MapPin, CheckCircle, Clock, Truck, XCircle, ChevronDown } from 'lucide-react';
import type { OrderStatus, PaymentStatus } from '@bizx/common-types';

export const OrdersView: React.FC = () => {
  const { orders, activeStore, updateOrderStatus, isLoading } = useBusinessStore();

  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toLocaleString('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'delivered':
        return <Badge variant="success">{status === 'paid' ? 'Оплачено' : 'Доставлено'}</Badge>;
      case 'confirmed':
      case 'shipped':
        return <Badge variant="default">{status === 'confirmed' ? 'Підтверджено' : 'Відправлено'}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Скасовано</Badge>;
      case 'pending':
      default:
        return <Badge variant="warning">В обробці</Badge>;
    }
  };

  if (!activeStore) {
    return (
      <div className="p-8 text-center text-slate-500">
        Оберіть магазин для перегляду замовлень
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Замовлення магазину</h1>
        <p className="text-sm text-slate-500 mt-1">
          Всі замовлення клієнтів для магазину «{activeStore.name}»
        </p>
      </div>

      {orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">{order.orderNumber}</span>
                    {getStatusBadge(order.status)}
                    <Badge variant={order.paymentStatus === 'paid' ? 'success' : 'outline'}>
                      {order.paymentStatus === 'paid' ? 'Сплачено' : 'Очікує оплати'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    Створено: {new Date(order.createdAt).toLocaleString('uk-UA')}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Сума замовлення</span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatPrice(order.totalAmount)} ₴
                    </span>
                  </div>

                  <div className="w-36">
                    <Select
                      value={order.status}
                      onChange={(val) => {
                        void updateOrderStatus(order.id, val as OrderStatus);
                      }}
                      options={[
                        { value: 'pending', label: 'Очікує' },
                        { value: 'confirmed', label: 'Підтвердити' },
                        { value: 'shipped', label: 'Відправити' },
                        { value: 'delivered', label: 'Доставлено' },
                        { value: 'cancelled', label: 'Скасувати' }
                      ]}
                    />
                  </div>
                </div>
              </div>

              <CardContent className="p-4 sm:p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Info */}
                  <div className="space-y-2 text-xs">
                    <p className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                      Дані клієнта
                    </p>
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                      <p className="font-medium text-slate-900 text-sm">{order.contactName}</p>
                      <p className="text-slate-600 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {order.contactPhone}
                      </p>
                      {order.deliveryAddress && (
                        <p className="text-slate-600 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> {order.deliveryAddress}
                        </p>
                      )}
                      {order.notes && (
                        <p className="text-slate-500 italic mt-1 pt-1 border-t border-slate-200/50">
                          «{order.notes}»
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="space-y-2 text-xs">
                    <p className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                      Склад замовлення
                    </p>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 divide-y divide-slate-100">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item) => (
                          <div key={item.id} className="py-1.5 first:pt-0 last:pb-0 flex items-center justify-between">
                            <div>
                              <span className="font-medium text-slate-900">{item.productName}</span>
                              <span className="text-slate-400 ml-2">× {item.quantity}</span>
                            </div>
                            <span className="font-semibold text-slate-700">
                              {formatPrice(item.totalPrice)} ₴
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400 italic">Склад замовлення уточнюється</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-slate-300 p-12 text-center">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-700">Замовлень поки немає</p>
          <p className="text-xs text-slate-400 mt-1">
            Нові замовлення покупців з'являтимуться тут автоматично
          </p>
        </Card>
      )}
    </div>
  );
};
