import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { Product } from '../services/types';
import { DeviceCollectionStrip } from './DeviceCollectionStrip';
import { ErrorNotice, Loading } from './ui';

export function ServiceDeviceShelf({ context }: { context: 'trade-in' | 'repair' }) {
  const products = useQuery({
    queryKey: ['products', 'service-device-shelf'],
    queryFn: () => api<Product[]>('/products'),
    staleTime: 30_000,
  });
  const upgrading = context === 'trade-in';
  return (
    <div className="service-device-shelf">
      {products.isLoading ? (
        <Loading />
      ) : (
        <>
          {products.error && (
            <ErrorNotice error={products.error} retry={() => void products.refetch()} />
          )}
          <DeviceCollectionStrip
            products={products.data ?? []}
            kinds={['iphone', 'mac', 'ipad', 'watch']}
            title={upgrading ? 'Your next device, in a better frame.' : 'Discover what comes next.'}
            description={
              upgrading
                ? 'Explore catalog devices with their published Nepal prices. Any trade-in credit is confirmed after inspection.'
                : 'Browse available devices while your current one gets the care it deserves. Prices come from the live catalog.'
            }
          />
        </>
      )}
    </div>
  );
}
