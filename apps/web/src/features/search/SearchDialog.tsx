import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowUpRight } from 'lucide-react';
import { api, money } from '../../services/api';
import type { Product } from '../../services/types';
import { Dialog, ErrorNotice, ProductVisual } from '../../components/ui';
type Results = {
  products: Product[];
  total: number;
  suggestions: { type: string; label: string; href: string }[];
  content: { slug: string; title: string; description: string; href: string }[];
  services: { id: string; title: string; description: string; href: string }[];
};
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState(''),
    [debounced, setDebounced] = useState('');
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 220);
    return () => clearTimeout(t);
  }, [query]);
  const result = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: ({ signal }) => api<Results>(`/search?q=${encodeURIComponent(debounced)}`, { signal }),
    enabled: open,
  });
  const data = result.data;
  const pending = result.isFetching || query.trim() !== debounced;
  return (
    <Dialog open={open} onClose={onClose} title="Find your next great thing">
      <div
        ref={container}
        onKeyDown={(e) => {
          if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
          const elements = [...container.current!.querySelectorAll<HTMLElement>('input,a')];
          const current = elements.indexOf(document.activeElement as HTMLElement);
          e.preventDefault();
          elements[
            (current + (e.key === 'ArrowDown' ? 1 : -1) + elements.length) % elements.length
          ]?.focus();
        }}
      >
        <div className="search-input">
          <Search size={22} />
          <input
            autoFocus
            value={query}
            maxLength={100}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Devices, storage, colors, or help…"
            aria-label="Search catalog"
          />
          <kbd>Esc</kbd>
        </div>
        <p className="fine-print" role="status">
          {pending
            ? 'Searching…'
            : data
              ? `${data.total} matching products`
              : 'Search the catalog and support'}
        </p>
        {result.error ? (
          <ErrorNotice error={result.error} retry={() => void result.refetch()} />
        ) : (
          <>
            <div className="search-results">
              {data?.products.map((p) => (
                <Link
                  key={p.id}
                  onClick={onClose}
                  to={`/products/${p.slug}?variant=${p.variants[0]?.id}`}
                >
                  <ProductVisual image={p.image} name={p.name} />
                  <div>
                    <strong>{p.name}</strong>
                    <p>
                      {p.variants[0]?.storage} · {p.variants[0]?.color} ·{' '}
                      {p.variants.length
                        ? money(Math.min(...p.variants.map((v) => v.price)))
                        : 'Check availability'}
                    </p>
                  </div>
                  <ArrowUpRight size={18} />
                </Link>
              ))}
            </div>
            {!!data?.suggestions.length && (
              <div className="search-shortcuts" aria-label="Suggested filters">
                {data.suggestions.slice(0, 8).map((s) => (
                  <Link key={s.href} to={s.href} onClick={onClose}>
                    {s.label}
                  </Link>
                ))}
              </div>
            )}
            {!!data?.content.length && (
              <div className="search-help">
                <h3>Guides & articles</h3>
                {data.content.map((a) => (
                  <Link className="text-button" key={a.slug} to={a.href} onClick={onClose}>
                    {a.title}
                    <ArrowUpRight size={15} />
                  </Link>
                ))}
              </div>
            )}
            {!!data?.services.length && (
              <div className="search-shortcuts">
                {data.services.map((s) => (
                  <Link key={s.id} to={s.href} onClick={onClose}>
                    {s.title}
                  </Link>
                ))}
              </div>
            )}
            {data && !data.total && !data.services.length && !data.content.length && (
              <p>No matches. Try a model name, storage size, color, or “repair”.</p>
            )}
            <Link
              className="text-button"
              to={`/store?q=${encodeURIComponent(debounced)}`}
              onClick={onClose}
            >
              View all products
              <ArrowUpRight size={16} />
            </Link>
          </>
        )}
      </div>
    </Dialog>
  );
}
