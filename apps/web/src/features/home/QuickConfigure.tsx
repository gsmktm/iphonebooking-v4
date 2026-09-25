import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import type { Product } from '../../services/types';
import { money } from '../../services/api';
import { ProductVisual } from '../../components/ui';
import { useShop } from '../../store/shop';
import { cn } from '../../utils/cn';
export default function QuickConfigure({ product }: { product: Product }) {
  const [variantId, setVariantId] = useState(
    product.variants.find((v) => v.stock.some((s) => s.available > 0))?.id ??
      product.variants[0]?.id,
  );
  const [added, setAdded] = useState(false);
  const add = useShop((s) => s.add);
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  if (!variant) return null;
  const colors = [...new Set(product.variants.map((v) => v.color))];
  const options = product.variants.filter((v) => v.color === variant.color);
  const available = variant.stock.some((s) => s.available > 0);
  return (
    <section
      className="luxe-panel quick-config grid gap-6 md:grid-cols-2"
      aria-labelledby="configure-title"
    >
      <ProductVisual image={variant.image ?? product.image} name={product.name} />
      <div>
        <span className="eyebrow">MAKE IT YOURS</span>
        <h2 id="configure-title" className="text-balance">
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
                  setVariantId(
                    product.variants.find((v) => v.color === color && v.storage === variant.storage)
                      ?.id ?? product.variants.find((v) => v.color === color)!.id,
                  );
                  setAdded(false);
                }}
              >
                {color}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="config-options">
          <legend>Storage</legend>
          <div className="flex flex-wrap gap-2">
            {options.map((v) => (
              <button
                key={v.id}
                type="button"
                aria-pressed={v.id === variant.id}
                className={cn('choice-pill', v.id === variant.id && 'selected')}
                onClick={() => {
                  setVariantId(v.id);
                  setAdded(false);
                }}
              >
                {v.storage}
              </button>
            ))}
          </div>
        </fieldset>
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
            <Link to={`/products/${product.slug}`}>Full details & specifications →</Link>
          )}
        </div>
      </div>
    </section>
  );
}
