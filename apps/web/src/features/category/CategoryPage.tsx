import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { Product } from '../../services/types';
import { ProductCard } from '../../components/ProductCard';
import { DeviceCollectionStrip } from '../../components/DeviceCollectionStrip';
import { CategoryCinematicHero } from './CategoryCinematicHero';
import { ArrowLink, Loading, ErrorNotice, Empty } from '../../components/ui';
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
  const lineup = products.data ?? [];
  const hero = lineup.find((product) => product.featured) ?? lineup[0];

  const content = (
    <>
      <CategoryCinematicHero slug={slug} products={lineup} />
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
          <>
            <DeviceCollectionStrip
              kinds={slug === 'store' ? undefined : [slug]}
              title={
                slug === 'store'
                  ? 'Choose your device family.'
                  : `Explore the ${slug === 'watch' ? 'Watch' : slug} frame.`
              }
              description="Product images, live NPR prices and purchase options appear when catalog inventory is published."
            />
            <Empty
              title="This collection is being updated."
              link="/store"
              action="Explore the store"
            />
          </>
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
          <FeatureBand
            copy={{
              eyebrow: 'A CLOSER LOOK',
              title: `The details of ${hero.name}.`,
              description:
                'Specifications from the current catalog. Check your chosen configuration before purchase.',
            }}
            items={Object.entries(hero.specs)
              .slice(0, 6)
              .map(([key, value], index) => ({
                Icon: config.features.items[index % config.features.items.length].Icon,
                tag: key,
                name: value,
                body: `${key} for ${hero.name}. Configuration-specific details are shown on the product page.`,
              }))}
          />
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
