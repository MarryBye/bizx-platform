import React from 'react';
import type { Store } from '@bizx/common-types';
import {
  X,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Archive,
  ExternalLink
} from 'lucide-react';

interface BusinessDetailsModalProps {
  business: (Store & { categoryName?: string; ownerName?: string; ownerEmail?: string }) | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: 'active' | 'pending' | 'suspended' | 'archived') => Promise<void>;
  isUpdating: boolean;
}

export const BusinessDetailsModal: React.FC<BusinessDetailsModalProps> = ({
  business,
  isOpen,
  onClose,
  onUpdateStatus,
  isUpdating
}) => {
  if (!isOpen || !business) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Активний</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>На перевірці</span>
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Призупинено</span>
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <Archive className="w-3.5 h-3.5" />
            <span>В архіві</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900">{business.name}</h2>
                {getStatusBadge(business.status)}
              </div>
              <p className="text-xs text-slate-500 font-mono">/{business.slug}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                ID Торгової точки
              </span>
              <div className="text-xs font-mono text-slate-800 truncate select-all">
                {business.id}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Категорія
              </span>
              <div className="text-xs font-bold text-slate-800 truncate">
                {business.categoryName || 'Роздрібна торгівля'}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Власник акаунту
              </span>
              <div className="text-xs font-bold text-slate-800 truncate">
                {business.ownerName || 'Партнер BizX'}
              </div>
              {business.ownerEmail && (
                <div className="text-[11px] text-slate-500 font-mono truncate">
                  {business.ownerEmail}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Дата реєстрації
              </span>
              <div className="text-xs font-bold text-slate-800">
                {business.createdAt ? new Date(business.createdAt).toLocaleDateString('uk-UA') : '—'}
              </div>
            </div>
          </div>

          {/* Description if present */}
          {business.description && (
            <div className="p-3.5 bg-slate-50/60 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Опис закладу
              </span>
              <p className="text-xs text-slate-700 leading-relaxed">{business.description}</p>
            </div>
          )}

          {/* Status Actions Group */}
          <div className="p-4 border border-slate-200 rounded-xl bg-white space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Керування статусом закладу
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Зміна доступності закладу для оформлення замовлень покупцями
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {/* Activate */}
              <button
                type="button"
                disabled={isUpdating || business.status === 'active'}
                onClick={() => onUpdateStatus(business.id, 'active')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  business.status === 'active'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold ring-2 ring-emerald-400/20'
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-slate-700'
                } disabled:opacity-50`}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-1" />
                <span className="text-xs font-bold">Активувати</span>
                <span className="text-[10px] text-slate-400">Працює штатно</span>
              </button>

              {/* Suspend */}
              <button
                type="button"
                disabled={isUpdating || business.status === 'suspended'}
                onClick={() => onUpdateStatus(business.id, 'suspended')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  business.status === 'suspended'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 font-bold ring-2 ring-rose-400/20'
                    : 'border-slate-200 hover:border-rose-300 hover:bg-rose-50/40 text-slate-700'
                } disabled:opacity-50`}
              >
                <AlertTriangle className="w-5 h-5 text-rose-500 mb-1" />
                <span className="text-xs font-bold">Призупинити</span>
                <span className="text-[10px] text-slate-400">Тимчасовий блок</span>
              </button>

              {/* Archive */}
              <button
                type="button"
                disabled={isUpdating || business.status === 'archived'}
                onClick={() => onUpdateStatus(business.id, 'archived')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  business.status === 'archived'
                    ? 'border-slate-400 bg-slate-100 text-slate-900 font-bold ring-2 ring-slate-300'
                    : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700'
                } disabled:opacity-50`}
              >
                <Archive className="w-5 h-5 text-slate-500 mb-1" />
                <span className="text-xs font-bold">Архівувати</span>
                <span className="text-[10px] text-slate-400">Soft delete</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <a
            href={`http://localhost:3102`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900"
          >
            <span>Відкрити в панелі бізнесу</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
};
