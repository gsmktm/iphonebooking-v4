import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Globe2, ScanLine, ArrowUpRight } from 'lucide-react';
import { api, post, money, date } from '../services/api';
import { PageIntro, Loading, ErrorNotice, Status, ButtonLink } from '../components/ui';
type PriceProduct = {
  id: string;
  name: string;
  slug: string;
  variants: { id: string; storage: string; color: string; price: number }[];
};
type Observation = {
  id: string;
  productId: string;
  variantId: string;
  source: string;
  sourceUrl: string;
  countryCode: string;
  currency: string;
  priceKind: string;
  observedPrice: number;
  observedAt: string;
  availability: string | null;
  published: boolean;
  active: boolean;
  revision: string;
};
type WorldData = {
  products: PriceProduct[];
  observations: Observation[];
  page: number;
  total: number;
  pages: number;
};
function currencyUnits(currency: string) {
  return (
    10 **
    (new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 2)
  );
}
function price(value: number, currency: string) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
  }).format(value / currencyUnits(currency));
}
const countryName = (code: string) =>
  new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code;
export function WorldPriceMap() {
  const [params, setParams] = useSearchParams();
  const result = useQuery({
    queryKey: ['world-prices', params.toString()],
    queryFn: () => api<WorldData>(`/world-prices?${params}`),
  });
  const selected =
    result.data?.products.find((p) => p.id === params.get('productId')) ?? result.data?.products[0];
  const variant =
    selected?.variants.find((v) => v.id === params.get('variantId')) ?? selected?.variants[0];
  const rows = result.data?.observations.filter((o) => o.variantId === variant?.id) ?? [];
  return (
    <div className="container page">
      <PageIntro
        eyebrow="WORLD PRICE INTELLIGENCE"
        title="See the price. Know the source."
        description="Local catalog prices and published market observations, with their original currency and source. No estimated exchange rates."
      />
      {result.isLoading ? (
        <Loading />
      ) : result.error ? (
        <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      ) : (
        <>
          <div className="form-grid">
            <label>
              Device
              <select
                value={selected?.id ?? ''}
                onChange={(e) => setParams({ productId: e.target.value })}
              >
                {result.data?.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Configuration
              <select
                value={variant?.id ?? ''}
                onChange={(e) => setParams({ productId: selected!.id, variantId: e.target.value })}
              >
                {selected?.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.storage} · {v.color}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {selected && variant && (
            <article className="record-card">
              <div className="record-header">
                <h2>
                  <Globe2 size={24} /> Nepal · iPhoneBooking
                </h2>
                <Status value="STORE_PRICE" />
              </div>
              <p>
                {selected.name} · {variant.storage} · {variant.color}
              </p>
              <strong className="value-price">{money(variant.price)}</strong>
              <p className="fine-print">
                Current local catalog price. Review availability and the reservation quote before
                ordering.
              </p>
              <Link className="text-button" to={`/products/${selected.slug}?variant=${variant.id}`}>
                View this configuration
                <ArrowUpRight size={16} />
              </Link>
            </article>
          )}
          <h2>Published market observations</h2>
          <p>
            Prices can differ in taxes, warranty, import costs, and included services. These are
            dated observations, not a promise of today’s availability.
          </p>
          {rows.length ? (
            <div
              className="table-scroll"
              tabIndex={0}
              role="region"
              aria-label="World price comparison"
            >
              <table>
                <thead>
                  <tr>
                    <th scope="col">Country</th>
                    <th scope="col">Price</th>
                    <th scope="col">Type</th>
                    <th scope="col">Observed</th>
                    <th scope="col">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id}>
                      <td>{countryName(o.countryCode)}</td>
                      <td>{price(o.observedPrice, o.currency)}</td>
                      <td>
                        {o.priceKind === 'OFFICIAL'
                          ? 'Official price observation'
                          : 'Store price observation'}
                      </td>
                      <td>{date(o.observedAt)}</td>
                      <td>
                        <a
                          href={o.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underlined"
                        >
                          {o.source}
                        </a>
                        {o.availability && <p>{o.availability}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="notice">
              No market observations have been published for this configuration. The local catalog
              price remains available above.
            </div>
          )}
          {!!result.data && result.data.pages > 1 && (
            <div className="panel-actions">
              <button
                className="button secondary"
                disabled={result.data.page <= 1}
                onClick={() =>
                  setParams((p) => {
                    p.set('page', String(result.data!.page - 1));
                    return p;
                  })
                }
              >
                Previous
              </button>
              <span>
                Page {result.data.page} of {result.data.pages}
              </span>
              <button
                className="button secondary"
                disabled={result.data.page >= result.data.pages}
                onClick={() =>
                  setParams((p) => {
                    p.set('page', String(result.data!.page + 1));
                    return p;
                  })
                }
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
export function ImeiCheck() {
  const [imei, setImei] = useState(''),
    [result, setResult] = useState<{ valid: boolean; message: string } | null>(null),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false);
  return (
    <div className="container page narrow">
      <PageIntro
        eyebrow="DEVICE IDENTIFIERS"
        title="Check the digits."
        description="A simple IMEI format check. This does not query Apple, carriers, activation, warranty, ownership, or blacklist records."
      />
      <div className="form-panel">
        <ScanLine size={30} />
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(undefined);
            setResult(null);
            try {
              setResult(await post('/imei-check', { imei }));
            } catch (e) {
              setError(e);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            15-digit IMEI
            <input
              value={imei}
              onChange={(e) => {
                setImei(e.target.value);
                setResult(null);
              }}
              inputMode="numeric"
              pattern="[0-9]{15}"
              minLength={15}
              maxLength={15}
              autoComplete="off"
              required
              placeholder="Enter all 15 digits"
            />
          </label>
          <p className="fine-print">
            The number is used for this format check and is not stored by this checker.
          </p>
          <button className="button" disabled={busy}>
            {busy ? 'Checking…' : 'Check format'}
          </button>
        </form>
        {!!error && <ErrorNotice error={error} />}{' '}
        {result && (
          <div className="notice" role="status">
            <strong>
              {result.valid ? 'The check digit is valid.' : 'The check digit is not valid.'}
            </strong>
            <p>{result.message}</p>
          </div>
        )}
        <ButtonLink secondary to="/account/devices">
          Your device records
        </ButtonLink>
      </div>
    </div>
  );
}
export function PriceIntelligenceAdmin() {
  const [page, setPage] = useState(1),
    [productId, setProductId] = useState(''),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const options = useQuery({
    queryKey: ['admin', 'price-options'],
    queryFn: () =>
      api<{
        products: PriceProduct[];
        countries: { code: string; name: string }[];
        currencies: string[];
      }>('/admin/price-intelligence/options'),
  });
  const list = useQuery({
    queryKey: ['admin', 'price-intelligence', page],
    queryFn: () =>
      api<{ rows: Observation[]; page: number; pages: number }>(
        `/admin/price-intelligence?page=${page}`,
      ),
  });
  const product =
    options.data?.products.find((p) => p.id === productId) ?? options.data?.products[0];
  async function change(path: string, data: unknown, method = 'POST') {
    setBusy(true);
    setError(undefined);
    setSaved(false);
    try {
      await api(path, { method, body: JSON.stringify(data) });
      await list.refetch();
      setSaved(true);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageIntro
        eyebrow="CATALOG INTELLIGENCE"
        title="Publish price observations."
        description="Every public observation requires a real configuration, country, currency, date, and source."
      />
      {!!error && <ErrorNotice error={error} />} {saved && <p role="status">Observation saved.</p>}
      {options.error ? (
        <ErrorNotice error={options.error} />
      ) : options.isLoading ? (
        <Loading />
      ) : (
        <details className="record-card">
          <summary>Add a price observation</summary>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const currency = String(f.get('currency'));
              void change('/admin/price-intelligence', {
                productId: product?.id,
                variantId: f.get('variantId'),
                countryCode: f.get('countryCode'),
                currency,
                priceKind: f.get('priceKind'),
                observedPrice: Math.round(Number(f.get('amount')) * currencyUnits(currency)),
                source: f.get('source'),
                sourceUrl: f.get('sourceUrl'),
                observedAt: new Date(String(f.get('observedAt'))).toISOString(),
                availability: f.get('availability') || null,
                published: f.has('published'),
                active: true,
              });
            }}
          >
            <div className="form-grid">
              <label>
                Product
                <select value={product?.id ?? ''} onChange={(e) => setProductId(e.target.value)}>
                  {options.data?.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Configuration
                <select name="variantId" key={product?.id} required>
                  {product?.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.storage} · {v.color}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Country
                <select name="countryCode" defaultValue="NP">
                  {options.data?.countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Currency
                <select name="currency" defaultValue="NPR">
                  {options.data?.currencies.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Amount in selected currency
                <input name="amount" type="number" min="0.01" step="0.01" required />
              </label>
              <label>
                Price type
                <select name="priceKind">
                  <option value="STORE">Store price</option>
                  <option value="OFFICIAL">Official price</option>
                </select>
              </label>
              <label>
                Source name
                <input name="source" minLength={2} maxLength={160} required />
              </label>
              <label>
                Source URL
                <input name="sourceUrl" type="url" maxLength={1000} required />
              </label>
              <label>
                Observation date
                <input name="observedAt" type="datetime-local" required />
              </label>
              <label>
                Availability note
                <input name="availability" maxLength={240} />
              </label>
            </div>
            <label className="checkbox-label">
              <input type="checkbox" name="published" />
              Publish to world prices
            </label>
            <button className="button" disabled={busy}>
              Save observation
            </button>
          </form>
        </details>
      )}
      {list.isLoading ? (
        <Loading />
      ) : list.error ? (
        <ErrorNotice error={list.error} />
      ) : (
        <div className="record-list">
          {!list.data?.rows.length && <p className="notice">No observations recorded.</p>}
          {list.data?.rows.map((o) => (
            <article className="record-card" key={o.id}>
              <div className="record-header">
                <h2>{o.source}</h2>
                <Status value={o.published ? 'PUBLISHED' : 'DRAFT'} />
              </div>
              <p>
                {o.currency && o.observedPrice
                  ? price(o.observedPrice, o.currency)
                  : 'Pricing context required'}{' '}
                · {o.countryCode ? countryName(o.countryCode) : 'No country'} · {date(o.observedAt)}
              </p>
              {o.sourceUrl && (
                <a
                  className="underlined"
                  href={o.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View source
                </a>
              )}
              <div className="panel-actions">
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    void change(
                      `/admin/price-intelligence/${o.id}`,
                      { expectedRevision: o.revision, published: !o.published },
                      'PATCH',
                    )
                  }
                >
                  {o.published ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {(list.data?.pages ?? 0) > 1 && (
        <div className="panel-actions">
          <button
            className="button secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            className="button secondary"
            disabled={page === list.data?.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
