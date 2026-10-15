import { create } from 'zustand';
import { api } from '../lib/api';
import type {
  Store,
  Product,
  ProductCategory,
  OrderResponse,
  StoreAnalytics,
  CreateProductDto,
  UpdateProductDto,
  UpdateStoreDto,
  OrderStatus,
  PaymentStatus
} from '@bizx/common-types';

interface BusinessState {
  stores: Store[];
  activeStoreId: string | null;
  activeStore: Store | null;
  analytics: StoreAnalytics | null;
  products: Product[];
  categories: ProductCategory[];
  orders: OrderResponse[];
  isLoading: boolean;
  error: string | null;

  fetchStores: () => Promise<void>;
  setActiveStore: (storeId: string) => void;
  fetchStoreData: (storeId: string) => Promise<void>;
  createProduct: (dto: CreateProductDto, imageFile?: File) => Promise<boolean>;
  updateProduct: (id: string, dto: UpdateProductDto, imageFile?: File) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  uploadStoreMedia: (type: 'logo' | 'banner', file: File) => Promise<boolean>;
  updateStore: (dto: UpdateStoreDto) => Promise<boolean>;
  updateOrderStatus: (
    orderId: string,
    status?: OrderStatus,
    paymentStatus?: PaymentStatus
  ) => Promise<boolean>;
}

export const useBusinessStore = create<BusinessState>((set, get) => ({
  stores: [],
  activeStoreId: null,
  activeStore: null,
  analytics: null,
  products: [],
  categories: [],
  orders: [],
  isLoading: false,
  error: null,

  fetchStores: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.stores.getMyStores();
      if (res.success && res.data) {
        const stores = res.data;
        const currentActiveId = get().activeStoreId;
        const activeStore =
          stores.find((s) => s.id === currentActiveId) || stores[0] || null;

        set({
          stores,
          activeStoreId: activeStore ? activeStore.id : null,
          activeStore,
          isLoading: false
        });

        if (activeStore) {
          void get().fetchStoreData(activeStore.id);
        }
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      set({ error: err.message || 'Не вдалося завантажити список магазинів', isLoading: false });
    }
  },

  setActiveStore: (storeId: string) => {
    const store = get().stores.find((s) => s.id === storeId) || null;
    set({ activeStoreId: storeId, activeStore: store });
    if (storeId) {
      void get().fetchStoreData(storeId);
    }
  },

  fetchStoreData: async (storeId: string) => {
    set({ isLoading: true, error: null });
    try {
      const [analyticsRes, productsRes, categoriesRes, ordersRes] = await Promise.all([
        api.analytics.getStoreAnalytics(storeId, 'all').catch(() => ({ success: false, data: null })),
        api.products.getStoreProducts(storeId, { page: 1, pageSize: 100 }).catch(() => ({ success: false, data: { items: [] } })),
        api.products.getCategories(storeId).catch(() => ({ success: false, data: [] })),
        api.orders.getStoreOrders(storeId).catch(() => ({ success: false, data: [] }))
      ]);

      set({
        analytics: (analyticsRes as any)?.data || null,
        products: (productsRes as any)?.data?.items || [],
        categories: (categoriesRes as any)?.data || [],
        orders: (ordersRes as any)?.data || [],
        isLoading: false
      });
    } catch (err: any) {
      set({ error: err.message || 'Помилка завантаження даних магазину', isLoading: false });
    }
  },

  createProduct: async (dto: CreateProductDto, imageFile?: File) => {
    const storeId = get().activeStoreId;
    if (!storeId) return false;

    set({ isLoading: true, error: null });
    try {
      const res = await api.products.createProduct(storeId, dto);
      if (res.success && res.data) {
        const newProduct = res.data;

        // Якщо додано файл фотографії, завантажуємо її в R2
        if (imageFile) {
          const imgRes = await api.products.uploadImage(newProduct.id, imageFile);
          if (imgRes.success && imgRes.data) {
            newProduct.imageUrl = imgRes.data.imageUrl;
          }
        }

        set((state) => ({
          products: [newProduct, ...state.products],
          isLoading: false
        }));
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.message || 'Не вдалося створити товар', isLoading: false });
      return false;
    }
  },

  updateProduct: async (id: string, dto: UpdateProductDto, imageFile?: File) => {
    set({ isLoading: true, error: null });
    try {
      if (imageFile) {
        await api.products.uploadImage(id, imageFile);
      }
      const res = await api.products.updateProduct(id, dto);
      if (res.success && res.data) {
        const updated = res.data;
        set((state) => ({
          products: state.products.map((p) => (p.id === id ? updated : p)),
          isLoading: false
        }));
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.message || 'Не вдалося оновити товар', isLoading: false });
      return false;
    }
  },

  deleteProduct: async (id: string) => {
    try {
      const res = await api.products.deleteProduct(id);
      if (res.success) {
        set((state) => ({
          products: state.products.filter((p) => p.id !== id)
        }));
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.message || 'Не вдалося видалити товар' });
      return false;
    }
  },

  uploadStoreMedia: async (type: 'logo' | 'banner', file: File) => {
    const storeId = get().activeStoreId;
    if (!storeId) return false;

    set({ isLoading: true, error: null });
    try {
      const res =
        type === 'logo'
          ? await api.stores.uploadLogo(storeId, file)
          : await api.stores.uploadBanner(storeId, file);

      if (res.success && res.data) {
        const updated = res.data;
        set((state) => ({
          activeStore: updated,
          stores: state.stores.map((s) => (s.id === storeId ? updated : s)),
          isLoading: false
        }));
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.message || `Не вдалося завантажити ${type}`, isLoading: false });
      return false;
    }
  },

  updateStore: async (dto: UpdateStoreDto) => {
    const storeId = get().activeStoreId;
    if (!storeId) return false;

    set({ isLoading: true, error: null });
    try {
      const res = await api.stores.updateStore(storeId, dto);
      if (res.success && res.data) {
        const updated = res.data;
        set((state) => ({
          activeStore: updated,
          stores: state.stores.map((s) => (s.id === storeId ? updated : s)),
          isLoading: false
        }));
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.message || 'Не вдалося оновити магазин', isLoading: false });
      return false;
    }
  },

  updateOrderStatus: async (
    orderId: string,
    status?: OrderStatus,
    paymentStatus?: PaymentStatus
  ) => {
    try {
      const res = await api.orders.updateStatus(orderId, { status, paymentStatus });
      if (res.success && res.data) {
        const updated = res.data;
        set((state) => ({
          orders: state.orders.map((o) => (o.id === orderId ? updated : o))
        }));
        return true;
      }
      return false;
    } catch (err: any) {
      set({ error: err.message || 'Не вдалося оновити статус замовлення' });
      return false;
    }
  }
}));
