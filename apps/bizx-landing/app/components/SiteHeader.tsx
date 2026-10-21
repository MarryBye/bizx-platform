'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { api } from '../lib/api';
import type { UserProfile, Store } from '@bizx/common-types';
import { AuthModal } from './AuthModal';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';

export const SiteHeader: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const res = await api.auth.me();
      if (res.success && res.data) {
        setUser(res.data);
        // Load user stores to verify if user has businesses
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

    // Listen to unauthorized event
    const handleUnauthorized = () => {
      setUser(null);
      setStores([]);
    };

    window.addEventListener('bizx:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('bizx:unauthorized', handleUnauthorized);
    };
  }, []);

  // Close dropdown on click outside
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

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore
    }
    // Clean all tokens from localStorage across all portals
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bizx_access_token');
      localStorage.removeItem('bizx_admin_access_token');
    }
    setUser(null);
    setStores([]);
    setIsDropdownOpen(false);
    window.location.reload();
  };

  // Determine user permissions
  const isBusinessUser = user?.role === 'business_owner' || stores.length > 0;

  const isPlatformStaff = user?.role === 'admin' || user?.systemRole === 'platform_admin';

  // Compute initials
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
              Можливості
            </Link>
            <Link href="/#benefits" className="hover:text-slate-900 transition-colors">
              Для бізнесу
            </Link>
            <Link href="/#process" className="hover:text-slate-900 transition-colors">
              Як це працює
            </Link>
            <Link href="/#contacts" className="hover:text-slate-900 transition-colors">
              Контакти
            </Link>
          </nav>

          {/* Header Actions / User Menu */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="w-28 h-8 bg-slate-100 animate-pulse rounded-md" />
            ) : user ? (
              /* User is Logged In: Dropdown Menu */
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm text-left"
                >
                  <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                    {getInitials(user.name)}
                  </div>
                  <span className="text-xs font-bold text-slate-900 max-w-[140px] truncate">
                    {user.name || user.email}
                  </span>
                  <KeyboardArrowDownOutlinedIcon
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isDropdownOpen ? 'rotate-180 text-slate-900' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Content */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-fade-in text-xs">
                    {/* User Profile Summary */}
                    <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                      <div className="font-bold text-slate-900 truncate">
                        {user.name || 'Користувач'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                      <div className="mt-1.5">
                        {isPlatformStaff ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                            BizX Staff
                          </span>
                        ) : isBusinessUser ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Бізнес-партнер
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            Клієнт
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Links */}
                    <div className="py-1">
                      {/* Business Panel Link (if business owner or has stores) */}
                      {isBusinessUser && (
                        <a
                          href="http://localhost:3102"
                          className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium"
                        >
                          <StorefrontOutlinedIcon className="w-4 h-4 text-slate-500" />
                          <span>Перейти в панель бізнесу</span>
                        </a>
                      )}

                      {/* BizX Platform Admin Link (if BizX employee / platform admin) */}
                      {isPlatformStaff && (
                        <a
                          href="http://localhost:3103"
                          className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium"
                        >
                          <ShieldOutlinedIcon className="w-4 h-4 text-blue-600" />
                          <span>BizX Panel</span>
                        </a>
                      )}

                      {/* Account Settings */}
                      <Link
                        href="/account"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors font-medium"
                      >
                        <SettingsOutlinedIcon className="w-4 h-4 text-slate-500" />
                        <span>Налаштування акаунта</span>
                      </Link>
                    </div>

                    {/* Logout Option */}
                    <div className="border-t border-slate-100 pt-1 mt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors font-semibold text-left"
                      >
                        <LogoutOutlinedIcon className="w-4 h-4 text-red-500" />
                        <span>Вийти</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* User is NOT Logged In: "Увійти в акаунт" */
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm"
                >
                  <LoginOutlinedIcon className="w-4 h-4 text-slate-600" />
                  <span>Увійти в акаунт</span>
                </button>

                <a
                  href="http://localhost:3102"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <span>Для партнерів</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Login / Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          api.stores.getMyStores().then((sRes) => {
            if (sRes.success && sRes.data) setStores(sRes.data);
          }).catch(() => {});
        }}
      />
    </>
  );
};
