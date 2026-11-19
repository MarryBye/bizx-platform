import React from 'react';
import { cn } from '../lib/utils';
import { Lock, Check } from 'lucide-react';

export interface PermissionDef {
  id: number;
  code: string;
  scope: 'store' | 'platform';
  category: string;
  action: string;
  ownerOnly: boolean;
  descriptionUk: string;
  descriptionEn: string;
}

const CATEGORY_LABELS: Record<string, { uk: string; en: string }> = {
  products: { uk: 'Товари та каталог', en: 'Products & Catalog' },
  orders: { uk: 'Замовлення', en: 'Orders' },
  analytics: { uk: 'Статистика та аналітика', en: 'Analytics & Reports' },
  store: { uk: 'Дані закладу', en: 'Store Settings' },
  staff: { uk: 'Команда закладу', en: 'Store Team' },
  roles: { uk: 'Ролі та доступи', en: 'Roles & Permissions' },
  platform_stores: { uk: 'Торгові точки', en: 'Platform Stores' },
  platform_users: { uk: 'Користувачі BizX', en: 'BizX Users' },
  platform_analytics: { uk: 'Аналітика платформи', en: 'Platform Analytics' },
  platform_staff: { uk: 'Команда BizX', en: 'BizX Team' },
  platform_roles: { uk: 'Ролі платформи', en: 'Platform Roles' }
};

const ACTION_COLORS: Record<string, string> = {
  read: 'bg-slate-100 text-slate-600',
  write: 'bg-emerald-50 text-emerald-700',
  edit: 'bg-blue-50 text-blue-700',
  manage: 'bg-amber-50 text-amber-800',
  export: 'bg-purple-50 text-purple-700'
};

export interface PermissionMatrixProps {
  catalog: PermissionDef[];
  selectedIds: number[];
  onChange: (nextIds: number[]) => void;
  actorPermissionIds: number[];
  actorIsOwner: boolean;
  locale?: 'uk' | 'en';
  disabled?: boolean;
  className?: string;
}

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  catalog,
  selectedIds,
  onChange,
  actorPermissionIds,
  actorIsOwner,
  locale = 'uk',
  disabled = false,
  className
}) => {
  const actorSet = new Set(actorPermissionIds);
  const selectedSet = new Set(selectedIds);

  // Group permissions by category preserving order
  const categories: string[] = [];
  const grouped = new Map<string, PermissionDef[]>();
  for (const perm of catalog) {
    if (!grouped.has(perm.category)) {
      categories.push(perm.category);
      grouped.set(perm.category, []);
    }
    grouped.get(perm.category)!.push(perm);
  }

  const canToggle = (perm: PermissionDef) => {
    if (disabled) return false;
    if (perm.ownerOnly && !actorIsOwner) return false;
    if (!actorIsOwner && !actorSet.has(perm.id)) return false;
    return true;
  };

  const togglePermission = (perm: PermissionDef) => {
    if (!canToggle(perm)) return;
    const next = new Set(selectedIds);
    if (next.has(perm.id)) {
      next.delete(perm.id);
    } else {
      next.add(perm.id);
    }
    onChange(Array.from(next));
  };

  const toggleCategory = (catPerms: PermissionDef[]) => {
    if (disabled) return;
    const grantable = catPerms.filter(canToggle);
    if (grantable.length === 0) return;

    const allChecked = grantable.every((p) => selectedSet.has(p.id));
    const next = new Set(selectedIds);
    for (const p of grantable) {
      if (allChecked) next.delete(p.id);
      else next.add(p.id);
    }
    onChange(Array.from(next));
  };

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3', className)}>
      {categories.map((cat) => {
        const perms = grouped.get(cat) || [];
        const grantable = perms.filter(canToggle);
        const allGrantableChecked =
          grantable.length > 0 && grantable.every((p) => selectedSet.has(p.id));
        const catTitle = CATEGORY_LABELS[cat]?.[locale] || cat;

        return (
          <div
            key={cat}
            className="border border-slate-200 rounded-xl bg-slate-50/60 p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200/80">
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider truncate">
                {catTitle}
              </span>
              {!disabled && grantable.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleCategory(perms)}
                  className="text-[10px] font-bold text-slate-500 hover:text-slate-900 shrink-0"
                >
                  {allGrantableChecked
                    ? locale === 'en'
                      ? 'Clear'
                      : 'Зняти'
                    : locale === 'en'
                      ? 'All'
                      : 'Усі'}
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {perms.map((perm) => {
                const checked = selectedSet.has(perm.id);
                const allowed = canToggle(perm);
                return (
                  <button
                    key={perm.id}
                    type="button"
                    disabled={!allowed}
                    onClick={() => togglePermission(perm)}
                    title={
                      !allowed && !disabled
                        ? perm.ownerOnly
                          ? locale === 'en'
                            ? 'Only Owner can grant this permission'
                            : 'Це право може видавати лише Власник'
                          : locale === 'en'
                            ? 'You do not hold this permission yourself'
                            : 'У вас немає цього права'
                        : undefined
                    }
                    className={cn(
                      'w-full flex items-start gap-2.5 p-2 rounded-lg border text-left transition-all',
                      checked
                        ? 'bg-white border-slate-900 shadow-xs'
                        : 'bg-white/70 border-slate-200/80 hover:border-slate-300',
                      !allowed && 'opacity-55 cursor-not-allowed hover:border-slate-200/80'
                    )}
                  >
                    <span
                      className={cn(
                        'w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 border transition-colors',
                        checked
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-300'
                      )}
                    >
                      {checked && <Check className="w-3 h-3" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-xs font-semibold text-slate-800 leading-snug">
                        {locale === 'en' ? perm.descriptionEn : perm.descriptionUk}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span
                          className={cn(
                            'inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase',
                            ACTION_COLORS[perm.action] || 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {perm.action}
                        </span>
                        {perm.ownerOnly && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900">
                            <Lock className="w-2.5 h-2.5" />
                            {locale === 'en' ? 'Owner only' : 'Тільки власник'}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
