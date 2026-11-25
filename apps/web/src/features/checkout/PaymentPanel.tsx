import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, post, money } from '../../services/api';
import { ErrorNotice, Loading, Status } from '../../components/ui';
type Attempt = { id: string; amount: number; status: string; url: string | null; provider: string };
export function PaymentPanel({ orderId, receiptKey }: { orderId: string; receiptKey?: string }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>();
  const [key, setKey] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`payment-attempt:${orderId}`);
      if (saved) return saved;
      const fresh = crypto.randomUUID();
      sessionStorage.setItem(`payment-attempt:${orderId}`, fresh);
      return fresh;
    } catch {
      return crypto.randomUUID();
    }
  });
  const providers = useQuery({
    queryKey: ['payment-providers'],
    queryFn: () => api<{ khalti: boolean; environment: string | null }>('/payments/providers'),
  });
  const status = useQuery({
    queryKey: ['order-payment', orderId],
    queryFn: () =>
      post<{ status: string; number: string; payments: Attempt[] }>('/payments/status', {
        orderId,
        receiptKey,
      }),
    retry: false,
  });
  async function pay() {
    setBusy(true);
    setError(undefined);
    try {
      const attemptKey = attempts.length > 0 && !active ? newAttempt() : key;
      const result = await post<Attempt>('/payments', {
        orderId,
        receiptKey,
        idempotencyKey: attemptKey,
      });
      if (result.url) {
        window.location.assign(result.url);
      } else {
        await status.refetch();
      }
    } catch (e) {
      setError(e);
      await status.refetch();
    } finally {
      setBusy(false);
    }
  }
  async function verify(id: string) {
    setBusy(true);
    setError(undefined);
    try {
      await post(`/payments/${id}/verify`, { receiptKey });
      await status.refetch();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const attempts = status.data?.payments.filter((p) => p.provider === 'KHALTI') ?? [];
  const active = attempts.find((p) =>
    [
      'INITIALIZING',
      'INITIALIZATION_UNCERTAIN',
      'PENDING',
      'VERIFICATION_PENDING',
      'REVIEW_REQUIRED',
    ].includes(p.status),
  );
  const payable = ['PLACED', 'DEPOSIT_PAID'].includes(status.data?.status ?? '');
  function newAttempt() {
    const next = crypto.randomUUID();
    setKey(next);
    try {
      sessionStorage.setItem(`payment-attempt:${orderId}`, next);
    } catch {
      /* State remains available in this tab. */
    }
    return next;
  }
  return (
    <section className="record-card">
      <h2>Payment & reservation status</h2>
      {status.isLoading ? (
        <Loading />
      ) : status.error ? (
        <ErrorNotice error={status.error} retry={() => void status.refetch()} />
      ) : (
        <>
          <p role="status">
            {status.data?.number} · <Status value={status.data?.status ?? 'PENDING'} />
          </p>
          {providers.error && (
            <ErrorNotice error={providers.error} retry={() => void providers.refetch()} />
          )}{' '}
          {providers.data?.environment === 'sandbox' && (
            <div className="notice">
              Khalti is in sandbox mode. This is not a live payment checkout.
            </div>
          )}
          {attempts.map((p) => (
            <div className="notice" key={p.id}>
              <p>
                Khalti · {money(p.amount)} · <Status value={p.status} />
              </p>
              {p.status === 'CONFIRMED' ? (
                <p>Payment verified with Khalti.</p>
              ) : ['REVIEW_REQUIRED', 'INITIALIZATION_UNCERTAIN', 'INITIALIZING'].includes(
                  p.status,
                ) ? (
                <p>
                  Store review is needed before another payment. Contact support with your order
                  number.
                </p>
              ) : ['PENDING', 'VERIFICATION_PENDING'].includes(p.status) ? (
                <div className="panel-actions">
                  {p.url && (
                    <a className="button" href={p.url}>
                      Continue to Khalti
                    </a>
                  )}
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void verify(p.id)}
                  >
                    Verify payment status
                  </button>
                </div>
              ) : (
                <p>
                  No confirmed payment on this attempt. If you were charged, contact support before
                  paying again.
                </p>
              )}
            </div>
          ))}
          {payable && !active && providers.data?.khalti && (
            <>
              <p>
                Choose Khalti to pay the amount due. Your reservation becomes paid only after
                verification with the provider.
              </p>
              <button className="button" disabled={busy} onClick={() => void pay()}>
                {busy
                  ? 'Opening payment…'
                  : status.data?.status === 'DEPOSIT_PAID'
                    ? 'Pay remaining balance with Khalti'
                    : 'Pay with Khalti'}
              </button>
            </>
          )}
          {payable && !providers.data?.khalti && !providers.isLoading && (
            <p>
              Online payments are unavailable. Arrange payment with store staff using your order
              number.
            </p>
          )}
          {!!error && <ErrorNotice error={error} />}
          <p className="fine-print">
            Returning from the provider is not a payment receipt. Use Verify payment status if your
            order has not updated.
          </p>
        </>
      )}
    </section>
  );
}
