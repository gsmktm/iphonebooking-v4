import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Layers, Tag } from 'lucide-react';
import { api, money } from '../services/api';
import type { Product } from '../services/types';
import { ProductCard } from '../components/ProductCard';
import {
  ButtonLink,
  ArrowLink,
  ProductVisual,
  Loading,
  ErrorNotice,
  Empty,
} from '../components/ui';
import { FeatureBand, SpecTable, ServicesBand, Faq } from '../features/iphone/sections';

const TABS = [
  ['Line-up', '#lineup'],
  ["What's new", '#whats-new'],
  ['Specs', '#specs'],
  ['Support', '#support'],
] as const;

export default function IPhone() {
  const products = useQuery({
    queryKey: ['products', 'category', 'iphone'],
    queryFn: () => api<Product[]>('/products?category=iphone'),
  });
  const [storage, setStorage] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    document.title = 'iPhone in Nepal — prices, specs & pre-order — iPhoneBooking';
  }, []);

  const lineup = products.data ?? [];
  const hero = lineup.find((p) => p.featured) ?? lineup[0];
  const storages = hero ? [...new Set(hero.variants.map((v) => v.storage))] : [];
  const activeStorage = storages.includes(storage) ? storage : storages[0];
  const heroVariants = hero?.variants.filter((v) => v.storage === activeStorage) ?? [];
  const activeVariant = heroVariants.find((v) => v.color === color) ?? heroVariants[0];
  const minPrice = hero ? Math.min(...hero.variants.map((v) => v.price)) : 0;
  const isPrebook = hero?.variants.some((v) => v.preorder) ?? false;

  const content = (
    <>
      <nav className="ipcx-tabs" aria-label="On this page">
        <div className="container">
          {TABS.map(([label, href]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </div>
      </nav>

      {!products.isLoading && !products.error && hero && (
        <div className="container ipcx-section">
          <div className="ipcx-hero">
            <div className="ipcx-hero-copy">
              <span className="eyebrow">IPHONE · SEPTEMBER 2026</span>
              <h1 className="text-balance">The line-up, in Nepal.</h1>
              <p className="text-pretty">
                {hero.name} — “{hero.tagline}”. Choose a configuration to see live pricing, then
                buy, pre-book or reserve in-store pickup.
              </p>

              {heroVariants.length > 0 && (
                <div className="ipcx-config">
                  <div className="ipcx-config-row" role="group" aria-label="Storage">
                    <span className="ipcx-config-label">Storage</span>
                    <div className="ipcx-chips">
                      {storages.map((s) => (
                        <button
                          type="button"
                          key={s}
                          aria-pressed={activeStorage === s}
                          onClick={() => setStorage(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="ipcx-config-row" role="group" aria-label="Colour">
                    <span className="ipcx-config-label">Colour</span>
                    <div className="ipcx-chips ipcx-colors">
                      {heroVariants.map((v) => (
                        <button
                          type="button"
                          key={v.id}
                          aria-pressed={activeVariant?.color === v.color}
                          aria-label={v.color}
                          title={v.color}
                          onClick={() => setColor(v.color)}
                        >
                          <span style={{ background: v.colorHex }} />
                          {v.color}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="ipcx-price">
                <strong>{activeVariant ? money(activeVariant.price) : money(minPrice)}</strong>
                <span>
                  {activeStorage}
                  {activeVariant ? ` · ${activeVariant.color}` : ''} · NPR, tax included
                </span>
              </div>

              <div className="ipcx-actions">
                <ButtonLink to={`/products/${hero.slug}`}>
                  {isPrebook ? 'Pre-book now' : 'Buy now'}
                </ButtonLink>
                <ButtonLink to="/compare" secondary>
                  Compare
                </ButtonLink>
                <ArrowLink to={isPrebook ? '/prebook' : '/trade-in'}>
                  {isPrebook ? 'All pre-orders' : 'Trade in yours'}
                </ArrowLink>
              </div>

              <ul className="ipcx-stats">
                <li>
                  <Layers size={16} aria-hidden />
                  <span>
                    <strong>{lineup.length}</strong> models live
                  </span>
                </li>
                <li>
                  <Tag size={16} aria-hidden />
                  <span>
                    From <strong>{money(minPrice)}</strong>
                  </span>
                </li>
                <li>
                  <BadgeCheck size={16} aria-hidden />
                  <span>
                    <strong>{hero.badge ?? 'In stock'}</strong> · warranty backed
                  </span>
                </li>
              </ul>
            </div>
            <div className="ipcx-hero-visual">
              <ProductVisual image={hero.image} name={hero.name} />
              {hero.badge && <span className="ipcx-hero-badge">{hero.badge}</span>}
            </div>
          </div>
        </div>
      )}

      <section className="container ipcx-section" id="lineup">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE LINE-UP</span>
            <h2>Every iPhone. One place.</h2>
            <p>
              Live stock and Nepal pricing. Save to your wishlist or add to compare straight from
              the card.
            </p>
          </div>
          <ArrowLink to="/store">View all products</ArrowLink>
        </div>
        {products.isLoading ? (
          <Loading />
        ) : products.error ? (
          <ErrorNotice error={products.error} retry={() => void products.refetch()} />
        ) : !lineup.length ? (
          <Empty
            title="The iPhone collection is being updated."
            link="/store"
            action="Explore the store"
          />
        ) : (
          <div className="product-grid">
            {lineup.map((p) => (
              <ProductCard product={p} key={p.id} />
            ))}
          </div>
        )}
      </section>

      {!products.isLoading && !products.error && lineup.length > 0 && (
        <>
          <FeatureBand />
          <SpecTable products={lineup} />
        </>
      )}
      <ServicesBand />
      <Faq />
    </>
  );

  if (products.isLoading) {
    return (
      <div className="container page">
        <Loading />
      </div>
    );
  }
  if (products.error) {
    return (
      <div className="container page">
        <ErrorNotice error={products.error} retry={() => void products.refetch()} />
      </div>
    );
  }
  return <div className="ipcx-page">{content}</div>;
}
