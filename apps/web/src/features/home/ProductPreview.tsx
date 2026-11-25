import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RotateCw } from 'lucide-react';
import { api, track } from '../../services/api';
import type { Product } from '../../services/types';
import { Dialog, ErrorNotice, Loading } from '../../components/ui';
import { useRecentDevices } from '../../store/recent';
import QuickConfigure from './QuickConfigure';

export type DeviceSelection = {
  product: Product;
  variantId?: string;
  trigger?: HTMLElement | null;
};
export type PreviewDevice = (product: Product, variantId?: string) => void;

export default function ProductPreview({
  selection,
  onClose,
}: {
  selection: DeviceSelection;
  onClose: () => void;
}) {
  const result = useQuery({
    queryKey: ['device-preview', selection.product.slug],
    queryFn: ({ signal }) => api<Product>(`/products/${selection.product.slug}`, { signal }),
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    if (result.data) {
      useRecentDevices.getState().record(result.data.id);
      track('product_viewed', result.data.id);
    }
  }, [result.data?.id]);
  return (
    <Dialog
      open
      onClose={onClose}
      title={`A closer look at ${selection.product.name}`}
      restoreFocusTo={selection.trigger}
    >
      <div className="home-device-preview">
        <p className="preview-note">Choose your configuration. Check stock. Make it yours.</p>
        {result.isFetching ? (
          <Loading />
        ) : result.error ? (
          <ErrorNotice error={result.error} retry={() => void result.refetch()} />
        ) : (
          result.data && (
            <QuickConfigure product={result.data} initialVariantId={selection.variantId} />
          )
        )}
        <button
          className="text-button preview-refresh"
          disabled={result.isFetching}
          onClick={() => void result.refetch()}
        >
          <RotateCw size={14} aria-hidden="true" /> Refresh price & availability
        </button>
      </div>
    </Dialog>
  );
}
