import { useState } from 'react';
import { RefreshCw, Wrench, ArrowLeftRight, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Product } from '../../services/types';
import { money } from '../../services/api';
import { SectionHeading, ArrowLink } from '../../components/ui';
import './category.css';

/* ── Shared content shapes ── */
export type Feature = { Icon: LucideIcon; tag: string; name: string; body: string };
export type FaqItem = { q: string; a: string };
export type ServiceItem = {
  Icon: LucideIcon;
  title: string;
  body: string;
  to: string;
  cta: string;
};
export type Copy = { eyebrow: string; title: string; description: string };

/* ── What's new ── */
export function FeatureBand({ copy, items }: { copy: Copy; items: Feature[] }) {
  return (
    <section className="cat-band" id="whats-new">
      <div className="container cat-section">
        <SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
        <div className="cat-features">
          {items.map(({ Icon, tag, name, body }) => (
            <article className="cat-feature" key={name}>
              <span className="cat-feature-tag">{tag}</span>
              <Icon size={26} aria-hidden />
              <h3>{name}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Spec comparison — rendered from live product data ── */
export function SpecTable({ products, copy }: { products: Product[]; copy: Copy }) {
  const cols = products.slice(0, 4);
  if (!cols.length) return null;
  const keys = [...new Set(cols.flatMap((p) => Object.keys(p.specs)))];
  const from = (p: Product) => Math.min(...p.variants.map((v) => v.price));
  return (
    <section className="container cat-section" id="specs">
      <SectionHeading
        eyebrow={copy.eyebrow}
        title={copy.title}
        description={copy.description}
        action={<ArrowLink to="/compare">Full comparison</ArrowLink>}
      />
      <div
        className="cat-spec-scroll"
        tabIndex={0}
        role="region"
        aria-label="Specification comparison"
      >
        <table className="cat-specs">
          <thead>
            <tr>
              <th scope="col">Model</th>
              {cols.map((p) => (
                <th scope="col" key={p.id}>
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k}>
                <th scope="row">{k}</th>
                {cols.map((p) => (
                  <td key={p.id}>{p.specs[k] ?? '—'}</td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row">From</th>
              {cols.map((p) => (
                <td key={p.id}>
                  <strong>{money(from(p))}</strong>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ── Keep your iPhone going — trade-in / repair / compare ── */
const SERVICES: ServiceItem[] = [
  {
    Icon: RefreshCw,
    title: 'Trade in. Trade up.',
    body: 'Get a live estimate for your current device and put its value against your next Apple product.',
    to: '/trade-in',
    cta: 'Value my device',
  },
  {
    Icon: Wrench,
    title: 'Care that keeps up.',
    body: 'Book a repair, approve your quote and follow every service update. Parts and warranty terms are listed in your quotation.',
    to: '/repair',
    cta: 'Book a repair',
  },
  {
    Icon: ArrowLeftRight,
    title: 'Decide with the facts.',
    body: 'Put any two models side by side: chip, camera, battery, storage and price in Nepal.',
    to: '/compare',
    cta: 'Compare models',
  },
];

export function ServicesBand({ copy, items = SERVICES }: { copy: Copy; items?: ServiceItem[] }) {
  return (
    <section className="container cat-section" id="support">
      <SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
      <div className="cat-services">
        {items.map(({ Icon, title, body, to, cta }) => (
          <article className="luxe-panel cat-service" key={to}>
            <Icon size={26} aria-hidden />
            <h3>{title}</h3>
            <p>{body}</p>
            <ArrowLink to={to}>{cta}</ArrowLink>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ── FAQ accordion ── */
export function Faq({ copy, items }: { copy: Copy; items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="container cat-section" id="faq">
      <SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
      <div className="cat-faq">
        {items.map((item, i) => (
          <div className={`cat-faq-item ${open === i ? 'open' : ''}`} key={item.q}>
            <button
              type="button"
              aria-expanded={open === i}
              aria-controls={`cat-faq-${i}`}
              onClick={() => setOpen(open === i ? null : i)}
            >
              {item.q}
              <ChevronDown size={17} aria-hidden />
            </button>
            <div className="cat-faq-answer" id={`cat-faq-${i}`} hidden={open !== i}>
              <p>{item.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
