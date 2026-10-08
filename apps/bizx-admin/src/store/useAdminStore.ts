import { create } from 'zustand';

/**
 * Пример глобального хранилища состояния (Zustand).
 * Используйте этот шаблон для создания сторов админки.
 */
interface AdminState {
  count: number;
  increment: () => void;
  reset: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 })
}));
