import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Product, User } from '../services/types';
import { useShop, type CartLine } from '../store/shop';
/** Merge the anonymous bag once, then persist changes to the signed-in account. */
export function useCustomerSync(user: User | null | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function sync() {
      const [remote, products] = await Promise.all([
        api<{ variantId: string; quantity: number }[]>('/account/cart'),
        api<Product[]>('/products'),
      ]);
      if (cancelled) return;
      const lines: CartLine[] = [];
      for (const item of remote) {
        const p = products.find((p) => p.variants.some((v) => v.id === item.variantId));
        const v = p?.variants.find((v) => v.id === item.variantId);
        if (p && v)
          lines.push({
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
            quantity: item.quantity,
          });
      }
      useShop.getState().mergeCart(lines);
      const save = () => {
        const items = useShop
          .getState()
          .cart.map(({ variantId, quantity }) => ({ variantId, quantity }));
        return api('/account/cart', { method: 'PUT', body: JSON.stringify({ items }) });
      };
      await save();
      if (cancelled) return;
      unsubscribe = useShop.subscribe((state, prev) => {
        if (state.cart !== prev.cart) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            void save().catch(() => undefined);
          }, 350);
        }
      });
    }
    void sync().catch(() => undefined);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, [user?.id, qc]);
}
