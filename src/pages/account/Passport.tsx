import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, date, human, money } from '../../services/api';
import { ErrorNotice, Loading, Status, ButtonLink } from '../../components/ui';
interface PassportData {
  id: string;
  canonicalId: string | null;
  product: string;
  color: string;
  storage: string;
  serial: string;
  purchaseDate: string;
  seller: string | null;
  orderNumber: string;
  warrantyUntil: string;
  events: { id: string; eventType: string; timestamp: string }[];
  repairs: {
    id: string;
    issue: string;
    status: string;
    createdAt: string;
    repairWarranty: { expiryDate: string; terms: string } | null;
  }[];
  tradeIns: { id: string; estimate: number; finalValue: number | null; status: string }[];
  accessories: { id: string; name: string; slug: string }[];
}
export default function Passport() {
  const { id } = useParams();
  const result = useQuery({
    queryKey: ['passport', id],
    queryFn: () => api<PassportData>(`/account/devices/${id}/passport`),
  });
  const p = result.data;
  return (
    <div className="container page passport-page">
      <Link className="text-button" to="/account/devices">
        ← My devices
      </Link>
      {result.isLoading ? (
        <Loading />
      ) : result.error ? (
        <>
          <ErrorNotice error={result.error} />
          <ButtonLink to={`/account?redirect=/account/devices/${id}`}>
            Sign in to your account
          </ButtonLink>
        </>
      ) : (
        p && (
          <>
            <header className="page-intro">
              <span className="eyebrow">DEVICE PASSPORT</span>
              <h1>{p.product}</h1>
              <p>
                {p.storage} · {p.color}
              </p>
              <p className="fine-print">
                {p.canonicalId ?? 'Device identity pending reconciliation'}
              </p>
            </header>
            <div className="passport-grid">
              <section className="record-card">
                <h2>Your device</h2>
                <dl className="passport-facts">
                  <dt>Serial</dt>
                  <dd>{p.serial}</dd>
                  <dt>Received</dt>
                  <dd>{date(p.purchaseDate)}</dd>
                  <dt>Store</dt>
                  <dd>{p.seller ?? 'Location pending verification'}</dd>
                  <dt>Order</dt>
                  <dd>{p.orderNumber}</dd>
                  <dt>Warranty record</dt>
                  <dd>Through {date(p.warrantyUntil)}</dd>
                </dl>
                <p>Warranty coverage is subject to the applicable terms and inspection.</p>
                <div className="button-row">
                  <ButtonLink to={`/repair?device=${p.id}`}>Book repair</ButtonLink>
                  <ButtonLink secondary to={`/trade-in?device=${p.id}`}>
                    Explore an upgrade
                  </ButtonLink>
                </div>
              </section>
              <section className="record-card">
                <h2>Device history</h2>
                {p.events.length ? (
                  <ol className="timeline">
                    {p.events.map((e) => (
                      <li key={e.id}>
                        <strong>{human(e.eventType)}</strong>
                        <p>{date(e.timestamp)}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>New lifecycle events will appear here as they are recorded.</p>
                )}
              </section>
              <section className="record-card">
                <h2>Service & repair</h2>
                {p.repairs.length ? (
                  p.repairs.map((r) => (
                    <article key={r.id}>
                      <h3>{r.issue}</h3>
                      <Status value={r.status} />
                      <p>Requested {date(r.createdAt)}</p>
                      {r.repairWarranty && (
                        <p>
                          Repair warranty through {date(r.repairWarranty.expiryDate)}.{' '}
                          {r.repairWarranty.terms}
                        </p>
                      )}
                    </article>
                  ))
                ) : (
                  <p>No repairs recorded for this device.</p>
                )}
                <Link to="/account/repairs">Manage repair requests →</Link>
              </section>
              <section className="record-card">
                <h2>Upgrade history</h2>
                {p.tradeIns.length ? (
                  p.tradeIns.map((t) => (
                    <p key={t.id}>
                      {t.finalValue == null ? 'Estimated value' : 'Inspected offer'}:{' '}
                      {money(t.finalValue ?? t.estimate)} · {human(t.status)}
                    </p>
                  ))
                ) : (
                  <p>Request an estimate when you’re ready for your next device.</p>
                )}
                <p className="fine-print">Estimates are not guaranteed resale values.</p>
              </section>
            </div>
            {p.accessories.length > 0 && (
              <section className="record-card">
                <h2>Compatible accessories</h2>
                {p.accessories.map((a) => (
                  <p key={a.id}>
                    <Link to={`/products/${a.slug}`}>{a.name} →</Link>
                  </p>
                ))}
              </section>
            )}
          </>
        )
      )}
    </div>
  );
}
