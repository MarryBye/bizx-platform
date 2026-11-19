import { create } from 'zustand';
import { api } from '../lib/api';
import { i18n, translateApiError } from '@bizx/utils';
import type { UserProfile, LoginDto } from '@bizx/common-types';

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  init: () => Promise<void>;
  login: (dto: LoginDto) => Promise<boolean>;
  logout: () => Promise<void>;
  updateAvatar: (file: File) => Promise<boolean>;
  updateProfile: (dto: { name?: string; phone?: string }) => Promise<boolean>;
}

function hasActiveBusinessAccess(user: UserProfile): boolean {
  if (user.role === 'admin' || user.systemRole === 'platform_admin') {
    return true;
  }
  const isBizTier = ['business_starter', 'business_pro', 'business_enterprise'].includes(
    user.subscriptionTier || ''
  );
  const isSubActive =
    isBizTier &&
    (user.subscriptionDaysLeft ?? 0) > 0 &&
    user.subscriptionStatus === 'active';

  return isSubActive;
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
        if (!hasActiveBusinessAccess(res.data)) {
          api.client.setAccessToken(null);
          set({
            user: null,
            error: i18n.t('subscriptions.needBusinessSub'),
            isLoading: false
          });
          return;
        }

        if (
          res.data.preferredLanguage &&
          (res.data.preferredLanguage === 'uk' || res.data.preferredLanguage === 'en')
        ) {
          i18n.setLocale(res.data.preferredLanguage);
          if (typeof window !== 'undefined') {
            localStorage.setItem('bizx_locale', res.data.preferredLanguage);
          }
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
        if (!hasActiveBusinessAccess(res.data.user)) {
          api.client.setAccessToken(null);
          set({
            user: null,
            error: i18n.t('subscriptions.needBusinessSub'),
            isLoading: false
          });
          return false;
        }
        if (
          res.data.user.preferredLanguage &&
          (res.data.user.preferredLanguage === 'uk' || res.data.user.preferredLanguage === 'en')
        ) {
          i18n.setLocale(res.data.user.preferredLanguage);
          if (typeof window !== 'undefined') {
            localStorage.setItem('bizx_locale', res.data.user.preferredLanguage);
          }
        }
        set({ user: res.data.user, isLoading: false });
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

  logout: async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore error on logout
    } finally {
      api.client.setAccessToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('bizx_admin_access_token');
        localStorage.removeItem('bizx_access_token');
        localStorage.removeItem('bizx_platform_admin_token');
      }
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
    } catch {
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
      set({ error: i18n.t('errors.saveFailed'), isLoading: false });
      return false;
    } catch (err: any) {
      const message = translateApiError(err.data?.message || err.message, 'errors.saveFailed');
      set({ error: message, isLoading: false });
      return false;
    }
  }
}));
