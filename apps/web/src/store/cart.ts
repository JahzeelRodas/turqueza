'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { EngravingSelection } from '@/types/store';

export interface CartLine {
  key: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  sku: string;
  variantId: string;
  variantName: string;
  options: Record<string, string>;
  /** Precio unitario final (incluye grabado si aplica), en céntimos. */
  price: number;
  quantity: number;
  currency: string;
  engraving?: EngravingSelection | null;
}

interface CartState {
  items: CartLine[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (line: Omit<CartLine, 'key' | 'quantity'>, quantity?: number) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
}

function lineKey(line: Omit<CartLine, 'key' | 'quantity'>) {
  const engraving = line.engraving?.enabled
    ? `${line.engraving.text}|${line.engraving.font}|${line.engraving.placement}`
    : 'none';
  return `${line.variantId}::${engraving}`;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      addItem: (line, quantity = 1) => {
        const key = lineKey(line);
        const existing = get().items.find((item) => item.key === key);
        if (existing) {
          set({
            items: get().items.map((item) =>
              item.key === key
                ? { ...item, quantity: Math.min(item.quantity + quantity, 20) }
                : item,
            ),
            isOpen: true,
          });
          return;
        }
        set({
          items: [...get().items, { ...line, key, quantity }],
          isOpen: true,
        });
      },
      removeItem: (key) =>
        set({ items: get().items.filter((item) => item.key !== key) }),
      setQuantity: (key, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((item) => item.key !== key) });
          return;
        }
        set({
          items: get().items.map((item) =>
            item.key === key ? { ...item, quantity: Math.min(quantity, 20) } : item,
          ),
        });
      },
      clear: () => set({ items: [] }),
      subtotal: () =>
        get().items.reduce((acc, item) => acc + item.price * item.quantity, 0),
      count: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
    }),
    {
      name: 'turquesa-cart-v1',
      storage: createJSONStorage(() => localStorage),
      // Solo persistimos líneas; el drawer siempre arranca cerrado.
      partialize: (state) => ({ ...state, isOpen: false }),
    },
  ),
);
