import { create } from 'zustand';
import { api } from '../lib/api';
import type { UserProfile, LoginDto, RegisterDto } from '@bizx/common-types';

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  init: () => Promise<void>;
  login: (dto: LoginDto) => Promise<boolean>;
  register: (dto: RegisterDto) => Promise<boolean>;
  logout: () => Promise<void>;
  updateAvatar: (file: File) => Promise<boolean>;
  updateProfile: (dto: { name?: string; phone?: string }) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  init: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.auth.me();
      if (res.success && res.data) {
        if (res.data.role !== 'business_owner') {
          api.client.setAccessToken(null);
          set({ user: null, isLoading: false });
          return;
        }
        set({ user: res.data, isLoading: false });
        return;
      }
    } catch {
      // Not authenticated or token expired
    }
    set({ user: null, isLoading: false });
  },

  login: async (dto: LoginDto) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.auth.login(dto);
      if (res.success && res.data) {
        if (res.data.user.role !== 'business_owner') {
          api.client.setAccessToken(null);
          set({
            user: null,
            error: 'Доступ обмежено: портал призначений виключно для бізнес-партнерів [AUTH_1002].',
            isLoading: false
          });
          return false;
        }
        set({ user: res.data.user, isLoading: false });
        return true;
      }
      set({ error: 'Невірний логін або пароль [AUTH_1001]', isLoading: false });
      return false;
    } catch (err: any) {
      const message = err.data?.message || err.message || 'Помилка авторизації [AUTH_1000]';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  register: async (dto: RegisterDto) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.auth.register({
        ...dto,
        role: 'business_owner'
      });
      if (res.success && res.data) {
        set({ user: res.data.user, isLoading: false });
        return true;
      }
      set({ error: 'Не вдалося зареєструватися [AUTH_1003]', isLoading: false });
      return false;
    } catch (err: any) {
      const message = err.data?.message || err.message || 'Помилка реєстрації [AUTH_1000]';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore error on logout
    }
    set({ user: null, error: null });
  },

  updateAvatar: async (file: File) => {
    try {
      const res = await api.auth.uploadAvatar(file);
      if (res.success && res.data) {
        set({ user: res.data });
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.message || 'Не вдалося оновити аватар' });
      return false;
    }
  },

  updateProfile: async (dto: { name?: string; phone?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.auth.updateProfile(dto);
      if (res.success && res.data) {
        set({ user: res.data, isLoading: false });
        return true;
      }
      set({ error: 'Не вдалося оновити профіль', isLoading: false });
      return false;
    } catch (err: any) {
      set({ error: err.message || 'Помилка оновлення профілю', isLoading: false });
      return false;
    }
  }
}));
