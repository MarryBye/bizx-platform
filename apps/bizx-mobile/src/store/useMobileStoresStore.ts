import { create } from 'zustand';
import { mobileApi } from '../lib/api';
import type {
  Store,
  StoreCategory,
  Product,
  ProductCategory
} from '@bizx/common-types';
import type { CustomerOrderSummary } from '@bizx/api-client';

interface MobileStoresState {
  stores: Store[];
  categories: StoreCategory[];
  selectedCategoryId: string | null;
  searchQuery: string;

  selectedStore: Store | null;
  storeProducts: Product[];
  storeCategories: ProductCategory[];
  selectedProductCategoryId: string | null;

  myOrders: CustomerOrderSummary[];
  isLoading: boolean;
  error: string | null;

  fetchInitialData: () => Promise<void>;
  selectStore: (store: Store | null) => Promise<void>;
  setSelectedCategoryId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedProductCategoryId: (id: string | null) => void;
  fetchMyOrders: () => Promise<void>;
}

export const useMobileStoresStore = create<MobileStoresState>((set, get) => ({
  stores: [],
  categories: [],
  selectedCategoryId: null,
  searchQuery: '',

  selectedStore: null,
  storeProducts: [],
  storeCategories: [],
  selectedProductCategoryId: null,

  myOrders: [],
  isLoading: false,
  error: null,

  fetchInitialData: async () => {
    set({ isLoading: true, error: null });
    try {
      const [categoriesRes, storesRes] = await Promise.all([
        mobileApi.stores.getCategories().catch(() => ({ success: false, data: [] })),
        mobileApi.stores.getStores({ page: 1, pageSize: 50 }).catch(() => ({ success: false, data: { items: [] } }))
      ]);

      set({
        categories: categoriesRes.data || [],
        stores: (storesRes.data as any)?.items || [],
        isLoading: false
      });
    } catch (err: any) {
      set({ error: err.message || 'Не вдалося завантажити дані', isLoading: false });
    }
  },

  selectStore: async (store: Store | null) => {
    set({ selectedStore: store, storeProducts: [], storeCategories: [], selectedProductCategoryId: null });
    if (!store) return;

    set({ isLoading: true });
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        mobileApi.products.getStoreProducts(store.id, { page: 1, pageSize: 100 }).catch(() => ({ success: false, data: { items: [] } })),
        mobileApi.products.getCategories(store.id).catch(() => ({ success: false, data: [] }))
      ]);

      set({
        storeProducts: (productsRes.data as any)?.items || [],
        storeCategories: categoriesRes.data || [],
        isLoading: false
      });
    } catch {
      set({ isLoading: false });
    }
  },

  setSelectedCategoryId: (id: string | null) => {
    set({ selectedCategoryId: id });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSelectedProductCategoryId: (id: string | null) => {
    set({ selectedProductCategoryId: id });
  },

  fetchMyOrders: async () => {
    try {
      const res = await mobileApi.orders.getMyOrders();
      if (res.success && res.data) {
        set({ myOrders: res.data });
      }
    } catch {
      // Ignore
    }
  }
}));
