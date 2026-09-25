import type { CartLine } from '../store/shop';
export interface ShopSnapshot {
  revision: number;
  cart: CartLine[];
  wishlist: string[];
}
export function mergeAnonymous(
  local: Pick<ShopSnapshot, 'cart' | 'wishlist'>,
  remote: ShopSnapshot,
): ShopSnapshot {
  const cart = new Map(remote.cart.map((line) => [line.variantId, line]));
  for (const line of local.cart) {
    const saved = cart.get(line.variantId);
    cart.set(
      line.variantId,
      saved ? { ...saved, quantity: Math.max(saved.quantity, line.quantity) } : line,
    );
  }
  return {
    revision: remote.revision,
    cart: [...cart.values()],
    wishlist: [...new Set([...remote.wishlist, ...local.wishlist])],
  };
}
