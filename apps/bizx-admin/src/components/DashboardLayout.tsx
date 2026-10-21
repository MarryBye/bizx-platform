import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useBusinessStore } from '../store/useBusinessStore';
import { Button, AvatarPlaceholder, StorePlaceholder, Select } from '@bizx/ui';
import {
  BarChart3,
  Package,
  ShoppingBag,
  Settings,
  Users,
  CreditCard,
  LogOut,
  Store,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import { AnalyticsView } from '../views/AnalyticsView';
import { ProductsView } from '../views/ProductsView';
import { OrdersView } from '../views/OrdersView';
import { StoreSettingsView } from '../views/StoreSettingsView';
import { PlaceholderView } from '../views/PlaceholderView';

type TabType = 'analytics' | 'products' | 'orders' | 'settings' | 'staff' | 'payouts';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { stores, activeStore, activeStoreId, setActiveStore } = useBusinessStore();
  const [currentTab, setCurrentTab] = useState<TabType>('analytics');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'analytics' as const, label: 'Аналітика', icon: BarChart3 },
    { id: 'products' as const, label: 'Товари та склад', icon: Package },
    { id: 'orders' as const, label: 'Замовлення', icon: ShoppingBag },
    { id: 'settings' as const, label: 'Магазин та медіа', icon: Settings },
    { id: 'staff' as const, label: 'Персонал (Скоро)', icon: Users, isStub: true },
    { id: 'payouts' as const, label: 'Виплати (Скоро)', icon: CreditCard, isStub: true }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
            B
          </div>
          <span className="font-bold text-sm">BizX Portal</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg border border-slate-200 text-slate-600"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`w-full md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 ${
          isMobileMenuOpen ? 'block' : 'hidden md:flex'
        }`}
      >
        <div className="p-4 space-y-6">
          {/* Logo / Title */}
          <div className="hidden md:flex items-center gap-2.5 px-2">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 font-black">
              B
            </div>
            <div>
              <p className="font-bold text-sm tracking-tight text-slate-900">BizX Business</p>
              <p className="text-[11px] text-slate-400">Кабінет партнера</p>
            </div>
          </div>

          {/* Active Store Switcher */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 block">
              Магазин
            </label>
            {stores.length > 0 ? (
              <Select
                value={activeStoreId || ''}
                onChange={(val) => setActiveStore(val)}
                options={stores.map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Оберіть магазин"
              />
            ) : (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                Немає магазинів
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.isStub && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      Скоро
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile Badge & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 border overflow-hidden shrink-0 flex items-center justify-center">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <AvatarPlaceholder className="w-full h-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Партнер'}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="w-full flex items-center justify-center gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:border-red-200"
          >
            <LogOut className="w-3.5 h-3.5" /> Вийти з системи
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {currentTab === 'analytics' && <AnalyticsView />}
          {currentTab === 'products' && <ProductsView />}
          {currentTab === 'orders' && <OrdersView />}
          {currentTab === 'settings' && <StoreSettingsView />}
          {currentTab === 'staff' && (
            <PlaceholderView
              title="Персонал та ролі співробітників"
              description="Керуйте доступом касирів, кур'єрів та менеджерів вашого магазину"
              icon={Users}
            />
          )}
          {currentTab === 'payouts' && (
            <PlaceholderView
              title="Фінанси та виплати"
              description="Автоматичне перерахування коштів від продажів на розрахунковий рахунок (IBAN)"
              icon={CreditCard}
            />
          )}
        </div>
      </main>
    </div>
  );
};
