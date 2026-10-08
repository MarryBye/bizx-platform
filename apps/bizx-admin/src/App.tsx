import React from 'react';
import { Button } from '@bizx/ui';
import { useAdminStore } from './store/useAdminStore';

export const App: React.FC = () => {
  const { count, increment, reset } = useAdminStore();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-foreground">
      <div className="max-w-md w-full text-center space-y-6 border rounded-xl p-8 bg-card shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight">BizX Admin Portal (Vite + React SPA)</h1>
        <p className="text-sm text-muted-foreground">
          Чистый стартовый шаблон SPA-админки с подключенным Zustand и дизайн-системой @bizx/ui.
        </p>

        <div className="p-4 bg-muted rounded-lg space-y-2">
          <p className="text-xs text-muted-foreground uppercase font-semibold">
            Пример состояния Zustand:
          </p>
          <p className="text-2xl font-black text-primary">{count}</p>
        </div>

        <div className="flex justify-center gap-3">
          <Button onClick={increment}>+ Увеличить счетчик</Button>
          <Button variant="outline" onClick={reset}>
            Сброс
          </Button>
        </div>
      </div>
    </div>
  );
};
