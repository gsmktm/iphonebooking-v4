import { displaySpecValue } from '../services/product-spec';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Check,
  LockKeyhole,
  Minus,
  Plus,
  Trash2,
  PackageCheck,
  Download,
  Copy,
} from 'lucide-react';
import { api, post, money, track, date } from '../services/api';
import type { Product, Order, User, TradeIn } from '../services/types';
import { useShop } from '../store/shop';
import {
  PageIntro,
  ProductVisual,
  ButtonLink,
  Empty,
  ErrorNotice,
  Status,
  Loading,
} from '../components/ui';
const specValuesDiffer = (products: Product[], key: string) =>
  new Set(products.map((product) => displaySpecValue(product.specs[key]))).size > 1;

export function Cart() {
  const { cart, quantity } = useShop();
  const total = cart.reduce((sum, i) => sum + i.quantity * i.price, 0);
  return (
    <div className="container page">
      <PageIntro
        eyebrow="A LITTLE SOMETHING FOR YOU"
        title="Your bag."
        description="Great things are just around the corner."
      />
      {!cart.length ? (
        <Empty
          title="Room for something extraordinary."
          description="Your bag is empty. Find a device that makes your day."
        />
      ) : (
        <div className="checkout-layout">
          <div className="cart-lines">
            {cart.map((line) => (
              <article className="cart-line" key={line.variantId}>
                <Link to={`/products/${line.slug}`}>
                  <ProductVisual image={line.image} name={line.name} />
                </Link>
                <div className="cart-line-details">
                  <Link to={`/products/${line.slug}`}>
                    <h3>{line.name}</h3>
                  </Link>
                  <p>
                    {line.color} · {line.storage}
                  </p>
                  <Status value={line.preorder ? 'PRE_BOOKING' : 'REGULAR_ORDER'} />
                  <div className="quantity-control">
                    <button
                      aria-label={`Remove one ${line.name}`}
                      onClick={() => quantity(line.variantId, line.quantity - 1)}
                    >
                      <Minus size={14} />
                    </button>
                    <span>{line.quantity}</span>
                    <button
                      aria-label={`Add one ${line.name}`}
                      disabled={line.quantity === 5}
                      onClick={() => quantity(line.variantId, line.quantity + 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
                <div className="cart-line-price">
                  <strong>{money(line.price * line.quantity)}</strong>
                  <button
                    className="icon-button"
                    aria-label={`Remove ${line.name}`}
                    onClick={() => quantity(line.variantId, 0)}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <aside className="summary-card">
            <h2>A great start.</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{money(total)}</strong>
            </div>
            <div className="summary-row">
              <span>Store pickup</span>
              <span>Included</span>
            </div>
            <div className="summary-total">
              <span>Estimated total</span>
              <strong>{money(total)}</strong>
            </div>
            <p className="fine-print">
              Prices and availability are verified by the server at checkout.
            </p>
            <ButtonLink to="/checkout">Continue to checkout</ButtonLink>
            <p className="secure-note">
              <LockKeyhole size={14} />
              Prices confirmed at checkout
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
const provinces = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'];
export function Checkout() {
  const { cart, clear } = useShop();
  const navigate = useNavigate();
  const [step, setStep] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<Error | null>(null);
  const [key] = useState(() => crypto.randomUUID());
  const [receiptKey] = useState(() =>
    Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
      n.toString(16).padStart(2, '0'),
    ).join(''),
  );
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<User | null>('/auth/me'),
  });
  const { data: tradeIns } = useQuery({
    queryKey: ['trade-ins'],
    queryFn: () => api<TradeIn[]>('/trade-ins'),
    enabled: !!user,
  });
  const [contact, setContact] = useState({ name: '', email: '', phone: '' }),
    [fulfillment, setFulfillment] = useState<'PICKUP' | 'DELIVERY'>('PICKUP'),
    [tradeInId, setTradeInId] = useState('');
  const [address, setAddress] = useState({
    province: 'Bagmati',
    district: '',
    municipality: '',
    ward: '',
    area: '',
    landmark: '',
  });
  useEffect(() => {
    if (user)
      setContact((c) => ({ ...c, name: c.name || user.name, email: c.email || user.email }));
  }, [user]);
  useEffect(() => {
    track('checkout_started');
  }, []);
  const items = cart.map(({ variantId, quantity }) => ({ variantId, quantity }));
  type Quote = {
    subtotal: number;
    credit: number;
    total: number;
    dueNow: number;
    fingerprint: string;
    shippingNote: string;
  };
  const quote = useQuery({
    queryKey: ['checkout-quote', items, tradeInId, fulfillment, user?.id],
    queryFn: () =>
      post<Quote>('/checkout/quote', { items, fulfillment, ...(tradeInId ? { tradeInId } : {}) }),
    enabled: cart.length > 0,
    retry: false,
    staleTime: 0,
  });
  const savedAddresses = useQuery({
    queryKey: ['account', 'addresses'],
    queryFn: () => api<(typeof address & { id: string; label: string })[]>('/account/addresses'),
    enabled: !!user,
  });
  const total = quote.data?.subtotal ?? 0,
    credit = quote.data?.credit ?? 0,
    dueNow = quote.data?.dueNow ?? 0;
  async function submit() {
    if (!quote.data || quote.isFetching) return;
    setBusy(true);
    setError(null);
    try {
      const order = await post<Order>('/orders', {
        items: cart.map(({ variantId, quantity }) => ({ variantId, quantity })),
        ...contact,
        fulfillment,
        address,
        idempotencyKey: key,
        receiptKey,
        expectedQuote: quote.data.fingerprint,
        termsAccepted: true,
        ...(tradeInId ? { tradeInId } : {}),
      });
      try {
        sessionStorage.setItem('iphonebooking-receipt', JSON.stringify(order));
      } catch {
        /* The confirmation also keeps the receipt in navigation state. */
      }
      clear();
      navigate('/confirmation', { state: { order } });
    } catch (e) {
      setError(e as Error);
      await quote.refetch();
    } finally {
      setBusy(false);
    }
  }
  if (!cart.length)
    return (
      <div className="container page">
        <Empty title="Your next great thing is waiting." />
      </div>
    );
  return (
    <div className="container page">
      <PageIntro eyebrow="JUST A FEW DETAILS" title="Make it yours." />
      <div className="checkout-steps">
        {['Contact', 'Delivery or pickup', 'Review & reserve'].map((label, i) => (
          <button
            key={label}
            disabled={i > step}
            onClick={() => setStep(i)}
            className={step === i ? 'active' : ''}
          >
            <span>{i < step ? <Check size={15} /> : i + 1}</span>
            {label}
          </button>
        ))}
      </div>
      <div className="checkout-layout">
        <div className="form-panel">
          {error && <ErrorNotice error={error} />}
          {quote.error && <ErrorNotice error={quote.error} retry={() => void quote.refetch()} />}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (step < 2) setStep(step + 1);
              else void submit();
            }}
          >
            {step === 0 ? (
              <>
                <h2>Good to meet you.</h2>
                <p>
                  Checkout as a guest, or{' '}
                  <Link className="underlined" to="/account?redirect=/checkout">
                    sign in
                  </Link>{' '}
                  to keep everything connected.
                </p>
                <label>
                  Full name
                  <input
                    autoComplete="name"
                    required
                    minLength={2}
                    value={contact.name}
                    onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  />
                </label>
                <label>
                  Email address
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  />
                </label>
                <label>
                  Phone number
                  <input
                    type="tel"
                    autoComplete="tel"
                    required
                    pattern="\+?[0-9 -]{9,16}"
                    placeholder="98XXXXXXXX"
                    value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                  />
                </label>
              </>
            ) : step === 1 ? (
              <>
                <h2>From us to you.</h2>
                <div className="choice-grid">
                  <button
                    type="button"
                    className={fulfillment === 'PICKUP' ? 'choice selected' : 'choice'}
                    onClick={() => setFulfillment('PICKUP')}
                  >
                    <strong>Store pickup</strong>
                    <span>Meet us. Meet your new device.</span>
                  </button>
                  <button
                    type="button"
                    className={fulfillment === 'DELIVERY' ? 'choice selected' : 'choice'}
                    onClick={() => setFulfillment('DELIVERY')}
                  >
                    <strong>Delivery request</strong>
                    <span>Timing and charges confirmed by staff.</span>
                  </button>
                </div>
                {fulfillment === 'DELIVERY' && !!savedAddresses.data?.length && (
                  <label>
                    Saved address
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const a = savedAddresses.data?.find((a) => a.id === e.target.value);
                        if (a)
                          setAddress({
                            province: a.province,
                            district: a.district,
                            municipality: a.municipality,
                            ward: a.ward,
                            area: a.area,
                            landmark: a.landmark,
                          });
                      }}
                    >
                      <option value="">Enter a new address</option>
                      {savedAddresses.data.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label} · {a.area}, {a.municipality}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {fulfillment === 'DELIVERY' ? (
                  <div className="form-grid">
                    <label>
                      Province
                      <select
                        value={address.province}
                        onChange={(e) => setAddress({ ...address, province: e.target.value })}
                      >
                        {provinces.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </label>
                    {(['district', 'municipality', 'ward', 'area', 'landmark'] as const).map(
                      (field) => (
                        <label key={field}>
                          {field === 'ward'
                            ? 'Ward number'
                            : field[0].toUpperCase() + field.slice(1)}
                          <input
                            required={field !== 'landmark'}
                            maxLength={field === 'ward' ? 3 : 200}
                            value={address[field]}
                            onChange={(e) => setAddress({ ...address, [field]: e.target.value })}
                          />
                        </label>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="notice">
                    Pickup details and opening hours are available on our{' '}
                    <Link className="underlined" to="/stores">
                      store page
                    </Link>
                    . Please confirm your visit with the store.
                  </div>
                )}
              </>
            ) : (
              <>
                <h2>A final look.</h2>
                <div className="review-block">
                  <h3>Contact</h3>
                  <p>
                    {contact.name}
                    <br />
                    {contact.email}
                    <br />
                    {contact.phone}
                  </p>
                  <h3>{fulfillment === 'PICKUP' ? 'Store pickup' : 'Delivery request'}</h3>
                  {fulfillment === 'DELIVERY' && (
                    <p>
                      {address.area}, Ward {address.ward}, {address.municipality},{' '}
                      {address.district}, {address.province}
                    </p>
                  )}
                </div>
                <h3>Reserve first. Choose payment next.</h3>
                <p>
                  Reserve now and complete payment with store staff within 24 hours. This is an
                  unpaid reservation. Available payment options appear on your confirmation.
                </p>
                {tradeIns?.some((t) => t.status === 'ACCEPTED') && (
                  <label>
                    Apply an inspected trade-in
                    <select value={tradeInId} onChange={(e) => setTradeInId(e.target.value)}>
                      <option value="">No trade-in credit</option>
                      {tradeIns
                        .filter((t) => t.status === 'ACCEPTED')
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.model} — {money(t.finalValue ?? 0)}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                <label className="checkbox-label">
                  <input type="checkbox" required />I have reviewed the{' '}
                  <Link to="/policies/prebooking-terms" target="_blank">
                    reservation terms
                  </Link>{' '}
                  and understand no payment is being collected.
                </label>
              </>
            )}
            <button
              className="button"
              disabled={busy || (step === 2 && (!quote.data || quote.isFetching || !!quote.error))}
            >
              {busy ? 'Reserving your device…' : step < 2 ? 'Continue' : 'Place unpaid reservation'}
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
        <aside className="summary-card">
          <h2>Your reservation quote.</h2>
          <p role="status" className="fine-print">
            {quote.isFetching
              ? 'Checking current prices and stock…'
              : quote.data
                ? 'Prices checked with the store.'
                : 'Quote unavailable.'}
          </p>
          {cart.map((l) => (
            <div className="summary-product" key={l.variantId}>
              <ProductVisual image={l.image} name={l.name} />
              <div>
                <strong>{l.name}</strong>
                <small>
                  {l.storage} · Qty {l.quantity}
                </small>
                <span>{money(l.price * l.quantity)}</span>
              </div>
            </div>
          ))}
          <div className="summary-row">
            <span>Product total</span>
            <strong>{quote.data ? money(total) : '—'}</strong>
          </div>
          {credit > 0 && (
            <div className="summary-row">
              <span>Trade-in credit</span>
              <strong>−{money(credit)}</strong>
            </div>
          )}
          <div className="summary-total">
            <span>Total</span>
            <strong>{quote.data ? money(quote.data.total) : '—'}</strong>
          </div>
          <div className="summary-row">
            <span>Due at store</span>
            <strong>{quote.data ? money(dueNow) : '—'}</strong>
          </div>
          <p className="fine-print">
            {quote.data?.shippingNote} A reservation does not confirm payment or delivery. Save your
            private receipt key after checkout.
          </p>
        </aside>
      </div>
    </div>
  );
}
export function Compare() {
  const { compare, toggleCompare } = useShop();
  const [shared] = useState(() => new URLSearchParams(location.search).get('devices')?.split(','));
  const ids = shared ?? compare;
  const products = useQuery({
    queryKey: ['products', 'compare'],
    queryFn: () => api<Product[]>('/products'),
  });
  const list = products.data?.filter((p) => ids.includes(p.id)).slice(0, 4) ?? [];
  const [copied, setCopied] = useState(false);
  return (
    <div className="container page">
      <PageIntro
        eyebrow="A CLOSER LOOK"
        title="Find your perfect match."
        description="The details, side by side. A clearer way to choose."
      />
      {products.isLoading ? (
        <Loading />
      ) : products.error ? (
        <ErrorNotice error={products.error} />
      ) : !list.length ? (
        <Empty
          title="What’s on your shortlist?"
          description="Use the + on any product card to compare up to four devices."
        />
      ) : (
        <>
          <button
            className="text-button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `${location.origin}/compare?devices=${list.map((p) => p.id).join(',')}`,
                );
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            <Copy size={16} />
            {copied ? 'Link copied' : 'Copy comparison link'}
          </button>
          <div className="comparison-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>At a glance</th>
                  {list.map((p) => (
                    <th key={p.id}>
                      <ProductVisual image={p.image} name={p.name} />
                      <h2>{p.name}</h2>
                      <ButtonLink to={`/products/${p.slug}`}>Explore</ButtonLink>
                      {!shared && (
                        <button className="text-button" onClick={() => toggleCompare(p.id)}>
                          Remove
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>From</th>
                  {list.map((p) => (
                    <td key={p.id}>{money(Math.min(...p.variants.map((v) => v.price)))}</td>
                  ))}
                </tr>
                {[...new Set(list.flatMap((p) => Object.keys(p.specs)))].map((key) => (
                  <tr
                    key={key}
                    className={specValuesDiffer(list, key) ? 'different' : ''}
                  >
                    <th>{key}</th>
                    {list.map((p) => (
                      <td key={p.id}>{displaySpecValue(p.specs[key] ?? 'Not specified')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
export function Tracking() {
  const [number, setNumber] = useState(''),
    [receiptKey, setReceipt] = useState(''),
    [order, setOrder] = useState<Order | null>(null),
    [error, setError] = useState<Error | null>(null),
    [busy, setBusy] = useState(false);
  return (
    <div className="container page narrow">
      <PageIntro
        eyebrow="EVERY STEP, TOGETHER"
        title="Follow your next chapter."
        description="Enter your order number and private receipt key from your confirmation."
      />
      <form
        className="form-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            setOrder(await post<Order>('/tracking', { number, receiptKey }));
          } catch (e) {
            setError(e as Error);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Order number
          <input
            required
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="IB-2026-…"
          />
        </label>
        <label>
          Private receipt key
          <input
            type="password"
            required
            value={receiptKey}
            onChange={(e) => setReceipt(e.target.value)}
          />
        </label>
        <button className="button" disabled={busy}>
          {busy ? 'Finding your order…' : 'Track order'}
          <ArrowRight size={16} />
        </button>
      </form>
      {error && <ErrorNotice error={error} />}
      <p className="fine-print">
        Signed in? Your complete history is in <Link to="/account/orders">Your orders</Link>.
      </p>
      {order && (
        <article className="record-card">
          <div className="record-header">
            <h2>{order.number}</h2>
            <Status value={order.status} />
          </div>
          <ol className="timeline">
            {order.history.map((h) => (
              <li key={h.id}>
                <strong>{h.status.replaceAll('_', ' ')}</strong>
                <p>{h.note}</p>
                <small>{date(h.createdAt)}</small>
              </li>
            ))}
          </ol>
        </article>
      )}
    </div>
  );
}
