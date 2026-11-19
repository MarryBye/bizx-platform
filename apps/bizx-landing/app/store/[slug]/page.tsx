'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '../../lib/api';
import { useTranslation } from '../../hooks/useTranslation';
import { AuthModal } from '../../components/AuthModal';
import type { EnrichedOrderResponse } from '@bizx/api-client';
import {
  formatCompactCount,
  DISPUTE_CATEGORIES,
  CUSTOMER_QUICK_REPLIES,
  type Store,
  type Product,
  type ProductCategory,
  type UserProfile,
  type OrderMessageItem,
  type OrderMessageAttachmentDto,
  type DisputeCategory,
  type StoreReviewsResponse,
  type StorePreviewReadiness
} from '@bizx/common-types';
import { LanguageSelector, OrderChatBox, PhoneInput } from '@bizx/ui';
import {
  Store as StoreIcon,
  ShoppingCart,
  ShoppingBag,
  Star,
  MapPin,
  Phone,
  Plus,
  Minus,
  Trash2,
  MessageSquare,
  MoreVertical,
  AlertTriangle,
  CheckCircle2,
  X,
  RotateCcw,
  ShieldAlert,
  Eye,
  LogIn,
  ArrowLeft,
  Loader2
} from 'lucide-react';

type StorefrontTab = 'catalog' | 'cart' | 'orders' | 'reviews';

interface CartEntry {
  product: Product;
  quantity: number;
}

