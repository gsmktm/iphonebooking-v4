import { useState } from 'react';
import {
  Cpu,
  Camera,
  ShieldCheck,
  BatteryCharging,
  Sparkles,
  Waves,
  RefreshCw,
  Wrench,
  ArrowLeftRight,
  ChevronDown,
} from 'lucide-react';
import type { Product } from '../../services/types';
import { money } from '../../services/api';
import { SectionHeading, ArrowLink } from '../../components/ui';
import './iphone.css';

/* ── What's new — real Apple Sept-2026 technology ── */
const FEATURES = [
  {
    Icon: Cpu,
    tag: 'Performance',
    name: 'A20 Pro, cooled',
    body: 'Vapor-cooled A20 Pro with Neural Accelerators keeps sustained performance steady through games, editing and on-device AI.',
  },
  {
    Icon: Camera,
    tag: 'Camera',
    name: '48MP Fusion, variable aperture',
    body: 'A physical variable aperture pairs with the 48MP Fusion sensor for natural low-light depth — then 4K 120 fps Dolby Vision when it matters.',
  },
  {
    Icon: ShieldCheck,
    tag: 'Durability',
    name: 'Ceramic Shield 2',
    body: 'Front and back Ceramic Shield 2 with a titanium frame — tougher glass, lighter feel, built for a decade of everyday Nepal.',
  },
  {
    Icon: BatteryCharging,
    tag: 'Battery',
    name: 'All-day, then some',
    body: 'Efficiency that stretches further between charges, with fast-charge over USB-C when you do plug in.',
  },
  {
    Icon: Sparkles,
    tag: 'Intelligence',
    name: 'On-device intelligence',
    body: 'Neural Accelerators run language and image models privately, right on the phone — no round trip required.',
  },
  {
    Icon: Waves,
    tag: 'Display',
    name: 'ProMotion + Dynamic Island',
    body: 'Up to 120Hz adaptive Super Retina XDR, with Dynamic Island carrying alerts, Live Activities and controls in real time.',
  },
];

export function FeatureBand() {
  return (
    <section className="ipcx-band" id="whats-new">
      <div className="container ipcx-section">
        <SectionHeading
          eyebrow="WHAT'S NEW"
          title="Serious silicon. Cooler by design."
          description="The story behind the current iPhone line-up — the same technology you'll read on apple.com, with Nepal pricing attached."
        />
        <div className="ipcx-features">
          {FEATURES.map(({ Icon, tag, name, body }) => (
            <article className="ipcx-feature" key={name}>
              <span className="ipcx-feature-tag">{tag}</span>
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
export function SpecTable({ products }: { products: Product[] }) {
  const cols = products.slice(0, 4);
  if (!cols.length) return null;
  const keys = [...new Set(cols.flatMap((p) => Object.keys(p.specs)))];
  const from = (p: Product) => Math.min(...p.variants.map((v) => v.price));
  return (
    <section className="container ipcx-section" id="specs">
      <SectionHeading
        eyebrow="SPECS"
        title="Compare at a glance."
        description="Live specifications from the iPhoneBooking catalogue. Add two or more models for a full side-by-side."
        action={<ArrowLink to="/compare">Full comparison</ArrowLink>}
      />
      <div
        className="ipcx-spec-scroll"
        tabIndex={0}
        role="region"
        aria-label="iPhone specification comparison"
      >
        <table className="ipcx-specs">
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
const SERVICES = [
  {
    Icon: RefreshCw,
    title: 'Trade in. Trade up.',
    body: 'Get a live estimate for your current phone and put its value against your next iPhone.',
    to: '/trade-in',
    cta: 'Value my device',
  },
  {
    Icon: Wrench,
    title: 'Care that keeps up.',
    body: 'Book a repair, approve your quote and follow every service update — genuine parts, warranted work.',
    to: '/repair',
    cta: 'Book a repair',
  },
  {
    Icon: ArrowLeftRight,
    title: 'Decide with the facts.',
    body: 'Put any two iPhones side by side: chip, camera, battery, storage and price in Nepal.',
    to: '/compare',
    cta: 'Compare models',
  },
];

export function ServicesBand() {
  return (
    <section className="container ipcx-section" id="support">
      <SectionHeading
        eyebrow="KEEP IT GOING"
        title="The rest of the story."
        description="Owning an iPhone is a long game — upgrading, protecting and repairing all live one tap away."
      />
      <div className="ipcx-services">
        {SERVICES.map(({ Icon, title, body, to, cta }) => (
          <article className="luxe-panel ipcx-service" key={to}>
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
const FAQS = [
  {
    q: 'Are these iPhones genuine for Nepal?',
    a: 'Every iPhone sold here is an official, warranty-backed unit with an IMEI you can check before you buy. Your device, serial and warranty record are stored in your account after purchase.',
  },
  {
    q: 'How does pre-order work?',
    a: 'Reserve an available configuration with a store payment. Your reservation is held for 24 hours, and allocation is confirmed after payment — track the whole journey from your account.',
  },
  {
    q: 'Can I trade in my current phone?',
    a: 'Yes. Share the model, storage and condition to get an instant estimate, then apply the credit against your next iPhone. A specialist confirms the final value on inspection.',
  },
  {
    q: 'What happens if something goes wrong?',
    a: 'Book a repair with the issue and photos, approve the quote we send back, and follow parts, labour and warranty status live. Warrantied work comes with its own warranty days.',
  },
  {
    q: 'Where can I see my orders and devices?',
    a: 'Everything lands in your account: orders and tracking, pre-orders, repairs, trade-ins — plus My Devices with purchase history, masked serials and warranty dates.',
  },
  {
    q: 'How do I know a listing is in stock?',
    a: 'Stock is live per configuration and per store. If a configuration shows availability, it can be reserved or bought right away; otherwise you can pre-book the next allocation.',
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="container ipcx-section" id="faq">
      <SectionHeading
        eyebrow="GOOD TO KNOW"
        title="Questions, answered."
        description="The short version of how buying an iPhone here works."
      />
      <div className="ipcx-faq">
        {FAQS.map((item, i) => (
          <div className={`ipcx-faq-item ${open === i ? 'open' : ''}`} key={item.q}>
            <button
              type="button"
              aria-expanded={open === i}
              aria-controls={`ipcx-faq-${i}`}
              onClick={() => setOpen(open === i ? null : i)}
            >
              {item.q}
              <ChevronDown size={17} aria-hidden />
            </button>
            <div className="ipcx-faq-answer" id={`ipcx-faq-${i}`} hidden={open !== i}>
              <p>{item.a}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
