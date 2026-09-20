import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import { api, post, money, date, human } from '../../services/api';
import type { Order, Device, Repair, TradeIn, History } from '../../services/types';
import {
  ErrorNotice,
  Loading,
  Empty,
  ProductVisual,
  Status,
  ButtonLink,
} from '../../components/ui';
function Timeline({ history }: { history: History[] }) {
  return (
    <ol className="timeline">
      {history.map((h) => (
        <li key={h.id}>
          <strong>{human(h.status)}</strong>
          <p>{h.note}</p>
          <small>{date(h.createdAt)}</small>
        </li>
      ))}
    </ol>
  );
}
export function AccountOrders() {
  const result = useQuery({
    queryKey: ['account', 'orders'],
    queryFn: () => api<Order[]>('/account/orders'),
  });
  const [error, setError] = useState<Error | null>(null),
    [claimed, setClaimed] = useState(false),
    [busy, setBusy] = useState(false);
  return (
    <>
      <h2>Your orders & bookings.</h2>
      {result.isLoading ? (
        <Loading />
      ) : result.error ? (
        <ErrorNotice error={result.error} />
      ) : !result.data?.length ? (
        <Empty title="Your first chapter is still ahead." />
      ) : (
        result.data.map((order) => (
          <article className="record-card" key={order.id}>
            <div className="record-header">
              <div>
                <h3>{order.number}</h3>
                <small>{date(order.createdAt)}</small>
              </div>
              <Status value={order.status} />
            </div>
            {order.items.map((item) => (
              <div className="order-item" key={item.id}>
                <ProductVisual
                  image={item.variant.product.image}
                  name={item.variant.product.name}
                />
                <div>
                  <h3>{item.variant.product.name}</h3>
                  <p>
                    {item.variant.storage} · {item.variant.color} · Qty {item.quantity}
                  </p>
                  <strong>{money(item.unitPrice * item.quantity)}</strong>
                </div>
              </div>
            ))}
            <div className="summary-row">
              <span>Total</span>
              <strong>{money(order.total)}</strong>
            </div>
            {order.booking && (
              <p>
                Booking status: <Status value={order.booking.status} />
              </p>
            )}
            <details>
              <summary>Order timeline</summary>
              <Timeline history={order.history} />
            </details>
            {order.payments
              .filter((p) => p.status === 'CONFIRMED')
              .map((p) => (
                <div className="payment-record" key={p.id}>
                  <span>
                    {money(p.amount)} received · {p.provider}
                  </span>
                  {p.refunds?.length ? (
                    <Status value={p.refunds[0].status} />
                  ) : (
                    <Link to="/account/tickets">Request refund assistance</Link>
                  )}
                </div>
              ))}
          </article>
        ))
      )}
      <details className="record-card">
        <summary>Purchased as a guest? Connect your order.</summary>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            const data = new FormData(e.currentTarget);
            try {
              await post('/account/claim-order', {
                number: data.get('number'),
                receiptKey: data.get('receiptKey'),
              });
              setClaimed(true);
              await result.refetch();
            } catch (e) {
              setError(e as Error);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Order number
            <input required name="number" />
          </label>
          <label>
            Private receipt key
            <input type="password" name="receiptKey" required />
          </label>
          <button className="button" disabled={busy}>
            {busy ? 'Connecting…' : 'Connect this order'}
            <ArrowRight size={16} />
          </button>
          {claimed && <p role="status">Your order is now connected.</p>}
          {error && <ErrorNotice error={error} />}
        </form>
      </details>
    </>
  );
}
export function AccountDevices() {
  const result = useQuery({
    queryKey: ['devices'],
    queryFn: () => api<Device[]>('/account/devices'),
  });
  return (
    <>
      <h2>The devices you love.</h2>
      {result.isLoading ? (
        <Loading />
      ) : result.error ? (
        <ErrorNotice error={result.error} />
      ) : !result.data?.length ? (
        <Empty
          title="Your world starts with a device."
          description="Your devices appear here after payment and handover are complete."
        />
      ) : (
        <div className="device-grid">
          {result.data.map((d) => (
            <article className="record-card device-card" key={d.id}>
              <ProductVisual
                image={d.unit.variant.product.image}
                name={d.unit.variant.product.name}
              />
              <h2>{d.unit.variant.product.name}</h2>
              <p>
                {d.unit.variant.color} · {d.unit.variant.storage}
              </p>
              <p>Serial: •••• {d.unit.serialLast4}</p>
              <Link className="text-button" to={`/account/devices/${d.id}`}>
                Open device passport →
              </Link>
              <div className="warranty-line">
                <Check size={16} />
                Warranty record through {date(d.warrantyUntil)}
              </div>
              <div className="button-row">
                <ButtonLink secondary to={`/repair?device=${d.id}`}>
                  Repair
                </ButtonLink>
                <ButtonLink secondary to={`/trade-in?device=${d.id}`}>
                  Trade in
                </ButtonLink>
              </div>
              <p className="fine-print">
                {d.repairs.length} service requests · {d.tradeIns.length} trade-in requests
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
export function AccountRepairs() {
  const result = useQuery({
    queryKey: ['account', 'repairs'],
    queryFn: () => api<Repair[]>('/repairs'),
  });
  const [error, setError] = useState<Error | null>(null),
    [busy, setBusy] = useState('');
  async function decide(repairId: string, quoteId: string, accept: boolean) {
    setBusy(quoteId);
    setError(null);
    try {
      await post(`/repairs/${repairId}/quotes/${quoteId}/decision`, { accept });
      await result.refetch();
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy('');
    }
  }
  return (
    <>
      <div className="record-header">
        <h2>A little expert care.</h2>
        <Link className="text-button" to="/repair">
          New request
          <ArrowRight size={16} />
        </Link>
      </div>
      {error && <ErrorNotice error={error} />}{' '}
      {result.isLoading ? (
        <Loading />
      ) : result.error ? (
        <ErrorNotice error={result.error} />
      ) : !result.data?.length ? (
        <Empty
          title="No repairs to follow."
          description="Need a hand with your device? We’re here."
          link="/repair"
          action="Request expert care"
        />
      ) : (
        result.data.map((r) => (
          <article className="record-card" key={r.id}>
            <div className="record-header">
              <div>
                <h3>{r.model}</h3>
                <small>
                  Repair {r.id.slice(-8).toUpperCase()} · {date(r.createdAt)}
                </small>
              </div>
              <Status value={r.status} />
            </div>
            <p>
              <strong>{r.issue}</strong> · {r.description}
            </p>
            {r.quotes.map((q) => (
              <div className="quote-card" key={q.id}>
                <div className="record-header">
                  <h3>Your repair quote</h3>
                  <Status value={q.status} />
                </div>
                <p>{q.diagnosis}</p>
                <div className="summary-row">
                  <span>Parts</span>
                  <span>{money(q.parts)}</span>
                </div>
                <div className="summary-row">
                  <span>Labor</span>
                  <span>{money(q.labor)}</span>
                </div>
                <div className="summary-total">
                  <span>Total</span>
                  <strong>{money(q.total)}</strong>
                </div>
                <p>{q.warrantyDays} days service warranty</p>
                {q.status === 'PENDING' ? (
                  <div className="button-row">
                    <button
                      className="button"
                      disabled={busy === q.id}
                      onClick={() => void decide(r.id, q.id, true)}
                    >
                      Approve quote
                    </button>
                    <button
                      className="button secondary"
                      disabled={busy === q.id}
                      onClick={() => void decide(r.id, q.id, false)}
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <small>Decision recorded {q.decidedAt ? date(q.decidedAt) : ''}</small>
                )}
              </div>
            ))}
            <details>
              <summary>Follow your repair</summary>
              <Timeline history={r.history} />
            </details>
          </article>
        ))
      )}
    </>
  );
}
export function AccountTradeIns() {
  const result = useQuery({ queryKey: ['trade-ins'], queryFn: () => api<TradeIn[]>('/trade-ins') });
  const [error, setError] = useState<Error | null>(null),
    [busy, setBusy] = useState('');
  async function decide(id: string, accept: boolean) {
    setBusy(id);
    try {
      await post(`/trade-ins/${id}/decision`, { accept });
      await result.refetch();
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy('');
    }
  }
  return (
    <>
      <div className="record-header">
        <h2>On to your next chapter.</h2>
        <Link to="/trade-in" className="text-button">
          New estimate
          <ArrowRight size={16} />
        </Link>
      </div>
      {error && <ErrorNotice error={error} />}{' '}
      {result.isLoading ? (
        <Loading />
      ) : result.error ? (
        <ErrorNotice error={result.error} />
      ) : !result.data?.length ? (
        <Empty
          title="More possibilities ahead."
          description="See what your current device could be worth."
          link="/trade-in"
          action="Get a trade-in estimate"
        />
      ) : (
        result.data.map((t) => (
          <article className="record-card" key={t.id}>
            <div className="record-header">
              <div>
                <h3>{t.model}</h3>
                <small>
                  {human(t.kind)} · {t.storage} · {t.condition}
                </small>
              </div>
              <Status value={t.status} />
            </div>
            <div className="summary-row">
              <span>Online estimate</span>
              <strong>{money(t.estimate)}</strong>
            </div>
            {!!t.tradeInQuotes?.length && (
              <details>
                <summary>How your offer changed</summary>
                <ol className="timeline">
                  {t.tradeInQuotes.map((q) => (
                    <li key={q.id}>
                      <strong>
                        {q.version} · {human(q.stage)} · {money(q.newValue)}
                      </strong>
                      <p>{q.reasonCodes.join(' · ')}</p>
                      {q.difference !== null && (
                        <p>Change from previous estimate: {money(q.difference)}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </details>
            )}
            {t.finalValue !== null && t.finalValue !== undefined && (
              <div className="summary-total">
                <span>Final inspected value</span>
                <strong>{money(t.finalValue)}</strong>
              </div>
            )}
            {t.status === 'INSPECTED' && (
              <div className="button-row">
                <button
                  className="button"
                  disabled={busy === t.id}
                  onClick={() => void decide(t.id, true)}
                >
                  Accept offer
                </button>
                <button
                  className="button secondary"
                  disabled={busy === t.id}
                  onClick={() => void decide(t.id, false)}
                >
                  Decline offer
                </button>
              </div>
            )}
            {t.status === 'ACCEPTED' && <p>Your inspected credit can be applied at checkout.</p>}
          </article>
        ))
      )}
    </>
  );
}