export default function StorefrontPage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : '';
  const { t, locale, setLocale } = useTranslation();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [reviewsData, setReviewsData] = useState<StoreReviewsResponse | null>(null);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [storeNotFound, setStoreNotFound] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewReadiness, setPreviewReadiness] = useState<StorePreviewReadiness | null>(null);

  const [activeTab, setActiveTab] = useState<StorefrontTab>('catalog');

  // Cart & Checkout
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('+380');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [orderSuccessNum, setOrderSuccessNum] = useState<string | null>(null);

  // Customer Orders for this Store
  const [orders, setOrders] = useState<EnrichedOrderResponse[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<OrderMessageItem[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  // Three-dots (...) dispute submenu
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Dispute modal & Escalation modal
  const [showOpenDisputeModal, setShowOpenDisputeModal] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState<DisputeCategory>('not_received');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');

  // Quick Refund confirmation state
  const [isRespondingRefund, setIsRespondingRefund] = useState(false);

  // Star review widget
  const [draftRating, setDraftRating] = useState(5);
  const [draftReviewComment, setDraftReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [orderNotice, setOrderNotice] = useState<{ text: string; isError?: boolean } | null>(null);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null;

  const formatMoney = (kopecks: number) =>
    (kopecks / 100).toLocaleString(locale === 'en' ? 'en-US' : 'uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  // Load Store, Catalog, Reviews & Auth (supports private BizX Moderation Preview via ?preview=<token>)
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setIsLoadingStore(true);
      setStoreNotFound(false);
      setIsPreviewMode(false);
      setPreviewReadiness(null);
      try {
        const previewToken =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('preview')
            : null;

        const meRes = await api.auth.me().catch(() => ({ success: false, data: null }));
        if (cancelled) return;
        if (meRes.success && meRes.data) {
          setUser(meRes.data);
          setContactName(meRes.data.name || '');
          setContactPhone(meRes.data.phone || '+380');
        }

        if (previewToken) {
          const prevRes = await api.stores
            .getStorePreview(slug, previewToken)
            .catch(() => ({ success: false, data: null }));
          if (cancelled) return;
          if (!prevRes.success || !prevRes.data) {
            setStoreNotFound(true);
            setIsLoadingStore(false);
            return;
          }
          setStore(prevRes.data.store);
          setCategories(prevRes.data.categories || []);
          setProducts(prevRes.data.products || []);
          setPreviewReadiness(prevRes.data.readiness || null);
          setIsPreviewMode(true);
          return;
        }

        const storeRes = await api.stores.getStore(slug).catch(() => ({ success: false, data: null }));
        if (cancelled) return;

        if (!storeRes.success || !storeRes.data) {
          // If the store is draft/pending/suspended, try authenticated staff/owner preview
          const fallbackPreview = await api.stores
            .getStorePreview(slug)
            .catch(() => ({ success: false, data: null }));
          if (cancelled) return;
          if (fallbackPreview.success && fallbackPreview.data) {
            setStore(fallbackPreview.data.store);
            setCategories(fallbackPreview.data.categories || []);
            setProducts(fallbackPreview.data.products || []);
            setPreviewReadiness(fallbackPreview.data.readiness || null);
            setIsPreviewMode(true);
            return;
          }
          setStoreNotFound(true);
          setIsLoadingStore(false);
          return;
        }

        const st = storeRes.data;
        setStore(st);

        const [catRes, prodRes, revRes] = await Promise.all([
          api.products.getCategories(st.id).catch(() => ({ success: false, data: [] })),
          api.products.getStoreProducts(st.id, { page: 1, pageSize: 100 }).catch(() => ({
            success: false,
            data: { items: [] }
          })),
          api.stores.getReviews(st.id).catch(() => ({ success: false, data: null }))
        ]);

        if (cancelled) return;
        if (catRes.success && catRes.data) setCategories(catRes.data);
        if (prodRes.success && (prodRes.data as any)?.items) {
          setProducts(((prodRes.data as any).items as Product[]).filter((p) => p.isActive));
        }
        if (revRes.success && revRes.data) setReviewsData(revRes.data);
      } finally {
        if (!cancelled) setIsLoadingStore(false);
      }
    };

    if (slug) void init();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const loadMyOrders = useCallback(async () => {
    if (!user || !store?.id) {
      setOrders([]);
      setUnreadTotal(0);
      return;
    }
    try {
      const [ordersRes, summaryRes] = await Promise.all([
        api.orders.getMyOrders(store.id),
        api.orders.getMyUnreadSummary(store.id)
      ]);
      if (ordersRes.success && ordersRes.data) {
        setOrders(ordersRes.data);
      }
      if (summaryRes.success && summaryRes.data) {
        setUnreadTotal(summaryRes.data.totalUnreadMessages);
      }
    } catch {
      // ignore
    }
  }, [user, store?.id]);

  useEffect(() => {
    void loadMyOrders();
    if (!user || !store?.id) return;
    const timer = window.setInterval(() => void loadMyOrders(), 15000);
    return () => window.clearInterval(timer);
  }, [loadMyOrders, user, store?.id]);

  // Close (...) menu on outside click
  useEffect(() => {
    if (!isActionsMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isActionsMenuOpen]);

  // Load & poll chat messages while an order is open
  const loadChat = useCallback(
    async (orderId: string, markRead: boolean) => {
      try {
        const res = await api.orders.getMessages(orderId);
        if (res.success && res.data) setChatMessages(res.data);
        if (markRead) {
          const rd = await api.orders.markMessagesRead(orderId).catch(() => null);
          if (rd?.success && rd.data && rd.data.updated > 0) {
            void loadMyOrders();
          }
        }
      } catch {
        // ignore
      }
    },
    [loadMyOrders]
  );

  useEffect(() => {
    if (!selectedOrderId) {
      setChatMessages([]);
      setIsActionsMenuOpen(false);
      setOrderNotice(null);
      return;
    }
    setLoadingChat(true);
    void loadChat(selectedOrderId, true).finally(() => setLoadingChat(false));
    const timer = window.setInterval(() => void loadChat(selectedOrderId, true), 3000);
    return () => window.clearInterval(timer);
  }, [selectedOrderId, loadChat]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreviewMode) {
      setCheckoutError(
        locale === 'en'
          ? 'Checkout is disabled in storefront preview mode'
          : 'Оформлення замовлень недоступне в режимі попереднього перегляду'
      );
      return;
    }
    if (!store || cart.length === 0) return;
    if (!user) {
      setIsAuthOpen(true);
      return;
    }
    setIsPlacingOrder(true);
    setCheckoutError(null);
    try {
      const res = await api.orders.createOrder({
        storeId: store.id,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        deliveryAddress: deliveryAddress.trim() || undefined,
        paymentMethod: 'card',
        notes: orderNotes.trim() || undefined,
        items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity }))
      });
      if (res.success && res.data) {
        setOrderSuccessNum(res.data.orderNumber);
        setCart([]);
        setOrderNotes('');
        await loadMyOrders();
        setActiveTab('orders');
      }
    } catch (err: any) {
      setCheckoutError(err?.data?.message || err?.message || 'Помилка оформлення замовлення');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleOpenDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || disputeDescription.trim().length < 5) return;
    setIsSubmittingDispute(true);
    setOrderNotice(null);
    try {
      const res = await api.orders.openDispute(selectedOrder.id, {
        category: disputeCategory,
        description: disputeDescription.trim()
      });
      if (res.success) {
        setShowOpenDisputeModal(false);
        setDisputeDescription('');
        await Promise.all([loadMyOrders(), loadChat(selectedOrder.id, false)]);
        setOrderNotice({
          text:
            locale === 'en'
              ? 'Dispute opened! The store has been alerted with high priority.'
              : 'Спір відкрито! Заклад отримав термінове сповіщення.'
        });
      }
    } catch (err: any) {
      setOrderNotice({
        text: err?.data?.message || err?.message || 'Не вдалося відкрити спір',
        isError: true
      });
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const handleWithdrawDispute = async () => {
    if (!selectedOrder?.activeDispute) return;
    setIsActionsMenuOpen(false);
    setOrderNotice(null);
    try {
      const res = await api.orders.withdrawDispute(
        selectedOrder.id,
        selectedOrder.activeDispute.id
      );
      if (res.success) {
        await Promise.all([loadMyOrders(), loadChat(selectedOrder.id, false)]);
        setOrderNotice({
          text:
            locale === 'en'
              ? 'Dispute withdrawn — closed without consequences for the business.'
              : 'Скаргу відкликано — спір закрито без наслідків для бізнесу.'
        });
      }
    } catch (err: any) {
      setOrderNotice({ text: err?.data?.message || err?.message || 'Помилка', isError: true });
    }
  };

  const handleEscalateDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder?.activeDispute) return;
    setIsSubmittingDispute(true);
    setOrderNotice(null);
    try {
      const res = await api.orders.escalateDispute(
        selectedOrder.id,
        selectedOrder.activeDispute.id,
        { reason: escalateReason.trim() || undefined }
      );
      if (res.success) {
        setShowEscalateModal(false);
        setEscalateReason('');
        await Promise.all([loadMyOrders(), loadChat(selectedOrder.id, false)]);
        setOrderNotice({
          text:
            locale === 'en'
              ? 'Escalated to BizX Arbitration! Our team will review the chat and resolve the case.'
              : 'Скаргу передано в службу BizX! Співробітники перевірять переписку та приймуть рішення.'
        });
      }
    } catch (err: any) {
      setOrderNotice({ text: err?.data?.message || err?.message || 'Помилка', isError: true });
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const handleRespondRefund = async (accept: boolean) => {
    if (!selectedOrder) return;
    setIsRespondingRefund(true);
    setOrderNotice(null);
    try {
      const res = await api.orders.respondRefundOffer(selectedOrder.id, { accept });
      if (res.success) {
        await Promise.all([loadMyOrders(), loadChat(selectedOrder.id, false)]);
        setOrderNotice({
          text: accept
            ? locale === 'en'
              ? 'Refund confirmed! Order cancelled and funds returned.'
              : 'Повернення підтверджено! Замовлення скасовано, кошти повернуто.'
            : locale === 'en'
              ? 'Refund offer declined.'
              : 'Пропозицію повернення відхилено.'
        });
      }
    } catch (err: any) {
      setOrderNotice({ text: err?.data?.message || err?.message || 'Помилка', isError: true });
    } finally {
      setIsRespondingRefund(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !store) return;
    setIsSubmittingReview(true);
    setOrderNotice(null);
    try {
      const res = await api.orders.createReview(selectedOrder.id, {
        rating: draftRating,
        comment: draftReviewComment.trim() || undefined
      });
      if (res.success) {
        setDraftReviewComment('');
        await loadMyOrders();
        const revRes = await api.stores.getReviews(store.id).catch(() => null);
        if (revRes?.success && revRes.data) setReviewsData(revRes.data);
        setOrderNotice({
          text: locale === 'en' ? 'Thank you for your rating!' : 'Дякуємо за вашу оцінку!'
        });
      }
    } catch (err: any) {
      setOrderNotice({ text: err?.data?.message || err?.message || 'Помилка', isError: true });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const filteredProducts = selectedCatId
    ? products.filter((p) => p.categoryId === selectedCatId)
    : products;

  if (isLoadingStore) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-slate-900" />
        <span className="text-xs font-bold text-slate-500">{t('common.loading')}</span>
      </div>
    );
  }

  if (storeNotFound || !store) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <StoreIcon className="w-10 h-10 text-slate-300 mx-auto" />
          <h1 className="text-lg font-black text-slate-900">
            {locale === 'en' ? 'Store not found' : 'Заклад не знайдено'}
          </h1>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('nav.home')}</span>
          </Link>
        </div>
      </div>
    );
  }

  const displayRating = reviewsData?.ratingAvg ?? store.ratingAvg ?? 0;
  const displayRatingCount = reviewsData?.ratingCount ?? store.ratingCount ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Moderation / Staff Private Storefront Preview Banner */}
      {isPreviewMode && (
        <div className="bg-amber-950 text-amber-50 border-b border-amber-800 px-4 py-3">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-start sm:items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-black text-amber-200 uppercase tracking-wider mr-2">
                  Режим попереднього перегляду ({store.status})
                </span>
                <span className="text-amber-100/90">
                  Ця сторінка доступна лише співробітникам BizX та власнику. Покупці її ще не бачать.
                </span>
              </div>
            </div>

            {previewReadiness && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                <span
                  className={`px-2 py-0.5 rounded ${
                    previewReadiness.hasLogo ? 'bg-emerald-800 text-emerald-100' : 'bg-amber-900 text-amber-300'
                  }`}
                >
                  {previewReadiness.hasLogo ? '✓ Лого' : '✕ Лого'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded ${
                    previewReadiness.hasBanner ? 'bg-emerald-800 text-emerald-100' : 'bg-amber-900 text-amber-300'
                  }`}
                >
                  {previewReadiness.hasBanner ? '✓ Банер' : '✕ Банер'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded ${
                    previewReadiness.hasDescription ? 'bg-emerald-800 text-emerald-100' : 'bg-amber-900 text-amber-300'
                  }`}
                >
                  {previewReadiness.hasDescription ? '✓ Опис' : '✕ Опис'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded ${
                    previewReadiness.hasContacts ? 'bg-emerald-800 text-emerald-100' : 'bg-amber-900 text-amber-300'
                  }`}
                >
                  {previewReadiness.hasContacts ? '✓ Контакти' : '✕ Контакти'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded ${
                    previewReadiness.productsCount > 0 ? 'bg-emerald-800 text-emerald-100' : 'bg-rose-900 text-rose-200'
                  }`}
                >
                  Товарів: {previewReadiness.productsCount}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Store Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white overflow-hidden flex items-center justify-center shrink-0">
              {store.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={api.storage.resolveMediaUrl(store.logoUrl) || ''}
                  alt={store.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <StoreIcon className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-black text-sm text-slate-900 truncate">{store.name}</div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {store.customDomain && store.customDomainVerified
                  ? store.customDomain
                  : `${store.slug}.bizx.ua`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <Link
                href="/account"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800"
              >
                <span className="max-w-[120px] truncate">{user.name}</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('common.login')}</span>
              </button>
            )}
            <LanguageSelector
              value={locale}
              onChange={(next) => {
                setLocale(next);
                if (user) api.auth.updateProfile({ preferredLanguage: next }).catch(() => {});
              }}
              variant="minimal"
              align="right"
            />
          </div>
        </div>
      </header>

      {/* Store Hero Banner & Info */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-4">
          {store.bannerUrl && (
            <div className="w-full h-36 sm:h-48 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={api.storage.resolveMediaUrl(store.bannerUrl) || ''}
                alt={store.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">{store.name}</h1>
                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors"
                >
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  <span>{displayRating.toFixed(1)}</span>
                  <span className="text-amber-700/80 font-medium">({displayRatingCount})</span>
                </button>
              </div>
              {store.description && (
                <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">{store.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                {store.address && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {store.address}
                  </span>
                )}
                {store.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {store.phone}
                  </span>
                )}
              </div>
            </div>

            {/* Storefront Section Tabs */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-bold self-start md:self-auto flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'catalog'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <StoreIcon className="w-3.5 h-3.5" />
                <span>{locale === 'en' ? 'Catalog' : 'Каталог'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('cart')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'cart'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{t('nav.cart')}</span>
                {cartCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-white text-[10px]">
                    {cartCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('orders');
                  if (!user) setIsAuthOpen(true);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'orders'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{t('nav.orders')}</span>
                {unreadTotal > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px]">
                    {formatCompactCount(unreadTotal)}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                  activeTab === 'reviews'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>{locale === 'en' ? 'Reviews' : 'Відгуки'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* TAB 1: CATALOG */}
        {activeTab === 'catalog' && (
          <div className="space-y-5">
            {categories.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedCatId(null)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    selectedCatId === null
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {t('products.allCategories')}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCatId(cat.id)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      selectedCatId === cat.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((p) => {
                const inCart = cart.find((c) => c.product.id === p.id)?.quantity || 0;
                return (
                  <div
                    key={p.id}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col"
                  >
                    <div className="h-44 bg-slate-100 flex items-center justify-center overflow-hidden">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={api.storage.resolveMediaUrl(p.imageUrl) || ''}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <StoreIcon className="w-10 h-10 text-slate-300" />
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{p.name}</h3>
                        {p.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-base font-black text-slate-900">
                            {formatMoney(p.price)} ₴
                          </span>
                          {p.oldPrice && (
                            <span className="ml-1.5 text-xs text-slate-400 line-through">
                              {formatMoney(p.oldPrice)} ₴
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => addToCart(p)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            inCart > 0
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          {inCart > 0 ? `+${inCart}` : t('mobile.addToCart')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CART & CHECKOUT (WITH ORDER COMMENT) */}
        {activeTab === 'cart' && (
          <div className="max-w-2xl mx-auto">
            {cart.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3">
                <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto" />
                <h2 className="text-base font-bold text-slate-800">{t('mobile.emptyCart')}</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold"
                >
                  {locale === 'en' ? 'Browse catalog' : 'Перейти до каталогу'}
                </button>
              </div>
            ) : (
              <form
                onSubmit={handlePlaceOrder}
                className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5"
              >
                <h2 className="text-lg font-black text-slate-900">{t('mobile.checkout')}</h2>

                {checkoutError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                    {checkoutError}
                  </div>
                )}

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {cart.map((entry) => (
                    <div
                      key={entry.product.id}
                      className="p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate">{entry.product.name}</div>
                        <div className="text-slate-500">{formatMoney(entry.product.price)} ₴</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateCartQty(entry.product.id, -1)}
                          className="p-1 rounded border border-slate-200 hover:bg-slate-100"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center font-bold">{entry.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(entry.product.id, 1)}
                          className="p-1 rounded border border-slate-200 hover:bg-slate-100"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCartQty(entry.product.id, -entry.quantity)}
                          className="p-1 text-slate-400 hover:text-red-600 ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">{t('mobile.contactName')} *</label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">{t('mobile.contactPhone')} *</label>
                    <PhoneInput value={contactPhone} onChange={setContactPhone} required locale={locale} />
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <label className="font-bold text-slate-700">{t('mobile.deliveryAddress')}</label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder={locale === 'en' ? 'City, street, apartment...' : 'Місто, вулиця або відділення пошти...'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="space-y-1 text-xs">
                  <label className="font-bold text-slate-700">{t('mobile.orderNotes')}</label>
                  <textarea
                    rows={2}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder={
                      locale === 'en'
                        ? 'Delivery instructions, packaging notes, preferred time...'
                        : 'Побажання щодо замовлення, пакування чи часу доставки...'
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-slate-500">{t('mobile.totalToPay')}</div>
                    <div className="text-xl font-black text-slate-900">{formatMoney(cartTotal)} ₴</div>
                  </div>
                  <button
                    type="submit"
                    disabled={isPlacingOrder}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-50"
                  >
                    {isPlacingOrder
                      ? t('common.loading')
                      : !user
                        ? t('common.login')
                        : t('mobile.checkout')}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: CUSTOMER ORDERS + CHAT + DISPUTES + QUICK REFUND + STAR RATING */}
        {activeTab === 'orders' && (
          <div className="max-w-4xl mx-auto space-y-4">
            {orderSuccessNum && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {t('mobile.orderPlaced')} ({orderSuccessNum})
                </span>
                <button type="button" onClick={() => setOrderSuccessNum(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {!user ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-800">
                  {locale === 'en'
                    ? 'Sign in to view your orders and message support'
                    : 'Увійдіть в акаунт, щоб переглядати замовлення та спілкуватися із закладом'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsAuthOpen(true)}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold"
                >
                  {t('common.login')}
                </button>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-2">
                <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">{t('mobile.noOrdersYet')}</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs divide-y divide-slate-100 overflow-hidden">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {ord.orderNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {t(`statuses.order.${ord.status}`)}
                        </span>
                        {ord.activeDispute && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                            <AlertTriangle className="w-3 h-3" />
                            {t(`disputes.statuses.${ord.activeDispute.status}`)}
                          </span>
                        )}
                        {ord.refundOfferStatus === 'pending_customer' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            <RotateCcw className="w-3 h-3" />
                            {locale === 'en' ? 'Confirm Refund' : 'Підтвердіть повернення'}
                          </span>
                        )}
                        {ord.review && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                            {ord.review.rating}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {new Date(ord.createdAt).toLocaleString(locale === 'en' ? 'en-US' : 'uk-UA')}{' '}
                        • {ord.itemsCount} {t('common.pcs')}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <span className="font-black text-sm text-slate-900">
                        {formatMoney(ord.totalAmount)} ₴
                      </span>
                      {(ord.unreadCount || 0) > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                          <MessageSquare className="w-3 h-3" />
                          {formatCompactCount(ord.unreadCount || 0)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(ord.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{locale === 'en' ? 'Chat & Details' : 'Чат та деталі'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: STORE REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {locale === 'en' ? 'Customer Reviews' : 'Відгуки покупців'}
                </h2>
                <p className="text-xs text-slate-500">
                  {locale === 'en'
                    ? 'Only verified customers with delivered orders can rate a store.'
                    : 'Оцінку можуть залишити лише покупці після успішно виконаного замовлення.'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-slate-900 flex items-center gap-1.5 justify-end">
                  <Star className="w-6 h-6 text-amber-500 fill-amber-400" />
                  <span>{displayRating.toFixed(1)}</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {displayRatingCount} {locale === 'en' ? 'reviews' : 'оцінок'}
                </div>
              </div>
            </div>

            {reviewsData && reviewsData.reviews.length > 0 ? (
              <div className="space-y-3">
                {reviewsData.reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">{rev.customerName}</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= rev.rating ? 'text-amber-500 fill-amber-400' : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {rev.comment && <p className="text-xs text-slate-700">{rev.comment}</p>}
                    <p className="text-[10px] text-slate-400">
                      {new Date(rev.createdAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'uk-UA')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center text-xs text-slate-400">
                {locale === 'en' ? 'No reviews yet' : 'Відгуків поки немає'}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ORDER DETAIL + CHAT + THREE-DOTS DISPUTE MENU MODAL */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setSelectedOrderId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl max-h-[92vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header with (...) Dispute Menu */}
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-black text-slate-900 font-mono">
                    {selectedOrder.orderNumber}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-800">
                    {t(`statuses.order.${selectedOrder.status}`)}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {formatMoney(selectedOrder.totalAmount)} ₴ •{' '}
                  {new Date(selectedOrder.createdAt).toLocaleString(locale === 'en' ? 'en-US' : 'uk-UA')}
                </p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* 3-Dots Submenu for Dispute / Withdraw / Escalate */}
                {!(selectedOrder.status === 'cancelled' && selectedOrder.paymentStatus === 'refunded') && (
                  <div ref={actionsMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsActionsMenuOpen((prev) => !prev)}
                      aria-label="Order options"
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isActionsMenuOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-xs">
                        {!selectedOrder.activeDispute ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsActionsMenuOpen(false);
                              setShowOpenDisputeModal(true);
                            }}
                            className="w-full px-3.5 py-2 text-left text-rose-700 hover:bg-rose-50 font-bold flex items-center gap-2"
                          >
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>
                              {locale === 'en'
                                ? 'Open a dispute / report issue'
                                : 'Відкрити спір / поскаржитись'}
                            </span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleWithdrawDispute()}
                              className="w-full px-3.5 py-2 text-left text-emerald-700 hover:bg-emerald-50 font-bold flex items-center gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              <span>
                                {locale === 'en'
                                  ? 'Issue resolved — withdraw dispute'
                                  : 'Питання вирішено — відкликати скаргу'}
                              </span>
                            </button>
                            {selectedOrder.activeDispute.status === 'open_store' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsActionsMenuOpen(false);
                                  setShowEscalateModal(true);
                                }}
                                className="w-full px-3.5 py-2 text-left text-rose-700 hover:bg-rose-50 font-bold flex items-center gap-2 border-t border-slate-100"
                              >
                                <ShieldAlert className="w-4 h-4 shrink-0" />
                                <span>
                                  {locale === 'en'
                                    ? 'Not resolved — escalate to BizX'
                                    : 'Питання не вирішено — передати в BizX'}
                                </span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedOrderId(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {orderNotice && (
                <div
                  className={`p-3 rounded-xl text-xs border flex items-center gap-2 ${
                    orderNotice.isError
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{orderNotice.text}</span>
                </div>
              )}

              {/* Quick Refund Offer Confirmation Card */}
              {selectedOrder.refundOfferStatus === 'pending_customer' && (
                <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 space-y-2.5 text-xs">
                  <div className="font-black text-amber-950 flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-amber-600" />
                    <span>
                      {locale === 'en'
                        ? `Business offered a Quick Refund: ${formatMoney(selectedOrder.refundOfferAmount ?? selectedOrder.totalAmount)} ₴`
                        : `Заклад пропонує швидке повернення: ${formatMoney(selectedOrder.refundOfferAmount ?? selectedOrder.totalAmount)} ₴`}
                    </span>
                  </div>
                  {selectedOrder.refundOfferReason && (
                    <p className="text-amber-900">{selectedOrder.refundOfferReason}</p>
                  )}
                  <p className="text-[11px] text-amber-800/80">
                    {locale === 'en'
                      ? 'Confirming cancels the order, returns funds immediately, and closes any open dispute.'
                      : 'Після підтвердження замовлення буде скасовано, кошти повернуто, а спір закрито.'}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isRespondingRefund}
                      onClick={() => void handleRespondRefund(true)}
                      className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold disabled:opacity-50"
                    >
                      {locale === 'en' ? 'Confirm Refund' : 'Підтвердити повернення'}
                    </button>
                    <button
                      type="button"
                      disabled={isRespondingRefund}
                      onClick={() => void handleRespondRefund(false)}
                      className="px-3.5 py-2 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-950 font-bold disabled:opacity-50"
                    >
                      {locale === 'en' ? 'Decline' : 'Відхилити'}
                    </button>
                  </div>
                </div>
              )}

              {/* Active Dispute Banner */}
              {selectedOrder.activeDispute && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 space-y-1 text-xs">
                  <div className="font-black text-red-900 flex items-center justify-between gap-2">
                    <span>{t(`disputes.statuses.${selectedOrder.activeDispute.status}`)}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-800">
                      {t(`disputes.categories.${selectedOrder.activeDispute.category}`)}
                    </span>
                  </div>
                  <p className="text-red-950">{selectedOrder.activeDispute.description}</p>
                </div>
              )}

              {/* Star Rating Widget — ONLY on Delivered orders! */}
              {selectedOrder.status === 'delivered' && !selectedOrder.review && (
                <form
                  onSubmit={handleSubmitReview}
                  className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2.5 text-xs"
                >
                  <div className="font-bold text-slate-900">
                    {locale === 'en' ? 'Rate your experience with this store:' : 'Оцініть роботу закладу:'}
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setDraftRating(s)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            s <= draftRating ? 'text-amber-500 fill-amber-400' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 font-black text-slate-800">{draftRating} / 5</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={draftReviewComment}
                      onChange={(e) => setDraftReviewComment(e.target.value)}
                      placeholder={
                        locale === 'en' ? 'Optional comment...' : 'Коментар (необов’язково)...'
                      }
                      className="flex-1 px-3 py-1.5 bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-slate-900"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold shrink-0"
                    >
                      {locale === 'en' ? 'Submit Rating' : 'Оцінити'}
                    </button>
                  </div>
                </form>
              )}

              {selectedOrder.review && (
                <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-800">
                    {locale === 'en' ? 'Your rating:' : 'Ваша оцінка:'}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${
                          s <= selectedOrder.review!.rating
                            ? 'text-amber-500 fill-amber-400'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Order Items & Comment */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                {(selectedOrder.items || []).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2">
                    <span className="text-slate-700 font-medium">
                      {item.productName} × {item.quantity}
                    </span>
                    <span className="font-bold text-slate-900">{formatMoney(item.totalPrice)} ₴</span>
                  </div>
                ))}
                {selectedOrder.notes && (
                  <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600">
                    <strong>{t('orders.notes')}:</strong> {selectedOrder.notes}
                  </div>
                )}
              </div>

              {/* Order Messenger */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-slate-600" />
                  <span>
                    {locale === 'en'
                      ? 'Support Chat for this Order'
                      : 'Чат підтримки по замовленню'}
                  </span>
                </h3>
                <OrderChatBox
                  messages={chatMessages}
                  viewerRole="customer"
                  canSend={true}
                  quickReplies={CUSTOMER_QUICK_REPLIES[locale]}
                  locale={locale}
                  isLoading={loadingChat}
                  resolveMediaUrl={(u) => api.storage.resolveMediaUrl(u) || u}
                  onSendMessage={async (dto: {
                    body?: string;
                    attachments?: OrderMessageAttachmentDto[];
                  }) => {
                    const res = await api.orders.sendMessage(selectedOrder.id, dto);
                    if (res.success && res.data) {
                      setChatMessages((prev) => [...prev, res.data]);
                    }
                  }}
                  onUploadAttachment={async (file: File) => {
                    const res = await api.orders.uploadChatAttachment(selectedOrder.id, file);
                    if (!res.success || !res.data) throw new Error('Upload failed');
                    return res.data;
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Open Dispute Modal */}
      {showOpenDisputeModal && selectedOrder && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          onClick={() => setShowOpenDisputeModal(false)}
        >
          <form
            onSubmit={handleOpenDispute}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-rose-950">
                {locale === 'en' ? 'Open a Dispute' : 'Відкрити спір по замовленню'}
              </h3>
              <button type="button" onClick={() => setShowOpenDisputeModal(false)}>
                <X className="w-4 h-4 text-rose-600" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">
                  {locale === 'en' ? 'Select issue category:' : 'Оберіть причину скарги:'}
                </label>
                <div className="space-y-1.5">
                  {DISPUTE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setDisputeCategory(cat)}
                      className={`w-full px-3 py-2 rounded-xl border text-left font-semibold transition-all ${
                        disputeCategory === cat
                          ? 'border-rose-600 bg-rose-50 text-rose-900'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t(`disputes.categories.${cat}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">
                  {locale === 'en' ? 'Describe the problem *' : 'Опишіть проблему детальніше *'}
                </label>
                <textarea
                  required
                  minLength={5}
                  rows={3}
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  placeholder={
                    locale === 'en'
                      ? 'What went wrong with your order? You can also attach photos in the chat.'
                      : 'Що саме сталось? Фото-докази можна додати прямо у чаті замовлення.'
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOpenDisputeModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 font-bold text-slate-600"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDispute}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50"
                >
                  {isSubmittingDispute
                    ? t('common.loading')
                    : locale === 'en'
                      ? 'Submit Dispute'
                      : 'Відкрити спір'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Escalate to BizX Modal */}
      {showEscalateModal && selectedOrder?.activeDispute && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
          onClick={() => setShowEscalateModal(false)}
        >
          <form
            onSubmit={handleEscalateDispute}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-black">
                {locale === 'en' ? 'Escalate to BizX Arbitration' : 'Передати скаргу в BizX'}
              </h3>
              <button type="button" onClick={() => setShowEscalateModal(false)}>
                <X className="w-4 h-4 text-white/80" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                {locale === 'en'
                  ? 'BizX staff will gain access to this order, full chat history, and attachments to make a fair decision and process a refund if needed.'
                  : 'Співробітники BizX отримають доступ до цього замовлення, повної переписки та фото, щоб об’єктивно розглянути ситуацію і повернути кошти в разі порушення з боку закладу.'}
              </p>
              <textarea
                rows={3}
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                placeholder={
                  locale === 'en'
                    ? 'Optional comment for BizX team...'
                    : 'Додатковий коментар для команди BizX (необов’язково)...'
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-slate-900"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEscalateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 font-bold text-slate-600"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDispute}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50"
                >
                  {isSubmittingDispute
                    ? t('common.loading')
                    : locale === 'en'
                      ? 'Confirm Escalation'
                      : 'Передати в BizX'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          setContactName(loggedUser.name || '');
          setContactPhone(loggedUser.phone || '+380');
        }}
      />
    </div>
  );
}
