import { Link } from 'react-router-dom';
import { Heart, Plus, Check } from 'lucide-react';
import type { Product } from '../services/types';
import { money } from '../services/api';
import { useShop } from '../store/shop';
import { ProductVisual } from './ui';
export function ProductCard({
  product,
  onQuickLook,
}: {
  product: Product;
  onQuickLook?: (product: Product) => void;
}) {
  const { wishlist, toggleWishlist, compare, toggleCompare } = useShop();
  const price = Math.min(...product.variants.map((v) => v.price));
  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <span className="product-badge">{product.badge ?? product.category.name}</span>
        <button
          className={`icon-button wishlist-button ${wishlist.includes(product.id) ? 'selected' : ''}`}
          aria-label={`${wishlist.includes(product.id) ? 'Remove' : 'Save'} ${product.name} ${wishlist.includes(product.id) ? 'from' : 'to'} wishlist`}
          aria-pressed={wishlist.includes(product.id)}
          onClick={() => toggleWishlist(product.id)}
        >
          <Heart size={18} fill={wishlist.includes(product.id) ? 'currentColor' : 'none'} />
        </button>
        <Link to={`/products/${product.slug}`}>
          <ProductVisual image={product.image} name={product.name} />
        </Link>
        <div className="color-dots">
          {[...new Map(product.variants.map((v) => [v.color, v])).values()].map((v) => (
            <span key={v.color} style={{ background: v.colorHex }} title={v.color} />
          ))}
        </div>
      </div>
      <div className="product-card-info">
        <Link to={`/products/${product.slug}`}>
          <h3>{product.name}</h3>
        </Link>
        <p>{product.tagline}</p>
        <div className="product-card-bottom">
          <span>
            From <strong>{money(price)}</strong>
          </span>
          <button
            className="compare-mini"
            aria-label={`Compare ${product.name}`}
            aria-pressed={compare.includes(product.id)}
            onClick={() => toggleCompare(product.id)}
          >
            {compare.includes(product.id) ? <Check size={15} /> : <Plus size={15} />}
          </button>
        </div>
        {onQuickLook && (
          <button
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
