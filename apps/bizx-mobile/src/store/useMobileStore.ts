import { create } from 'zustand';

/**
 * Пример глобального хранилища состояния для мобильного приложения (Zustand).
 * Используйте этот шаблон для управления состоянием экранов.
 */
interface MobileState {
  count: number;
  increment: () => void;
  reset: () => void;
}

export const useMobileStore = create<MobileState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 })
}));
