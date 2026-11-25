import { useEffect, useId, useRef, useState, type Ref } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ArrowUpRight, SlidersHorizontal, Sparkles } from 'lucide-react';
import { api, money } from '../../services/api';
import type { CatalogResult, HomeFeed, Product } from '../../services/types';
import { ProductCard } from '../../components/ProductCard';
import {
  ArrowLink,
  ErrorNotice,
  Loading,
  ProductVisual,
  SectionHeading,
} from '../../components/ui';
import type { HomeCopy } from './home-sections';
import type { PreviewDevice } from './ProductPreview';

export function DeviceRail({
  products,
  label,
  onPreview,
}: {
  products: Product[];
  label: string;
  onPreview: PreviewDevice;
}) {
  const rail = useRef<HTMLUListElement>(null);
  const id = useId();
  const [edges, setEdges] = useState({ start: true, end: false });
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = () =>
      setEdges({
        start: element.scrollLeft <= 2,
        end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2,
      });
    element.scrollLeft = 0;
    update();
    element.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [products]);
  const scroll = (direction: number) => {
    const element = rail.current;
    if (!element) return;
    const card = element.querySelector('li');
    element.scrollBy({
      left: direction * ((card?.getBoundingClientRect().width ?? element.clientWidth) + 16),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };
  return (
    <div className="home-rail-wrap">
      <ul className="home-device-rail" aria-label={label} id={id} ref={rail}>
        {products.map((product) => (
          <li key={product.id}>
            <ProductCard
              product={product}
              onQuickLook={(p) =>
                onPreview(
                  p,
                  p.variants.find((v) => v.stock.some((s) => s.available > 0))?.id ??
                    p.variants[0]?.id,
                )
              }
            />
          </li>
        ))}
      </ul>
      <div className="home-rail-footer">
        <span>Discover the details. Save your favorites.</span>
        <div className="home-rail-controls">
          <button
            className="icon-button"
            aria-label={`Previous ${label.toLowerCase()}`}
            aria-controls={id}
            disabled={edges.start}
            onClick={() => scroll(-1)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            className="icon-button"
            aria-label={`Next ${label.toLowerCase()}`}
            aria-controls={id}
            disabled={edges.end}
            onClick={() => scroll(1)}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function HomeSpotlights({
  data,
  copy,
  onPreview,
}: {
  data?: HomeFeed;
  copy: HomeCopy;
  onPreview: PreviewDevice;
}) {
  const products = ['mac', 'ipad'].flatMap((category) => {
    const product = data?.products.find((p) => p.category.slug === category);
    return product ? [product] : [];
  });
  if (!products.length) return null;
  return (
    <section className="container home-section home-spotlights" aria-label={copy.title}>
      <SectionHeading
        eyebrow="MORE ROOM FOR POSSIBILITY"
        title={copy.title}
        description={copy.body}
      />
      <div className="home-spotlight-grid">
        {products.map((product, i) => {
          const variant =
            product.variants.find((v) => v.stock.some((s) => s.available > 0)) ??
            product.variants[0];
          if (!variant) return null;
          return (
            <article className={`home-spotlight home-spotlight-${i}`} key={product.id}>
              <div className="spotlight-copy">
                <span className="eyebrow">{product.category.name.toUpperCase()}</span>
                <h3>{product.name}</h3>
                <p>{product.tagline}</p>
                <span className="spotlight-price">
                  From {money(Math.min(...product.variants.map((v) => v.price)))}
                </span>
                <div className="spotlight-actions">
                  <Link className="button secondary" to={`/products/${product.slug}`}>
                    Learn more <ArrowUpRight size={15} />
                  </Link>
                  <button className="button" onClick={() => onPreview(product, variant.id)}>
                    Make it yours <ArrowRight size={15} />
                  </button>
                </div>
              </div>
              <button
                className="spotlight-visual"
                onClick={() => onPreview(product, variant.id)}
                aria-label={`Configure ${product.name}`}
              >
                <ProductVisual
                  image={variant.image || product.image}
                  name={`${product.name}, ${variant.color}`}
                />
              </button>
              <div className="spotlight-specs">
                {Object.entries(product.specs)
                  .slice(0, 2)
                  .map(([name, value]) => (
                    <span key={name}>
                      <small>{name}</small>
                      <strong>{value}</strong>
                    </span>
                  ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function HomeFinderIntro({
  copy,
  onOpen,
  ready,
  buttonRef,
}: {
  copy: HomeCopy;
  onOpen: () => void;
  ready: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <section
      className="container home-section home-finder-intro"
      aria-labelledby="home-finder-heading"
    >
      <div className="finder-symbol" aria-hidden="true">
        <Sparkles size={30} strokeWidth={1.2} />
      </div>
      <div>
        <span className="eyebrow">A LITTLE GUIDANCE GOES A LONG WAY</span>
        <h2 id="home-finder-heading">{copy.title}</h2>
        <p>{copy.body}</p>
      </div>
      <button className="button" onClick={onOpen} disabled={!ready} ref={buttonRef}>
        Find my device <SlidersHorizontal size={17} />
      </button>
    </section>
  );
}

export function HomeExplore({
  data,
  copy,
  onPreview,
}: {
  data?: HomeFeed;
  copy: HomeCopy;
  onPreview: PreviewDevice;
}) {
  const collectionId = useId();
  const [category, setCategory] = useState('');
  const [selection, setSelection] = useState('featured');
  const query = new URLSearchParams({ pageSize: '8', sort: 'featured' });
  if (category) query.set('category', category);
  if (selection === 'in-stock') query.set('stock', 'in-stock');
  if (selection === 'deals') query.set('deals', 'true');
  if (selection === 'prebook') query.set('preorder', 'true');
  const catalog = useQuery({
    queryKey: ['home-discovery', query.toString()],
    queryFn: ({ signal }) => api<CatalogResult>(`/catalog?${query}`, { signal }),
    enabled: Boolean(data),
    staleTime: 30000,
  });
  const storeQuery = new URLSearchParams(query);
  storeQuery.delete('pageSize');
  return (
    <section className="ecosystem-section home-section home-explore" id="explore-devices">
      <div className="container">
        <SectionHeading
          eyebrow="THE APPLE ECOSYSTEM"
          title={copy.title}
          description={copy.body}
          action={<ArrowLink to={copy.href || `/store?${storeQuery}`}>Explore the store</ArrowLink>}
        />
        <div className="home-explore-toolbar">
          <div className="home-category-filters" role="group" aria-label="Choose a device family">
            <button
              className="choice-pill"
              aria-pressed={!category}
              onClick={() => setCategory('')}
            >
              All devices
            </button>
            {data?.categories.map((item) => (
              <button
                className="choice-pill"
                key={item.id}
                aria-pressed={category === item.slug}
                onClick={() => setCategory(item.slug)}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className="home-collection-select">
            <label htmlFor={collectionId}>Collection</label>
            <select
              id={collectionId}
              value={selection}
              onChange={(e) => setSelection(e.target.value)}
            >
              <option value="featured">All configurations</option>
              <option value="in-stock">In stock</option>
              <option value="deals">Current offers</option>
              <option value="prebook">Pre-booking</option>
            </select>
          </div>
        </div>
        <p className="home-result-count" role="status">
          {catalog.isFetching
            ? 'Finding your collection…'
            : catalog.data
              ? `${catalog.data.total} ${catalog.data.total === 1 ? 'device' : 'devices'} in this collection${catalog.data.total > 8 ? ' · showing the first 8' : ''}.`
              : 'Choose a family to explore.'}
        </p>
        {catalog.isPending && data ? (
          <Loading />
        ) : catalog.error ? (
          <ErrorNotice error={catalog.error} retry={() => void catalog.refetch()} />
        ) : catalog.data?.products.length ? (
          <DeviceRail
            products={catalog.data.products}
            label="Collection devices"
            onPreview={onPreview}
          />
        ) : (
          data && (
            <div className="home-empty">
              <SlidersHorizontal size={24} aria-hidden="true" />
              <p>No devices match this collection right now.</p>
              <button
                className="button secondary"
                onClick={() => {
                  setCategory('');
                  setSelection('featured');
                }}
              >
                Reset collection
              </button>
            </div>
          )
        )}
      </div>
    </section>
  );
}
