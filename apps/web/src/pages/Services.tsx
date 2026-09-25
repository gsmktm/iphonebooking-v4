import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Wrench, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { api, post, money, track } from '../services/api';
import type { User, Device, TradeIn, Repair as RepairType } from '../services/types';
import { PageIntro, ErrorNotice, ButtonLink, ProductVisual, Loading } from '../components/ui';
export function TradeInPage() {
  const location = useLocation();
  const [params] = useSearchParams();
  const kind =
    location.pathname === '/exchange'
      ? 'EXCHANGE'
      : location.pathname === '/sell-device'
        ? 'BUYBACK'
        : 'TRADE_IN';
  const [form, setForm] = useState({
      model: '',
      storage: '128GB',
      condition: 'Good',
      battery: 90,
      functional: true,
    }),
    [estimate, setEstimate] = useState<number | null>(null),
    [error, setError] = useState<Error | null>(null),
    [busy, setBusy] = useState(false),
    [submitted, setSubmitted] = useState<TradeIn | null>(null);
  const { data: rules, isLoading } = useQuery({
    queryKey: ['valuation-models'],
    queryFn: () => api<{ id: string; model: string }[]>('/trade-in/rules'),
  });
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<User | null>('/auth/me'),
  });
  const payload = {
    ...form,
    kind,
    ...(params.get('device') ? { deviceId: params.get('device') } : {}),
  };
  const change = (updates: Partial<typeof form>) => {
    setForm({ ...form, ...updates });
    setEstimate(null);
  };
  async function quote() {
    setBusy(true);
    setError(null);
    try {
      track('tradein_started');
      const result = await post<{ estimate: number }>('/trade-in/quote', payload);
      setEstimate(result.estimate);
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    setBusy(true);
    try {
      setSubmitted(await post<TradeIn>('/trade-ins', payload));
    } catch (e) {
      setError(e as Error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page">
      <div className="service-intro">
        <PageIntro
          eyebrow="GOODBYE, OLD. HELLO, POSSIBILITIES."
          title={
            kind === 'BUYBACK' ? 'A new home for your device.' : 'Your next chapter starts here.'
          }
          description="Find out what your device could be worth. A little value from yesterday. A lot of possibility for tomorrow."
        />
        <RefreshCw className="service-intro-icon" size={86} strokeWidth={0.7} />
      </div>
      <div className="category-chips">
        <Link className={kind === 'TRADE_IN' ? 'active' : ''} to="/trade-in">
          Trade in
        </Link>
        <Link className={kind === 'EXCHANGE' ? 'active' : ''} to="/exchange">
          Exchange & upgrade
        </Link>
        <Link className={kind === 'BUYBACK' ? 'active' : ''} to="/sell-device">
          Sell your device
        </Link>
      </div>
      {submitted ? (
        <div className="record-card">
          <div className="success-icon">
            <Check />
          </div>
          <h2>Your device has a next chapter.</h2>
          <p>
            Request {submitted.id.slice(-8).toUpperCase()} is saved. Final value follows inspection.
          </p>
          <ButtonLink to="/account/trade-ins">Track your request</ButtonLink>
        </div>
      ) : (
        <div className="service-layout">
          <form
            className="form-panel"
            onSubmit={(e) => {
              e.preventDefault();
              void quote();
            }}
          >
            <h2>Tell us about your device.</h2>
            {isLoading ? (
              <Loading />
            ) : (
              <>
                <label>
                  Device model
                  <select
                    required
                    value={form.model}
                    onChange={(e) => change({ model: e.target.value })}
                  >
                    <option value="">Select your device</option>
                    {rules?.map((rule) => (
                      <option key={rule.id}>{rule.model}</option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  <label>
                    Storage
                    <select
                      value={form.storage}
                      onChange={(e) => change({ storage: e.target.value })}
                    >
                      {['64GB', '128GB', '256GB', '512GB', '1TB'].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Overall condition
                    <select
                      value={form.condition}
                      onChange={(e) => change({ condition: e.target.value })}
                    >
                      {['Excellent', 'Good', 'Fair', 'Damaged'].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Battery health (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={form.battery}
                    onChange={(e) => change({ battery: Number(e.target.value) })}
                  />
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.functional}
                    onChange={(e) => change({ functional: e.target.checked })}
                  />
                  Display, cameras, buttons, charging, audio, biometrics and network work correctly.
                </label>
                <p className="fine-print">
                  Physical condition and repair history are verified during inspection. No full
                  serial or IMEI is needed for an online estimate.
                </p>
                <button className="button" disabled={busy}>
                  {busy ? 'Working on it…' : 'See your estimated value'}
                  <ArrowRight size={16} />
                </button>
              </>
            )}
            {error && <ErrorNotice error={error} />}
          </form>
          <aside className="valuation-card">
            <span className="eyebrow">THERE’S MORE TO YOUR DEVICE</span>
            <ProductVisual image="phone" name="A new life for your device" />
            {estimate === null ? (
              <>
                <h2>Still full of possibilities.</h2>
                <p>A simple estimate. A transparent inspection. An upgrade on your terms.</p>
              </>
            ) : (
              <>
                <small>Estimated trade-in value</small>
                <h2>{money(estimate)}</h2>
                <p>
                  This is an indicative estimate, subject to physical inspection. Your final offer
                  may differ.
                </p>
                {user ? (
                  <button className="button" disabled={busy} onClick={() => void submit()}>
                    Request an inspection
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <ButtonLink to={`/account?redirect=${encodeURIComponent(location.pathname)}`}>
                    Sign in to save your request
                  </ButtonLink>
                )}
              </>
            )}
            <div className="secure-note">
              <ShieldCheck size={16} />
              You decide whether to accept the final offer.
            </div>
          </aside>
        </div>
      )}
      <section className="steps-section">
        {[
          ['01', 'A little about your device', 'Tell us the model, configuration, and condition.'],
          ['02', 'A closer look', 'Our team inspects your device and prepares a final quote.'],
          [
            '03',
            'Your choice. Your next chapter.',
            'Accept your offer and use the credit toward an eligible upgrade.',
          ],
        ].map(([n, t, d]) => (
          <div key={n}>
            <span>{n}</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
export function RepairPage() {
  const [params] = useSearchParams();
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<User | null>('/auth/me'),
  });
  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => api<Device[]>('/account/devices'),
    enabled: !!user,
  });
  const [form, setForm] = useState({
      model: '',
      issue: 'Battery',
      description: '',
      method: 'STORE',
      appointment: '',
      deviceId: params.get('device') ?? '',
    }),
    [error, setError] = useState<Error | null>(null),
    [busy, setBusy] = useState(false),
    [repair, setRepair] = useState<RepairType | null>(null);
  const device = devices?.find((d) => d.id === form.deviceId);
  return (
    <div className="container page">
      <div className="service-intro">
        <PageIntro
          eyebrow="A LITTLE CARE. A LOT MORE LIFE."
          title="Back to what you love."
          description="Expert care for the devices you rely on. Tell us what’s happening. We’ll help you take the next step."
        />
        <Wrench size={90} strokeWidth={0.7} className="service-intro-icon" />
      </div>
      {repair ? (
        <div className="record-card">
          <div className="success-icon">
            <Check />
          </div>
          <h2>Let’s get you back to your best.</h2>
          <p>
            Repair request {repair.id.slice(-8).toUpperCase()} is saved. Your appointment will be
            confirmed by the service team.
          </p>
          <ButtonLink to="/account/repairs">Follow your repair</ButtonLink>
        </div>
      ) : (
        <div className="service-layout">
          <form
            className="form-panel"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                track('repair_started');
                setRepair(
                  await post<RepairType>('/repairs', {
                    model: device?.unit.variant.product.name ?? form.model,
                    issue: form.issue,
                    description: form.description,
                    method: form.method,
                    ...(form.deviceId ? { deviceId: form.deviceId } : {}),
                    ...(form.appointment
                      ? { appointment: new Date(form.appointment).toISOString() }
                      : {}),
                  }),
                );
              } catch (e) {
                setError(e as Error);
              } finally {
                setBusy(false);
              }
            }}
          >
            <h2>How can we help?</h2>
            {devices?.length ? (
              <label>
                Choose from your devices
                <select
                  value={form.deviceId}
                  onChange={(e) => setForm({ ...form, deviceId: e.target.value })}
                >
                  <option value="">Another device</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.unit.variant.product.name} · ••••{d.unit.serialLast4}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {!device && (
              <label>
                Device model
                <input
                  required
                  minLength={2}
                  placeholder="e.g. iPhone 15 Pro"
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                />
              </label>
            )}
            <label>
              What needs attention?
              <select
                value={form.issue}
                onChange={(e) => setForm({ ...form, issue: e.target.value })}
              >
                {[
                  'Display',
                  'Battery',
                  'Camera',
                  'Charging',
                  'Speaker',
                  'Microphone',
                  'Back Glass',
                  'Face ID',
                  'Buttons',
                  'Water Damage',
                  'Software',
                  'Diagnostics',
                  'Other',
                ].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              A little more detail
              <textarea
                minLength={10}
                maxLength={2000}
                required
                rows={4}
                placeholder="Tell us what you’ve noticed and when it started…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <div className="form-grid">
              <label>
                Service method
                <select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                >
                  <option value="STORE">Bring to store</option>
                  <option value="PICKUP">Request pickup</option>
                </select>
              </label>
              <label>
                Preferred appointment
                <input
                  type="datetime-local"
                  min={new Date(Date.now() + 86400000).toISOString().slice(0, 16)}
                  value={form.appointment}
                  onChange={(e) => setForm({ ...form, appointment: e.target.value })}
                />
              </label>
            </div>
            {error && <ErrorNotice error={error} />}
            <p className="fine-print">
              Appointments are requests until confirmed. No repairs begin before you approve a
              quote.
            </p>
            {user ? (
              <button className="button" disabled={busy}>
                {busy ? 'Sending your request…' : 'Request expert care'}
                <ArrowRight size={16} />
              </button>
            ) : (
              <ButtonLink to="/account?redirect=/repair">Sign in to request a repair</ButtonLink>
            )}
          </form>
          <aside className="repair-explainer">
            <Wrench size={52} strokeWidth={1} />
            <h2>
              Good hands.
              <br />
              Clear answers.
            </h2>
            {[
              ['A proper diagnosis', 'We’ll identify the issue and explain your options.'],
              ['A quote you control', 'Review parts, labor, and warranty before you approve.'],
              [
                'Updates along the way',
                'Follow your repair in your account, from start to finish.',
              ],
            ].map(([t, d]) => (
              <div key={t}>
                <Check size={18} />
                <span>
                  <strong>{t}</strong>
                  <p>{d}</p>
                </span>
              </div>
            ))}
            <Link className="underlined" to="/policies/repair-terms">
              Read our repair terms
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
