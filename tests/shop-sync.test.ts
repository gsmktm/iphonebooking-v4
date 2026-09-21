import { describe, it, expect } from 'vitest';
import { mergeAnonymous } from '../src/app/shop-sync';
import type { CartLine } from '../src/store/shop';
const line = (variantId: string, quantity: number, price: number): CartLine => ({
  variantId,
  quantity,
  price,
  productId: variantId,
  slug: variantId,
  name: variantId,
  image: 'phone',
  color: 'Black',
  storage: '256GB',
  deposit: 0,
  preorder: false,
});
describe('anonymous selection migration', () => {
  it('keeps both selections without doubling shared quantities or replacing current catalog details', () => {
    const merged = mergeAnonymous(
      { cart: [line('shared', 2, 1), line('local', 1, 100)], wishlist: ['shared', 'local'] },
      {
        revision: 7,
        cart: [line('shared', 3, 10000), line('saved', 1, 200)],
        wishlist: ['shared', 'saved'],
      },
    );
    expect(merged.cart).toHaveLength(3);
    expect(merged.cart.find((i) => i.variantId === 'shared')).toMatchObject({
      quantity: 3,
      price: 10000,
    });
    expect(new Set(merged.wishlist)).toEqual(new Set(['shared', 'saved', 'local']));
    expect(merged.revision).toBe(7);
  });
});
