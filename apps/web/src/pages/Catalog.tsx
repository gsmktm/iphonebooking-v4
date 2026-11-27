import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Search, X } from 'lucide-react';
import { api } from '../services/api';
import type { Product, Category } from '../services/types';
import { ProductCard } from '../components/ProductCard';
import { DeviceCollectionStrip } from '../components/DeviceCollectionStrip';
import { OfficialAppleModels } from '../features/apple/OfficialAppleModels';
import { PageIntro, Loading, ErrorNotice, Empty, ArrowLink, Dialog } from '../components/ui';
import { useShop } from '../store/shop';
type CatalogResponse = {
  products: Product[];
  total: number;
  page: number;
  pageCount: number;
  facets: {
    storages: string[];
    colors: { name: string; hex: string }[];
    models: { name: string; slug: string }[];
    price: { min: number; max: number } | null;
  };
};
export default function Catalog() {
  const { pathname } = useLocation();
  const [filters, setFilters] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const { wishlist } = useShop();
  const mode = pathname.slice(1);
  const query = new URLSearchParams(filters);
  if (!['store', 'catalog', 'search', 'prebook', 'wishlist', 'deals'].includes(mode))
    query.set('category', mode);
  if (mode === 'prebook') query.set('preorder', 'true');
  if (mode === 'wishlist') query.set('ids', wishlist.join(','));
  if (mode === 'deals') query.set('deals', 'true');
  const result = useQuery({
    queryKey: ['catalog', query.toString()],
    queryFn: ({ signal }) => api<CatalogResponse>(`/catalog?${query}`, { signal }),
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });
  const data = result.data;
  const update = (key: string, value: string) =>
    setFilters((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });
  const category = query.get('category');
  const current = categories.data?.find((c) => c.slug === category);
  const filterContent = (
    <div className="filter-fields">
      <label>
        Model
        <select
          value={filters.get('model') ?? ''}
          onChange={(e) => update('model', e.target.value)}
        >
          <option value="">All models</option>
          {data?.facets.models.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label>
          Storage
          <select
            value={filters.get('storage') ?? ''}
            onChange={(e) => update('storage', e.target.value)}
          >
            <option value="">All configurations</option>
            {data?.facets.storages.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Color
          <select
            value={filters.get('color') ?? ''}
            onChange={(e) => update('color', e.target.value)}
          >
            <option value="">All colors</option>
            {data?.facets.colors.map((v) => (
              <option key={v.name}>{v.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-grid">
        {['minPrice', 'maxPrice'].map((key) => (
          <label key={key}>
            {key === 'minPrice' ? 'Minimum price (NPR)' : 'Maximum price (NPR)'}
            <input
              type="number"
              min={0}
              step="1"
              value={filters.has(key) ? Number(filters.get(key)) / 100 : ''}
              onChange={(e) =>
                update(key, e.target.value ? String(Math.round(Number(e.target.value) * 100)) : '')
              }
            />
          </label>
        ))}
      </div>
      <label>
        Availability
        <select
          value={filters.get('stock') ?? ''}
          onChange={(e) => update('stock', e.target.value)}
        >
          <option value="">All availability</option>
          <option value="in-stock">In stock</option>
          <option value="out-of-stock">Out of stock</option>
        </select>
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={filters.get('preorder') === 'true' || mode === 'prebook'}
          disabled={mode === 'prebook'}
          onChange={(e) => update('preorder', e.target.checked ? 'true' : '')}
        />
        Pre-booking configurations only
      </label>
      <button type="button" className="text-button" onClick={() => setFilters({})}>
        <X size={16} />
        Clear filters
      </button>
    </div>
  );
  return (
    <div className="container page">
      <PageIntro
        eyebrow="THE IPHONEBOOKING COLLECTION"
        title={
          mode === 'search'
            ? 'Find your next device.'
            : mode === 'wishlist'
              ? 'Your considered collection.'
              : mode === 'prebook'
                ? 'Be part of what’s next.'
                : mode === 'deals'
                  ? 'A little more possibility.'
                  : (current?.name ?? 'Your next great thing.')
        }
        description={
          current?.description ??
          'Find your device. Choose your configuration. Make your next move.'
        }
      />
      <div className="category-chips">
        <Link className={!category ? 'active' : ''} to="/store">
          All products
        </Link>
        {categories.data?.map((c) => (
          <Link
            key={c.id}
            className={category === c.slug ? 'active' : ''}
            to={`/store?category=${encodeURIComponent(c.slug)}`}
          >
            {c.name}
          </Link>
        ))}
      </div>
      {['store', 'catalog', 'prebook', 'deals'].includes(mode) && <OfficialAppleModels compact />}
      <form
        className="catalog-search"
        key={filters.get('q') ?? ''}
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          update('q', String(form.get('q') ?? ''));
        }}
      >
        <label className="sr-only" htmlFor="catalog-search">
          Search collection
        </label>
        <input
          id="catalog-search"
          name="q"
          defaultValue={filters.get('q') ?? ''}
          placeholder="Search by model, storage, color, or SKU"
          maxLength={100}
        />
        <button className="button secondary" aria-label="Search collection">
          <Search size={19} />
        </button>
      </form>
      {mode === 'prebook' && (
        <div className="notice">
          Choose a configuration to view its deposit and current availability. Allocation follows
          payment verification.
        </div>
      )}
      <div className="catalog-toolbar">
        <button className="text-button" onClick={() => setFilterOpen(true)}>
          <SlidersHorizontal size={17} />
          Filters {filters.size > 0 && <span className="status">{filters.size}</span>}
        </button>
        <span role="status">{result.isFetching ? 'Updating…' : `${data?.total ?? 0} devices`}</span>
        <label className="sort-label">
          Sort by
          <select
            aria-label="Sort products"
            value={filters.get('sort') ?? 'featured'}
            onChange={(e) => update('sort', e.target.value)}
          >
            <option value="featured">Featured</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="newest">Newest</option>
          </select>
        </label>
      </div>
      {result.isLoading ? (
        <Loading />
      ) : result.error ? (
        <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      ) : data?.products.length ? (
        <div className="product-grid catalog-grid">
          {data.products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <>
          {mode !== 'wishlist' && mode !== 'search' && (
            <DeviceCollectionStrip
              title={
                mode === 'prebook'
                  ? 'Pre-book the next generation.'
                  : mode === 'deals'
                    ? 'Discover our device families.'
                    : 'Choose your device family.'
              }
              description="Real product images, prices and Buy Now links appear as soon as published inventory is available."
            />
          )}
          <Empty
            title={mode === 'wishlist' ? 'Save something you love.' : 'No matching devices.'}
            description={
              mode === 'wishlist'
                ? 'Use the heart on a product to add it to your wishlist.'
                : 'Try another filter or explore the full collection.'
            }
          />
        </>
      )}
      {data && data.pageCount > 1 && (
        <nav className="panel-actions" aria-label="Catalog pages">
          <button
            className="button secondary"
            disabled={data.page <= 1}
            onClick={() => update('page', String(data.page - 1))}
          >
            Previous
          </button>
          <span>
            Page {data.page} of {data.pageCount}
          </span>
          <button
            className="button secondary"
            disabled={data.page >= data.pageCount}
            onClick={() => update('page', String(data.page + 1))}
          >
            Next
          </button>
        </nav>
      )}
      <section className="buying-guide">
        <div>
          <span className="eyebrow">A CLOSER LOOK</span>
          <h2>Make a considered choice.</h2>
          <p>Compare the details, side by side.</p>
        </div>
        <ArrowLink to="/compare">Compare devices</ArrowLink>
      </section>
      <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} title="Find your fit">
        {filterContent}
        <button className="button" onClick={() => setFilterOpen(false)}>
          Show results
        </button>
      </Dialog>
    </div>
  );
}
