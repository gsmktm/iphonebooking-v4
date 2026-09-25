import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../services/api';
import type { User } from '../services/types';
import { useShop } from '../store/shop';
import { mergeAnonymous, type ShopSnapshot } from './shop-sync';
/** Account-scoped local drafts; revision-checked server writes never silently win a conflict. */
export function useCustomerSync(user: User | null | undefined) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);
  const resolution = useRef<'normal' | 'local' | 'remote'>('normal');
  useEffect(() => {
    if (user === undefined) return;
    const mode = resolution.current;
    resolution.current = 'normal';
    setError(null);
    if (!user) {
      if (useShop.getState().ownerId)
        useShop.setState({ ownerId: null, revision: null, dirty: false, cart: [], wishlist: [] });
      return;
    }
    const userId = user.id;
    if (useShop.getState().ownerId && useShop.getState().ownerId !== userId)
      useShop.setState({ ownerId: userId, revision: null, dirty: false, cart: [], wishlist: [] });
    const controller = new AbortController();
    let cancelled = false,
      running = false;
    let unsubscribe: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fail = (e: unknown) => {
      if (!cancelled && e instanceof ApiError && e.code === 'ACCOUNT_CHANGED')
        void queryClient.invalidateQueries({ queryKey: ['me'] });
      if (!cancelled)
        setError(
          e instanceof Error
            ? e
            : new Error('Saved items could not sync. Your local selection is safe.'),
        );
    };
    async function flush() {
      if (cancelled || running) return;
      running = true;
      try {
        while (!cancelled) {
          const snapshot = useShop.getState();
          if (snapshot.ownerId !== userId || !snapshot.dirty || snapshot.revision === null) break;
          const result = await api<{ revision: number }>('/account/shop-state', {
            method: 'PUT',
            signal: controller.signal,
            body: JSON.stringify({
              accountId: userId,
              revision: snapshot.revision,
              cart: snapshot.cart.map(({ variantId, quantity }) => ({ variantId, quantity })),
              wishlist: snapshot.wishlist,
            }),
          });
          if (cancelled || useShop.getState().ownerId !== userId) break;
          const current = useShop.getState();
          useShop.setState({
            revision: result.revision,
            dirty: current.cart !== snapshot.cart || current.wishlist !== snapshot.wishlist,
          });
          setError(null);
        }
      } catch (e) {
        fail(e);
      } finally {
        running = false;
      }
    }
    async function bootstrap() {
      const remote = await api<ShopSnapshot & { accountId: string }>('/account/shop-state', {
        signal: controller.signal,
      });
      if (cancelled) return;
      if (remote.accountId !== userId)
        throw new ApiError('Your account changed. Refreshing your saved items.', 'ACCOUNT_CHANGED');
      const local = useShop.getState();
      const anonymous = local.ownerId === null;
      if (
        mode === 'normal' &&
        !anonymous &&
        local.dirty &&
        local.revision !== null &&
        local.revision !== remote.revision
      )
        throw new ApiError(
          'Saved items changed on another device. Choose which selection to keep; nothing has been overwritten.',
          'SHOP_STATE_CHANGED',
        );
      const snapshot =
        mode === 'remote'
          ? remote
          : anonymous
            ? mergeAnonymous(local, remote)
            : local.dirty || mode === 'local'
              ? { ...remote, cart: local.cart, wishlist: local.wishlist }
              : remote;
      const needsSave =
        mode !== 'remote' &&
        (mode === 'local' ||
          local.dirty ||
          (anonymous && (local.cart.length > 0 || local.wishlist.length > 0)));
      useShop.setState({
        cart: snapshot.cart,
        wishlist: snapshot.wishlist,
        revision: snapshot.revision,
        ownerId: userId,
        dirty: needsSave,
      });
      unsubscribe = useShop.subscribe((state, previous) => {
        if (
          state.ownerId === userId &&
          (state.cart !== previous.cart || state.wishlist !== previous.wishlist)
        ) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            void flush();
          }, 350);
        }
      });
      await flush();
    }
    void bootstrap().catch(fail);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, [user?.id, user === undefined, attempt, queryClient]);
  return {
    error,
    keepLocal: () => {
      resolution.current = 'local';
      setAttempt((n) => n + 1);
    },
    loadSaved: () => {
      resolution.current = 'remote';
      setAttempt((n) => n + 1);
    },
  };
}
