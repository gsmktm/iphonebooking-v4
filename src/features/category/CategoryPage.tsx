import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Layers, Tag } from 'lucide-react';
import { api, money } from '../../services/api';
import type { Product } from '../../services/types';
import { ProductCard } from '../../components/ProductCard';
import {
  ButtonLink,
  ArrowLink,
  ProductVisual,
  Loading,
  ErrorNotice,
  Empty,
} from '../../components/ui';
import { FeatureBand, SpecTable, ServicesBand, Faq } from './sections';
import { CONFIGS, type CategorySlug } from './config';
import './category.css';

const TABS = [
  ['Line-up', '#lineup'],
  ["What's new", '#whats-new'],
  ['Specs', '#specs'],
  ['Support', '#support'],
] as const;

export function CategoryPage({ slug }: { slug: CategorySlug }) {
  const config = CONFIGS[slug];
  const products = useQuery({
    queryKey: ['products', 'category', slug],
    queryFn: () => api<Product[]>(config.query ? `/products?${config.query}` : '/products'),
  });
  const [storage, setStorage] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    document.title = config.docTitle;
  }, [slug, config.docTitle]);

  const lineup = products.data ?? [];
  const hero = lineup.find((p) => p.featured) ?? lineup[0];
  const storages = hero ? [...new Set(hero.variants.map((v) => v.storage))] : [];
  const activeStorage = storages.includes(storage) ? storage : storages[0];
  const heroVariants = hero?.variants.filter((v) => v.storage === activeStorage) ?? [];
  const activeVariant = heroVariants.find((v) => v.color === color) ?? heroVariants[0];
  const minPrice = hero ? Math.min(...hero.variants.map((v) => v.price)) : 0;
  const isPrebook = hero?.variants.some((v) => v.preorder) ?? false;
  const showStorage = storages.length > 1;
  const showColor = heroVariants.length > 1;
  const configBits = [showStorage ? activeStorage : '', activeVariant?.color ?? ''].filter(Boolean);

  const content = (
    <>
      <nav className="cat-tabs" aria-label="On this page">
        <div className="container">
          {TABS.map(([label, href]) => (
            <a href={href} key={href}>
              {label}
            </a>
          ))}
        </div>
      </nav>

      {config.chips && (
        <div className="container">
          <div className="category-chips">
            {config.chips.map((c) => (
              <Link key={c.to} to={c.to}>
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!products.isLoading && !products.error && hero && (
        <div className="container cat-section">
          <div className="cat-hero">
            <div className="cat-hero-copy">
              <span className="eyebrow">{config.eyebrow}</span>
              <h1 className="text-balance">{config.headline}</h1>
              <p className="text-pretty">{config.intro(hero)}</p>

              {(showStorage || showColor) && (
                <div className="cat-config">
                  {showStorage && (
                    <div className="cat-config-row" role="group" aria-label="Configuration">
                      <span className="cat-config-label">
                        {config.dimLabels?.storage ?? 'Storage'}
                      </span>
                      <div className="cat-chips">
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
                  )}
                  {showColor && (
                    <div className="cat-config-row" role="group" aria-label="Colour">
                      <span className="cat-config-label">
                        {config.dimLabels?.color ?? 'Colour'}
                      </span>
                      <div className="cat-chips cat-colors">
                        {heroVariants.map((v) => (
                          <button
                            type="button"
                            key={v.id}
                            aria-pressed={activeVariant?.color === v.color}
                            onClick={() => setColor(v.color)}
                          >
                            <span style={{ background: v.colorHex }} />
                            {v.color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="cat-price">
                <strong>{activeVariant ? money(activeVariant.price) : money(minPrice)}</strong>
                <span>
                  {configBits.join(' · ')}
                  {configBits.length > 0 && ' · '}NPR, tax included
                </span>
              </div>

              <div className="cat-actions">
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

              <ul className="cat-stats">
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
            <div className="cat-hero-visual">
              <ProductVisual image={hero.image} name={hero.name} />
              {hero.badge && <span className="cat-hero-badge">{hero.badge}</span>}
            </div>
          </div>
        </div>
      )}

      <section className="container cat-section" id="lineup">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{config.lineup.eyebrow}</span>
            <h2>{config.lineup.title}</h2>
            <p>{config.lineup.description}</p>
          </div>
          <ArrowLink to="/store">View all products</ArrowLink>
        </div>
        {products.isLoading ? (
          <Loading />
        ) : products.error ? (
          <ErrorNotice error={products.error} retry={() => void products.refetch()} />
        ) : !lineup.length ? (
          <Empty
            title="This collection is being updated."
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
          <FeatureBand copy={config.features} items={config.features.items} />
          <SpecTable products={lineup} copy={config.specs} />
        </>
      )}
      <ServicesBand copy={config.services} />
      <Faq copy={config.faq} items={config.faq.items} />
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
  return <div className="cat-page">{content}</div>;
}
