import { create } from 'zustand';
import type { Product } from '@bizx/common-types';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  storeId: string | null;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  getTotalAmount: () => number;
  getTotalCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  storeId: null,

  addToCart: (product: Product) => {
    const { items, storeId } = get();

    // Якщо кошик містить товари іншого магазину, перезавантажуємо кошик під новий магазин
    let currentItems = items;
    if (storeId && storeId !== product.storeId) {
      currentItems = [];
    }

    const existingIndex = currentItems.findIndex((i) => i.product.id === product.id);

    if (existingIndex > -1) {
      const updated = [...currentItems];
      updated[existingIndex].quantity += 1;
      set({ items: updated, storeId: product.storeId });
    } else {
      set({
        items: [...currentItems, { product, quantity: 1 }],
        storeId: product.storeId
      });
    }
  },

  removeFromCart: (productId: string) => {
    const updated = get().items.filter((i) => i.product.id !== productId);
    set({
      items: updated,
      storeId: updated.length > 0 ? get().storeId : null
    });
  },

  updateQuantity: (productId: string, delta: number) => {
    const items = get().items;
    const updated = items
      .map((item) => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter((i): i is CartItem => i !== null);

    set({
      items: updated,
      storeId: updated.length > 0 ? get().storeId : null
    });
  },

  clearCart: () => {
    set({ items: [], storeId: null });
  },

  getTotalAmount: () => {
    return get().items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  },

  getTotalCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  }
}));
