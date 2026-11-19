import { create } from 'zustand';
import { mobileApi, setMobileToken } from '../lib/api';
import { i18n, translateApiError } from '@bizx/utils';
import type { UserProfile, LoginDto, RegisterDto } from '@bizx/common-types';

interface MobileAuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  login: (dto: LoginDto) => Promise<boolean>;
  register: (dto: RegisterDto) => Promise<boolean>;
  updateProfile: (dto: { name?: string; phone?: string | null; preferredLanguage?: 'uk' | 'en' }) => Promise<boolean>;
  logout: () => Promise<void>;
  init: () => Promise<void>;
}

export const useMobileAuthStore = create<MobileAuthState>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  init: async () => {
    try {
      const res = await mobileApi.auth.me();
      if (res.success && res.data) {
        set({ user: res.data, isInitialized: true });
        return;
      }
    } catch {
      // Guest
    }
    set({ user: null, isInitialized: true });
  },

  login: async (dto: LoginDto) => {
    set({ isLoading: true, error: null });
    try {
      const res = await mobileApi.auth.login(dto);
      if (res.success && res.data) {
        setMobileToken(res.data.accessToken);
        set({ user: res.data.user, isLoading: false, isInitialized: true });
        return true;
      }
      set({ error: i18n.t('errors.invalidCredentials'), isLoading: false });
      return false;
    } catch (err: any) {
      const message = translateApiError(err.data?.message || err.message, 'auth.loginError');
      set({ error: message, isLoading: false });
      return false;
    }
  },

  register: async (dto: RegisterDto) => {
    set({ isLoading: true, error: null });
    try {
      const res = await mobileApi.auth.register(dto);
      if (res.success && res.data) {
        setMobileToken(res.data.accessToken);
        set({ user: res.data.user, isLoading: false, isInitialized: true });
        return true;
      }
      set({ error: i18n.t('auth.registerError'), isLoading: false });
      return false;
    } catch (err: any) {
      const message = translateApiError(err.data?.message || err.message, 'auth.registerError');
      set({ error: message, isLoading: false });
      return false;
    }
  },

  updateProfile: async (dto) => {
    set({ isLoading: true, error: null });
    try {
      const res = await mobileApi.auth.updateProfile(dto);
      if (res.success && res.data) {
        set({ user: res.data, isLoading: false });
        return true;
      }
      set({ error: i18n.t('errors.saveFailed'), isLoading: false });
      return false;
    } catch (err: any) {
      const message = translateApiError(err.data?.message || err.message, 'errors.saveFailed');
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
