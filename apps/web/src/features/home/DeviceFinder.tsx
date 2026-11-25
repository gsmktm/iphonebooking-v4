import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, Search, RotateCcw } from 'lucide-react';
import { api, money } from '../../services/api';
import type { CatalogResult, Category } from '../../services/types';
import { Dialog, ErrorNotice, Loading, ProductVisual } from '../../components/ui';
import type { PreviewDevice } from './ProductPreview';

export default function DeviceFinder({
  categories,
  onClose,
  onPreview,
}: {
  categories: Category[];
  onClose: () => void;
  onPreview: PreviewDevice;
}) {
  const [category, setCategory] = useState('');
  const [budget, setBudget] = useState('');
  const [inStock, setInStock] = useState(true);
  const [search, setSearch] = useState<string | null>(null);
  const results = useQuery({
    queryKey: ['device-finder', search],
    queryFn: ({ signal }) =>
      api<CatalogResult>(`/catalog?${search}&pageSize=3&sort=price-low`, { signal }),
    enabled: search !== null,
    staleTime: 0,
  });
  return (
    <Dialog open title="Find your next device" onClose={onClose}>
      <div className="home-device-finder">
        <p className="finder-introduction">A few details. A collection that fits you.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const query = new URLSearchParams();
            if (category) query.set('category', category);
            if (budget) query.set('maxPrice', String(Math.round(Number(budget) * 100)));
            if (inStock) query.set('stock', 'in-stock');
            setSearch(query.toString());
            if (search === query.toString()) void results.refetch();
          }}
        >
          <label>
            What are you looking for?
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Explore every family</option>
              {categories.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Your maximum budget in NPR
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="21474836"
              step="1"
              placeholder="Any budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </label>
          <div className="finder-budget-presets" role="group" aria-label="Budget suggestions">
            {[30000, 100000, 200000].map((value) => (
              <button
                className="choice-pill"
                type="button"
                key={value}
                aria-pressed={budget === String(value)}
                onClick={() => setBudget(String(value))}
              >
                Under {money(value * 100)}
              </button>
            ))}
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
            />
            Only show configurations in stock
          </label>
          <button className="button" disabled={results.isFetching}>
            <Search size={16} aria-hidden="true" />
            {results.isFetching ? 'Finding your fit…' : 'Show my matches'}
          </button>
        </form>
        {search !== null && (
          <div className="finder-results">
            {results.isPending ? (
              <Loading />
            ) : results.error ? (
              <ErrorNotice error={results.error} retry={() => void results.refetch()} />
            ) : (
              <>
                <p role="status" className="finder-match-count">
                  {results.data?.total
                    ? `${results.data.total} matching ${results.data.total === 1 ? 'device' : 'devices'}. Here are your closest fits by price.`
                    : 'No configurations fit these preferences right now.'}
                </p>
                {results.data?.products.map((product) => {
                  const variant = product.variants[0];
                  return (
                    <article className="finder-match" key={product.id}>
                      <ProductVisual image={variant.image || product.image} name={product.name} />
                      <div>
                        <h3>
                          <Link to={`/products/${product.slug}?variant=${variant.id}`}>
                            {product.name}
                          </Link>
                        </h3>
                        <p>
                          {variant.storage} · {variant.color}
                        </p>
                        <strong>{money(variant.price)}</strong>
                        <span className="finder-match-reason">
                          <Check size={12} aria-hidden="true" />
                          Matches your selected filters
                        </span>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`Configure matching ${product.name}`}
                        onClick={() => onPreview(product, variant.id)}
                      >
                        <ArrowRight size={18} />
                      </button>
                    </article>
                  );
                })}
                {!!results.data?.total && (
                  <Link className="button secondary" to={`/store?${search}&sort=price-low`}>
                    See all matches <ArrowRight size={15} />
                  </Link>
                )}
              </>
            )}
            <button
              className="text-button finder-reset"
              onClick={() => {
                setSearch(null);
                setBudget('');
                setCategory('');
                setInStock(true);
              }}
            >
              <RotateCcw size={14} />
              Start again
            </button>
          </div>
        )}
      </div>
    </Dialog>
  );
}
