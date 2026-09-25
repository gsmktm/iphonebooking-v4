import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, Variant } from '../services/types';
export interface CartLine {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  color: string;
  storage: string;
  price: number;
  deposit: number;
  preorder: boolean;
  quantity: number;
}
interface Shop {
  ownerId: string | null;
  revision: number | null;
  dirty: boolean;
  cart: CartLine[];
  compare: string[];
  wishlist: string[];
  add: (p: Product, v: Variant) => void;
  quantity: (id: string, n: number) => void;
  clear: () => void;
  toggleCompare: (id: string) => void;
  toggleWishlist: (id: string) => void;
}
export const useShop = create<Shop>()(
  persist(
    (set) => ({
      ownerId: null,
      revision: null,
      dirty: false,
      cart: [],
      compare: [],
      wishlist: [],
      add: (p, v) =>
        set((s) => ({
          dirty: true,
          cart: s.cart.some((i) => i.variantId === v.id)
            ? s.cart.map((i) =>
                i.variantId === v.id ? { ...i, quantity: Math.min(5, i.quantity + 1) } : i,
              )
            : [
                ...s.cart,
                {
                  variantId: v.id,
                  productId: p.id,
                  slug: p.slug,
                  name: p.name,
                  image: p.image,
                  color: v.color,
                  storage: v.storage,
                  price: v.price,
                  deposit: v.deposit,
                  preorder: v.preorder,
                  quantity: 1,
                },
              ],
        })),
      quantity: (id, n) =>
        set((s) => ({
          dirty: true,
          cart:
            n <= 0
              ? s.cart.filter((i) => i.variantId !== id)
              : s.cart.map((i) => (i.variantId === id ? { ...i, quantity: Math.min(5, n) } : i)),
        })),
      clear: () => set({ cart: [], dirty: true }),
      toggleCompare: (id) =>
        set((s) => ({
          compare: s.compare.includes(id)
            ? s.compare.filter((x) => x !== id)
            : [...s.compare.slice(-3), id],
        })),
      toggleWishlist: (id) =>
        set((s) => ({
          dirty: true,
          wishlist: s.wishlist.includes(id)
            ? s.wishlist.filter((x) => x !== id)
            : [...s.wishlist, id],
        })),
    }),
    { name: 'iphonebooking-shop-v2' },
  ),
);
