import { Link } from 'react-router-dom';
import { Heart, Plus, Check, ArrowUpRight } from 'lucide-react';
import type { Product } from '../services/types';
import { money } from '../services/api';
import { useShop } from '../store/shop';
import { DeviceFrame, type DeviceKind } from '../features/home/HomeDeviceFrames';
import './product-frame.css';

function frameKind(slug: string): DeviceKind {
  if (
    slug === 'iphone' ||
    slug === 'mac' ||
    slug === 'ipad' ||
    slug === 'watch' ||
    slug === 'airpods'
  ) {
    return slug;
  }
  return 'accessories';
}

export function ProductCard({
  product,
  onQuickLook,
}: {
  product: Product;
  onQuickLook?: (product: Product) => void;
}) {
  const { wishlist, toggleWishlist, compare, toggleCompare } = useShop();
  const variants = product.variants;
  const price = variants.length ? Math.min(...variants.map((v) => v.price)) : null;
  const available = variants.find((v) => v.stock.some((s) => s.available > 0));
  const preferred = available ?? variants[0];
  const path = `/products/${product.slug}${preferred ? `?variant=${encodeURIComponent(preferred.id)}` : ''}`;
  const action = !preferred
    ? 'View product'
    : preferred.preorder
      ? 'Pre-book now'
      : available
        ? 'Buy now'
        : 'Check availability';
  const saved = wishlist.includes(product.id);
  const compared = compare.includes(product.id);

  return (
    <article
      className="product-card device-framed-card"
      data-product-category={product.category.slug}
    >
      <div className="product-image-wrap device-card-stage">
        <span className="product-badge">{product.badge ?? product.category.name}</span>
        <button
          type="button"
          className={`icon-button wishlist-button ${saved ? 'selected' : ''}`}
          aria-label={`${saved ? 'Remove' : 'Save'} ${product.name} ${saved ? 'from' : 'to'} wishlist`}
          aria-pressed={saved}
          onClick={() => toggleWishlist(product.id)}
        >
          <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
        <Link className="device-card-visual-link" to={path} aria-label={`View ${product.name}`}>
          <DeviceFrame
            kind={frameKind(product.category.slug)}
            image={preferred?.image || product.image}
            realOnly
          />
        </Link>
        <div className="color-dots">
          {[...new Map(variants.map((v) => [v.color, v])).values()].map((v) => (
            <span key={v.color} style={{ background: v.colorHex }} title={v.color} />
          ))}
        </div>
      </div>
      <div className="product-card-info">
        <Link to={path}>
          <h3>{product.name}</h3>
        </Link>
        <p>{product.tagline}</p>
        <div className="product-card-bottom">
          <span>
            {price === null ? (
              'Price on request'
            ) : (
              <>
                From <strong>{money(price)}</strong>
              </>
            )}
          </span>
          <button
            type="button"
            className="compare-mini"
            aria-label={`Compare ${product.name}`}
            aria-pressed={compared}
            onClick={() => toggleCompare(product.id)}
          >
            {compared ? <Check size={15} /> : <Plus size={15} />}
          </button>
        </div>
        <Link className="device-card-buy-button" to={path}>
          {action}
          <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
        {onQuickLook && (
          <button
            type="button"
            className="product-quick-look"
            onClick={() => onQuickLook(product)}
            aria-label={`Quick look at ${product.name}`}
          >
            Quick look <Plus size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}
