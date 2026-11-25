import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, MapPin } from 'lucide-react';
import type { Product } from '../../services/types';
import { money, track } from '../../services/api';
import { ProductVisual } from '../../components/ui';
import { useShop } from '../../store/shop';
import { cn } from '../../utils/cn';
export default function QuickConfigure({
  product,
  initialVariantId,
}: {
  product: Product;
  initialVariantId?: string;
}) {
  const titleId = useId();
  const [variantId, setVariantId] = useState(
    product.variants.find((v) => v.id === initialVariantId)?.id ??
      product.variants.find((v) => v.stock.some((s) => s.available > 0))?.id ??
      product.variants[0]?.id,
  );
  const [storeId, setStoreId] = useState('');
  const [added, setAdded] = useState(false);
  const add = useShop((s) => s.add);
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  if (!variant) return null;
  const colors = [...new Set(product.variants.map((v) => v.color))];
  const options = product.variants.filter((v) => v.color === variant.color);
  const available = variant.stock.some((s) => s.available > 0);
  const stores = [
    ...new Map(
      product.variants.flatMap((v) =>
        v.stock.flatMap((s) =>
          s.store?.services.some((service) => service.toLowerCase().includes('pickup'))
            ? [[s.store.id, s.store] as const]
            : [],
        ),
      ),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));
  const selectedStore = stores.find((store) => store.id === storeId) ?? stores[0];
  const pickupStock = variant.stock.find((stock) => stock.store?.id === selectedStore?.id);
  const selectVariant = (id: string) => {
    setVariantId(id);
    setAdded(false);
    track('variant_selected', id);
  };
  return (
    <section
      className="luxe-panel quick-config grid gap-6 md:grid-cols-2"
      aria-labelledby={titleId}
    >
      <ProductVisual image={variant.image ?? product.image} name={product.name} />
      <div>
        <span className="eyebrow">MAKE IT YOURS</span>
        <h2 id={titleId} className="text-balance">
          {product.name}
        </h2>
        <p className="text-pretty text-soft">
          Choose the details. See the price. Make your next move.
        </p>
        <fieldset className="config-options">
          <legend>Color · {variant.color}</legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                aria-pressed={color === variant.color}
                className={cn('choice-pill', color === variant.color && 'selected')}
                onClick={() => {
                  selectVariant(
                    product.variants.find((v) => v.color === color && v.storage === variant.storage)
                      ?.id ?? product.variants.find((v) => v.color === color)!.id,
                  );
                }}
              >
                {color}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="config-options">
          <legend>
            {['iphone', 'mac', 'ipad'].includes(product.category.slug)
              ? 'Storage'
              : 'Configuration'}
          </legend>
          <div className="flex flex-wrap gap-2">
            {options.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={v.id === variant.id}
                className={cn('choice-pill', v.id === variant.id && 'selected')}
                onClick={() => {
                  selectVariant(v.id);
                }}
              >
                {v.storage}
              </button>
            ))}
          </div>
        </fieldset>
        {!!stores.length && (
          <div className="config-pickup">
            <label>
              <span>
                <MapPin size={15} aria-hidden="true" /> Check pickup availability
              </span>
              <select value={selectedStore?.id ?? ''} onChange={(e) => setStoreId(e.target.value)}>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </label>
            <p role="status">
              {(pickupStock?.available ?? 0) > 0
                ? variant.preorder
                  ? 'Reservation stock at this location.'
                  : 'In stock at this location.'
                : 'Unavailable at this location.'}
              <small>
                Choose your pickup location at checkout. Availability is checked again before your
                order.
              </small>
            </p>
          </div>
        )}
        <div className="config-price flex flex-wrap items-center justify-between gap-4">
          <div>
            <strong className="tabular-nums">{money(variant.price)}</strong>
            <small>
              {available
                ? variant.preorder
                  ? 'Pre-booking available'
                  : 'In stock'
                : 'Currently unavailable'}
            </small>
          </div>
          <button
            className="button"
            disabled={!available}
            onClick={() => {
              add(product, variant);
              track('add_to_cart', variant.id);
              setAdded(true);
            }}
          >
            {added ? (
              <>
                <Check size={16} />
                Added to bag
              </>
            ) : (
              <>
                Add to bag
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
        <div className="config-result" role="status">
          {added ? (
            <Link to="/cart">Review your bag →</Link>
          ) : (
            <Link to={`/products/${product.slug}?variant=${variant.id}`}>
              Full details & specifications →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
