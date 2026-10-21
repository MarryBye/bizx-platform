import React, { useState } from 'react';
import { useBusinessStore } from '../store/useBusinessStore';
import { Card, CardContent, Badge, Select, Button, Modal } from '@bizx/ui';
import { ShoppingBag, Phone, MapPin, Pencil, Check, X } from 'lucide-react';
import type { OrderStatus } from '@bizx/common-types';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Очікує',
  paid: 'Оплачено',
  confirmed: 'Підтверджено',
  shipped: 'Відправлено',
  delivered: 'Доставлено',
  cancelled: 'Скасовано'
};

export const OrdersView: React.FC = () => {
  const { orders, activeStore, updateOrderStatus, isLoading } = useBusinessStore();

  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('pending');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    orderId: string;
    orderNumber: string;
    newStatus: OrderStatus;
  } | null>(null);

  const formatPrice = (kopecks: number) => {
    return (kopecks / 100).toLocaleString('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="success">Доставлено</Badge>;
      case 'confirmed':
        return <Badge variant="default">Підтверджено</Badge>;
      case 'processing':
        return <Badge variant="default">Комплектується</Badge>;
      case 'shipped':
        return <Badge variant="default">Відправлено</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Скасовано</Badge>;
      case 'pending':
      default:
        return <Badge variant="warning">Очікує</Badge>;
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!confirmModal) return;
    await updateOrderStatus(confirmModal.orderId, confirmModal.newStatus);
    setConfirmModal(null);
    setEditingOrderId(null);
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
          {orders.map((order) => {
            const isEditing = editingOrderId === order.id;

            return (
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

                    {/* Status Action: Edit Button or Form */}
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-40">
                          <Select
                            value={selectedStatus}
                            onChange={(val) => setSelectedStatus(val as OrderStatus)}
                            options={[
                              { value: 'pending', label: 'Очікує' },
                              { value: 'confirmed', label: 'Підтверджено' },
                              { value: 'paid', label: 'Оплачено' },
                              { value: 'shipped', label: 'Відправлено' },
                              { value: 'delivered', label: 'Доставлено' },
                              { value: 'cancelled', label: 'Скасовано' }
                            ]}
                          />
                        </div>
                        <Button
                          size="sm"
                          className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                          title="Зберегти статус"
                          onClick={() => {
                            if (selectedStatus === order.status) {
                              setEditingOrderId(null);
                              return;
                            }
                            setConfirmModal({
                              isOpen: true,
                              orderId: order.id,
                              orderNumber: order.orderNumber,
                              newStatus: selectedStatus
                            });
                          }}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 shrink-0"
                          title="Скасувати"
                          onClick={() => setEditingOrderId(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold gap-1.5 text-slate-700 hover:bg-white"
                        onClick={() => {
                          setEditingOrderId(order.id);
                          setSelectedStatus(order.status as OrderStatus);
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-500" />
                        <span>Змінити статус</span>
                      </Button>
                    )}
                  </div>
                </div>

                <CardContent className="p-4 sm:p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer Info */}
                    <div className="space-y-2 text-xs">
                      <p className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                        Дані клієнта
                      </p>
                      <p className="text-slate-900 font-medium">{order.contactName}</p>
                      <p className="text-slate-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {order.contactPhone}
                      </p>
                      <p className="text-slate-500 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {order.deliveryAddress || 'Самовивіз із закладу'}
                      </p>
                      {order.notes && (
                        <p className="text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                          «{order.notes}»
                        </p>
                      )}
                    </div>

                    {/* Order Items */}
                    <div className="space-y-2">
                      <p className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                        Склад замовлення
                      </p>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0"
                            >
                              <span className="text-slate-800">
                                {item.productName || 'Товар'}
                                <span className="text-slate-400 ml-1">× {item.quantity}</span>
                              </span>
                              <span className="font-semibold text-slate-900">
                                {formatPrice(item.totalPrice || item.unitPrice * item.quantity)} ₴
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400">Деталі товарів відсутні</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-slate-300 p-12 text-center">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-700">Замовлень поки немає</p>
          <p className="text-xs text-slate-400 mt-1">
            Нові замовлення покупців автоматично з&apos;являться у цьому списку
          </p>
        </Card>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <Modal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(null)}
          title="Підтвердження зміни статусу"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Ви дійсно бажаєте змінити статус замовлення <strong className="text-slate-900">#{confirmModal.orderNumber}</strong> на:
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-sm font-bold text-slate-900">
                {STATUS_LABELS[confirmModal.newStatus]}
              </span>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmModal(null)}
                disabled={isLoading}
              >
                Скасувати
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleConfirmStatusChange}
                disabled={isLoading}
              >
                {isLoading ? 'Збереження...' : 'Підтвердити зміну'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
