import { create } from 'zustand';
import { mobileApi, setMobileToken } from '../lib/api';
import type { UserProfile, LoginDto, RegisterDto } from '@bizx/common-types';

interface MobileAuthState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  login: (dto: LoginDto) => Promise<boolean>;
  register: (dto: RegisterDto) => Promise<boolean>;
  updateProfile: (dto: { name?: string; phone?: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  init: () => Promise<void>;
}

export const useMobileAuthStore = create<MobileAuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  init: async () => {
    try {
      const res = await mobileApi.auth.me();
      if (res.success && res.data) {
        set({ user: res.data });
      }
    } catch {
      // Guest
    }
  },

  login: async (dto: LoginDto) => {
    set({ isLoading: true, error: null });
    try {
      const res = await mobileApi.auth.login(dto);
      if (res.success && res.data) {
        setMobileToken(res.data.accessToken);
        set({ user: res.data.user, isLoading: false });
        return true;
      }
      set({ error: 'Помилка входу', isLoading: false });
      return false;
    } catch (err: any) {
      const message = err.data?.message || err.message || 'Невірний логін або пароль';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  register: async (dto: RegisterDto) => {
    set({ isLoading: true, error: null });
    try {
      const res = await mobileApi.auth.register({
        ...dto,
        role: 'client'
      });
      if (res.success && res.data) {
        setMobileToken(res.data.accessToken);
        set({ user: res.data.user, isLoading: false });
        return true;
      }
      set({ error: 'Помилка реєстрації', isLoading: false });
      return false;
    } catch (err: any) {
      const message = err.data?.message || err.message || 'Помилка реєстрації';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  updateProfile: async (dto: { name?: string; phone?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const res = await mobileApi.auth.updateProfile(dto);
      if (res.success && res.data) {
        set({ user: res.data, isLoading: false });
        return true;
      }
      set({ error: 'Не вдалося оновити профіль', isLoading: false });
      return false;
    } catch (err: any) {
      const message = err.data?.message || err.message || 'Помилка оновлення профілю';
      set({ error: message, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await mobileApi.auth.logout();
    } catch {
      // Ignore
    }
    setMobileToken(null);
    set({ user: null, error: null });
  }
}));
