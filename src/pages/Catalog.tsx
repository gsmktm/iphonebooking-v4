import { useState } from 'react';
import { Link, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, ArrowUpRight, X } from 'lucide-react';
import { api } from '../services/api';
import type { Product, Category } from '../services/types';
import { ProductCard } from '../components/ProductCard';
import { PageIntro, Loading, ErrorNotice, Empty, ArrowLink, Dialog } from '../components/ui';
import { useShop } from '../store/shop';
export default function Catalog() {
  const location = useLocation();
  const params = useParams();
  const [filters, setFilters] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const category = params.category ?? location.pathname.slice(1);
  const isAll = ['store', 'prebook', 'wishlist'].includes(category);
  const { wishlist } = useShop();
  const query = new URLSearchParams(filters);
  if (!isAll) query.set('category', category);
  const products = useQuery({
    queryKey: ['products', query.toString()],
    queryFn: () => api<Product[]>(`/products?${query}`),
  });
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });
  const current = categories?.find((c) => c.slug === category);
  const list = products.data?.filter((p) =>
    category === 'prebook'
      ? p.variants.some((v) => v.preorder)
      : category === 'wishlist'
        ? wishlist.includes(p.id)
        : true,
  );
  const title =
    category === 'store'
      ? 'Your next great thing.'
      : category === 'prebook'
        ? 'Be part of what’s next.'
        : category === 'wishlist'
          ? 'A little wishful thinking.'
          : (current?.name ?? 'The collection');
  const update = (key: string, value: string) =>
    setFilters((prev) => {
      if (value) prev.set(key, value);
      else prev.delete(key);
      return prev;
    });
  const filterContent = (
    <div className="filter-fields">
      <label>
        Storage
        <select
          value={filters.get('storage') ?? ''}
          onChange={(e) => update('storage', e.target.value)}
        >
          <option value="">All configurations</option>
          {['128GB', '256GB', '512GB'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        Availability
        <select
          value={filters.get('stock') ?? ''}
          onChange={(e) => update('stock', e.target.value)}
        >
          <option value="">All availability</option>
          <option value="in-stock">In stock</option>
        </select>
      </label>
      <button className="text-button" onClick={() => setFilters({})}>
        <X size={15} />
        Clear filters
      </button>
    </div>
  );
  return (
    <div className="container page">
      <PageIntro
        eyebrow="THE IPHONEBOOKING COLLECTION"
        title={title}
        description={
          current?.description ??
          'Find the device that fits the way you live. And everything you want to do next.'
        }
      />
      <div className="category-chips">
        <Link className={isAll ? 'active' : ''} to="/store">
          All products
        </Link>
        {categories?.map((c) => (
          <Link className={category === c.slug ? 'active' : ''} key={c.id} to={`/${c.slug}`}>
            {c.name}
          </Link>
        ))}
      </div>
      {category === 'prebook' && (
        <div className="notice">
          Reserve an available configuration with store payment. Your reservation is held for 24
          hours; allocation is confirmed after payment.
        </div>
      )}
      <div className="catalog-toolbar">
        <button className="text-button" onClick={() => setFilterOpen(true)}>
          <SlidersHorizontal size={17} />
          Filters {filters.size > 0 && <span className="status">{filters.size}</span>}
        </button>
        <span className="muted">{list?.length ?? 0} devices to discover</span>
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
      {products.isLoading ? (
        <Loading />
      ) : products.error ? (
        <ErrorNotice error={products.error} retry={() => void products.refetch()} />
      ) : list?.length ? (
        <div className="product-grid catalog-grid">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <Empty
          title="No matching devices."
          description="Try another filter or explore the full collection."
        />
      )}
      <section className="buying-guide">
        <div>
          <span className="eyebrow">A LITTLE GUIDANCE GOES A LONG WAY</span>
          <h2>Find your kind of extraordinary.</h2>
          <p>Compare the details. Get a feel for the possibilities.</p>
        </div>
        <ArrowLink to="/compare">Compare devices</ArrowLink>
      </section>
      <Dialog open={filterOpen} onClose={() => setFilterOpen(false)} title="Make it yours">
        {filterContent}
        <button className="button" onClick={() => setFilterOpen(false)}>
          Show results <ArrowUpRight size={16} />
        </button>
      </Dialog>
    </div>
  );
}
