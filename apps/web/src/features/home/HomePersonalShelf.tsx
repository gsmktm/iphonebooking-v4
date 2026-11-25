import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart, History, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import type { Product } from '../../services/types';
import { useShop } from '../../store/shop';
import { useRecentDevices } from '../../store/recent';
import { ArrowLink, ErrorNotice, Loading, SectionHeading } from '../../components/ui';
import { DeviceRail } from './HomeDiscovery';
import type { PreviewDevice } from './ProductPreview';
import type { HomeCopy } from './home-sections';

export default function HomePersonalShelf({
  copy,
  onPreview,
}: {
  copy: HomeCopy;
  onPreview: PreviewDevice;
}) {
  const wishlist = useShop((s) => s.wishlist);
  const recent = useRecentDevices((s) => s.ids);
  const clear = useRecentDevices((s) => s.clear);
  const [tab, setTab] = useState('saved');
  const ids = [...new Set([...wishlist.slice(0, 8), ...recent])];
  const result = useQuery({
    queryKey: ['home-personal-devices', ids.join(',')],
    queryFn: ({ signal }) =>
      api<Product[]>(`/products?ids=${encodeURIComponent(ids.join(','))}&pageSize=16`, { signal }),
    enabled: ids.length > 0,
  });
  if (!ids.length) return null;
  const activeTab = wishlist.length && recent.length ? tab : wishlist.length ? 'saved' : 'recent';
  const orderedIds = activeTab === 'saved' ? wishlist.slice(0, 8) : recent;
  const products = orderedIds.flatMap((id) => {
    const product = result.data?.find((p) => p.id === id);
    return product ? [product] : [];
  });
  return (
    <section className="container home-section home-personal-shelf">
      <SectionHeading
        eyebrow="PICK UP WHERE YOU LEFT OFF"
        title={copy.title}
        description={copy.body}
        action={<ArrowLink to={copy.href || '/wishlist'}>Your wishlist</ArrowLink>}
      />
      <div className="personal-shelf-toolbar">
        <div role="group" aria-label="Your device collections">
          {!!wishlist.length && (
            <button
              className="choice-pill"
              aria-pressed={activeTab === 'saved'}
              onClick={() => setTab('saved')}
            >
              <Heart size={15} />
              Saved
            </button>
          )}
          {!!recent.length && (
            <button
              className="choice-pill"
              aria-pressed={activeTab === 'recent'}
              onClick={() => setTab('recent')}
            >
              <History size={15} />
              Recently viewed
            </button>
          )}
        </div>
        {activeTab === 'recent' && (
          <button className="text-button" onClick={clear}>
            <Trash2 size={14} />
            Clear browsing history
          </button>
        )}
      </div>
      {activeTab === 'recent' && (
        <p className="home-result-count">Your last eight devices in this browser tab.</p>
      )}
      {result.isPending ? (
        <Loading />
      ) : result.error ? (
        <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      ) : products.length ? (
        <DeviceRail
          products={products}
          label={activeTab === 'saved' ? 'Saved devices' : 'Recently viewed devices'}
          onPreview={onPreview}
        />
      ) : (
        <p className="notice">
          These devices are no longer in the active collection. Explore the store to find something
          new.
        </p>
      )}
    </section>
  );
}
