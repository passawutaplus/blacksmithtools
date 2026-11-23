"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ClientCartItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

interface CartState {
  cartId: string | null;
  items: ClientCartItem[];
  open: boolean;
  setOpen: (open: boolean) => void;
  setCartId: (id: string) => void;
  hydrateFromServer: (cartId: string, items: ClientCartItem[]) => void;
  addItem: (productId: string, qty?: number, variantId?: string) => void;
  setQty: (productId: string, quantity: number, variantId?: string) => void;
  changeVariant: (productId: string, fromVariantId: string | undefined, toVariantId: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  clear: () => void;
  count: () => number;
}

function sameLine(a: ClientCartItem, productId: string, variantId?: string) {
  return a.productId === productId && (a.variantId || "") === (variantId || "");
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cartId: null,
      items: [],
      open: false,
      setOpen: (open) => set({ open }),
      setCartId: (id) => set({ cartId: id }),
      hydrateFromServer: (cartId, items) => set({ cartId, items }),
      addItem: (productId, qty = 1, variantId) => {
        const items = [...get().items];
        const idx = items.findIndex((i) => sameLine(i, productId, variantId));
        if (idx >= 0) items[idx] = { ...items[idx], quantity: items[idx].quantity + qty };
        else items.push({ productId, variantId, quantity: qty });
        set({ items, open: true });
      },
      setQty: (productId, quantity, variantId) => {
        let items = [...get().items];
        if (quantity <= 0) items = items.filter((i) => !sameLine(i, productId, variantId));
        else {
          const idx = items.findIndex((i) => sameLine(i, productId, variantId));
          if (idx >= 0) items[idx] = { ...items[idx], quantity };
        }
        set({ items });
      },
      changeVariant: (productId, fromVariantId, toVariantId) => {
        if ((fromVariantId || "") === (toVariantId || "")) return;
        const items = [...get().items];
        const fromIdx = items.findIndex((i) => sameLine(i, productId, fromVariantId));
        if (fromIdx < 0) return;
        const qty = items[fromIdx].quantity;
        const toIdx = items.findIndex((i) => sameLine(i, productId, toVariantId));
        if (toIdx >= 0) {
          items[toIdx] = { ...items[toIdx], quantity: items[toIdx].quantity + qty };
          items.splice(fromIdx, 1);
        } else {
          items[fromIdx] = { ...items[fromIdx], variantId: toVariantId };
        }
        set({ items });
      },
      removeItem: (productId, variantId) =>
        set({ items: get().items.filter((i) => !sameLine(i, productId, variantId)) }),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    {
      name: "bs-cart",
      // The drawer's open state is per page view; persisting it reopened the drawer on every page.
      partialize: (s) => ({ cartId: s.cartId, items: s.items }),
    },
  ),
);
