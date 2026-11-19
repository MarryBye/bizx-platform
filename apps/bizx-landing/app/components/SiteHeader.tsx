'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import { useTranslation } from '../hooks/useTranslation';
import type { UserProfile, Store } from '@bizx/common-types';
import { LanguageSelector } from '@bizx/ui';
import { AuthModal } from './AuthModal';
import {
  ChevronDown,
  Store as StoreIcon,
  Shield,
  CreditCard,
  Settings,
  LogOut,
  LogIn
} from 'lucide-react';

export const SiteHeader: React.FC = () => {
  const { t, locale, setLocale } = useTranslation();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const res = await api.auth.me();
      if (res.success && res.data) {
        setUser(res.data);
        if (
          res.data.preferredLanguage &&
          (res.data.preferredLanguage === 'uk' || res.data.preferredLanguage === 'en')
        ) {
          setLocale(res.data.preferredLanguage);
        }
        try {
          const storesRes = await api.stores.getMyStores();
          if (storesRes.success && storesRes.data) {
            setStores(storesRes.data);
          }
        } catch {
          // Ignore stores failure if not a business user
        }
      } else {
        setUser(null);
        setStores([]);
      }
    } catch {
      setUser(null);
      setStores([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();

    const handleUnauthorized = () => {
      setUser(null);
      setStores([]);
    };

    window.addEventListener('bizx:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('bizx:unauthorized', handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleLanguageChange = (nextLocale: 'uk' | 'en') => {
    setLocale(nextLocale);
    if (user) {
      api.auth.updateProfile({ preferredLanguage: nextLocale }).catch(() => {});
    }
  };

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bizx_access_token');
      localStorage.removeItem('bizx_admin_access_token');
      localStorage.removeItem('bizx_platform_admin_token');
    }
    setUser(null);
    setStores([]);
    setIsDropdownOpen(false);
    window.location.reload();
  };

  const isBusinessUser = Boolean(user?.hasStoreAccess || user?.isBusinessOwner || stores.length > 0);
  const isPlatformStaff = Boolean(user?.isPlatformStaff);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Minimalist Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center font-bold text-xs tracking-wider group-hover:bg-slate-800 transition-colors">
              B
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">BizX</span>
          </Link>

          {/* Business-oriented Navigation */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <Link href="/#features" className="hover:text-slate-900 transition-colors">
              {t('nav.features')}
            </Link>
            <Link href="/#benefits" className="hover:text-slate-900 transition-colors">
              {t('nav.forBusiness')}
            </Link>
            <Link href="/pricing" className="hover:text-slate-900 transition-colors">
              {t('nav.pricing')}
            </Link>
            <Link href="/#process" className="hover:text-slate-900 transition-colors">
              {t('nav.howItWorks')}
            </Link>
            <Link href="/#contacts" className="hover:text-slate-900 transition-colors">
              {t('nav.contacts')}
            </Link>
          </nav>

          {/* Header Actions / User Menu + Subtle Language Dropdown in Top-Right */}
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="w-28 h-8 bg-slate-100 animate-pulse rounded-md" />
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0">
                    {user.avatarUrl && !avatarError ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={api.storage.resolveMediaUrl(user.avatarUrl) || ''}
                        alt={user.name || ''}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      getInitials(user.name)
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-900 max-w-[140px] truncate">
                    {user.name || user.email}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                      isDropdownOpen ? 'rotate-180 text-slate-900' : ''
                    }`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-fade-in text-xs">
                    {/* User Profile Summary */}
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold overflow-hidden shrink-0">
                        {user.avatarUrl && !avatarError ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={api.storage.resolveMediaUrl(user.avatarUrl) || ''}
                            alt={user.name || ''}
                            className="w-full h-full object-cover"
                            onError={() => setAvatarError(true)}
                          />
                        ) : (
                          getInitials(user.name)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate">
                          {user.name || t('common.user')}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                      </div>
                    </div>

                    <div className="px-4 py-2 flex items-center gap-1.5 flex-wrap">
                      {isPlatformStaff ? (
                        <span className="inline-flex items-center h-5 px-2 rounded text-[10px] font-bold leading-none bg-blue-100 text-blue-800 border border-blue-200">
                          {t('roles.platformAdmin')}
                        </span>
                      ) : isBusinessUser ? (
                        <span className="inline-flex items-center h-5 px-2 rounded text-[10px] font-bold leading-none bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {t('roles.businessPartner')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center h-5 px-2 rounded text-[10px] font-bold leading-none bg-slate-100 text-slate-700 border border-slate-200">
                          {t('auth.clientRole')}
                        </span>
                      )}

                      {user.subscriptionTier && user.subscriptionTier !== 'free' && (
                        <span className="inline-flex items-center h-5 px-2 rounded text-[10px] font-bold leading-none bg-amber-100 text-amber-900 border border-amber-200 uppercase">
                          {user.subscriptionTier === 'client_premium' && 'Premium'}
                          {user.subscriptionTier === 'business_starter' && 'Starter'}
                          {user.subscriptionTier === 'business_pro' && 'Pro'}
                          {user.subscriptionTier === 'business_enterprise' && 'Enterprise'}
                        </span>
                      )}
                    </div>

                    {/* Uniform Lucide Icons Links */}
                    <div className="py-1">
                      {isBusinessUser && (
                        <a
                          href="http://localhost:3102"
                          className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium"
                        >
                          <StoreIcon className="w-4 h-4 shrink-0 text-slate-500" />
                          <span>{t('nav.businessAdmin')}</span>
                        </a>
                      )}

                      {isPlatformStaff && (
                        <a
                          href="http://localhost:3103"
                          className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium"
                        >
                          <Shield className="w-4 h-4 shrink-0 text-slate-500" />
                          <span>{t('nav.platformAdmin')}</span>
                        </a>
                      )}

                      <Link
                        href="/pricing"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium"
                      >
                        <CreditCard className="w-4 h-4 shrink-0 text-slate-500" />
                        <span>{t('account.subscriptionsTab')}</span>
                      </Link>

                      <Link
                        href="/account"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium"
                      >
                        <Settings className="w-4 h-4 shrink-0 text-slate-500" />
                        <span>{t('nav.settings')}</span>
                      </Link>
                    </div>

                    {/* Logout Option */}
                    <div className="border-t border-slate-100 pt-1 mt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors font-semibold text-left"
                      >
                        <LogOut className="w-4 h-4 shrink-0 text-red-500" />
                        <span>{t('common.logout')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
                >
                  <LogIn className="w-4 h-4 shrink-0 text-slate-600" />
                  <span>{t('common.login')}</span>
                </button>

                <a
                  href="http://localhost:3102"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <span>{t('nav.forPartners')}</span>
                </a>
              </div>
            )}

            {/* Subtle Language Dropdown tucked neatly in the top-right corner */}
            <LanguageSelector
              value={locale}
              onChange={handleLanguageChange}
              variant="minimal"
              align="right"
            />
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          api.stores
            .getMyStores()
            .then((sRes) => {
              if (sRes.success && sRes.data) setStores(sRes.data);
            })
            .catch(() => {});
        }}
      />
    </>
  );
};
