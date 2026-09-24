import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { money } from '../../services/api';
import type { Product } from '../../services/types';
import { ArrowLink } from '../../components/ui';
import './whats-new.css';

const alsoNew = [
  { label: 'Apple Watch Ultra 4', line: "A battery you can't outrun." },
  { label: 'Mac mini', line: 'Now with M6 and M5 Pro.' },
  { label: 'MacBook Air', line: 'Now supercharged by M5.' },
  { label: 'iPad Air', line: 'Now supercharged by M4.' },
];

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.18 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, shown };
}

export default function WhatsNew({ products }: { products?: Product[] }) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const fromPrice = (slug: string) => {
    const p = products?.find((x) => x.slug === slug);
    if (!p?.variants.length) return null;
    return money(Math.min(...p.variants.map((v) => v.price)));
  };
  const duoPrice = fromPrice('iphone-duo');
  const watchPrice = fromPrice('apple-watch-series-12');
  return (
    <section className="whats-new" aria-label="New releases">
      <div className="container wn-inner">
        <header className="wn-head">
          <div>
            <span className="wn-eyebrow">NEW RELEASES · OCTOBER 2026</span>
            <h2 className="text-balance">
              Pro further.
              <br />
              Hello, hello.
            </h2>
          </div>
          <ArrowLink to="/store" light>
            Shop everything new
          </ArrowLink>
        </header>

        <div className={`wn-grid ${shown ? 'is-in' : ''}`} ref={ref}>
          <article className="wn-slot wn-hero" style={{ '--i': 0 } as CSSProperties}>
            <div className="wn-card">
              <div className="wn-core">
                <span className="wn-chip">New</span>
                <p className="wn-name">iPhone 18 Pro</p>
                <h3 className="wn-headline">Pro further.</h3>
                <ul className="wn-specs">
                  <li>Vapor-cooled A20 Pro chip</li>
                  <li>48MP Fusion · variable aperture</li>
                  <li>Ceramic Shield 2 · 4K 120 fps Dolby Vision</li>
                </ul>
                <Link className="wn-cta" to="/products/iphone-18-pro">
                  Buy iPhone 18 Pro
                  <span className="wn-cta-arrow" aria-hidden="true">
                    <ArrowRight size={14} />
                  </span>
                </Link>
              </div>
            </div>
          </article>

          <article className="wn-slot wn-duo" style={{ '--i': 1 } as CSSProperties}>
            <div className="wn-card">
              <div className="wn-core">
                <span className="wn-chip wn-chip-muted">Pre-order 16 Oct</span>
                <p className="wn-name">iPhone Duo</p>
                <h3 className="wn-headline">Hello, hello.</h3>
                <p className="wn-copy">
                  Pre-order opens 5:00 a.m. PT on 10.16. Available starting 10.23.
                </p>
                {duoPrice && <p className="wn-price tabular-nums">From {duoPrice}</p>}
                <Link className="wn-cta" to="/products/iphone-duo">
                  Pre-book iPhone Duo
                  <span className="wn-cta-arrow" aria-hidden="true">
                    <ArrowRight size={14} />
                  </span>
                </Link>
              </div>
            </div>
          </article>

          <article className="wn-slot wn-watch" style={{ '--i': 2 } as CSSProperties}>
            <div className="wn-card">
              <div className="wn-core">
                <span className="wn-chip">New</span>
                <p className="wn-name">Apple Watch Series 12</p>
                <h3 className="wn-headline wn-headline-sm">
                  The most accurate heart rate sensing in a wearable.
                </h3>
                {watchPrice && <p className="wn-price tabular-nums">From {watchPrice}</p>}
                <Link className="wn-cta" to="/products/apple-watch-series-12">
                  View Series 12
                  <span className="wn-cta-arrow" aria-hidden="true">
                    <ArrowRight size={14} />
                  </span>
                </Link>
              </div>
            </div>
          </article>

          <div className="wn-slot wn-rest" style={{ '--i': 3 } as CSSProperties}>
            <div className="wn-card">
              <div className="wn-core">
                <p className="wn-name">Also new in the line-up</p>
                <ul className="wn-ticker">
                  {alsoNew.map(({ label, line }) => (
                    <li key={label}>
                      <Link to="/store">
                        <strong>{label}</strong>
                        <span>{line}</span>
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <p className="wn-footnote">
          Highlights from apple.com, September 2026. Prices in Nepalese Rupees — pre-book and
          delivery dates for Nepal are confirmed at checkout.
        </p>
      </div>
    </section>
  );
}
