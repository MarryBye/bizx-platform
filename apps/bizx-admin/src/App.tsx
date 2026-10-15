import React, { useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { useBusinessStore } from './store/useBusinessStore';
import { LoginView } from './views/LoginView';
import { DashboardLayout } from './components/DashboardLayout';

export const App: React.FC = () => {
  const { user, isLoading, init } = useAuthStore();
  const { fetchStores } = useBusinessStore();

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (user) {
      void fetchStores();
    }
  }, [user, fetchStores]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500 mt-4 tracking-wider uppercase">
          Завантаження BizX Portal...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return <DashboardLayout />;
};
