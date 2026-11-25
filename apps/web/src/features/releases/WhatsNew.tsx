import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Product } from '../../services/types';
import { money } from '../../services/api';
import { ProductVisual, SectionHeading, ArrowLink } from '../../components/ui';

export default function WhatsNew({ products }: { products?: Product[] }) {
  const selection = products?.filter((p) => p.variants.length && p.featured).slice(0, 3) ?? [];
  if (!selection.length) return null;
  return (
    <section
      className="container home-section collection-stories"
      aria-label="Collection highlights"
    >
      <SectionHeading
        eyebrow="DESIGNED FOR WHAT COMES NEXT"
        title="A world of possibility."
        action={<ArrowLink to="/store">Explore the collection</ArrowLink>}
      />
      <div className="collection-grid">
        {selection.map((product, index) => {
          const available = product.variants.some((v) => v.stock.some((s) => s.available > 0));
          const preorder = product.variants.some((v) => v.preorder);
          return (
            <Link to={`/products/${product.slug}`} className="collection-story" key={product.id}>
              <div className="collection-story-heading">
                <span className="eyebrow">
                  {String(index + 1).padStart(2, '0')} / {product.category.name}
                </span>
                <ArrowUpRight size={20} />
              </div>
              <ProductVisual image={product.image} name={product.name} />
              <div className="collection-story-copy">
                <span className="collection-stock">
                  {preorder
                    ? 'Pre-booking'
                    : available
                      ? 'Available to reserve'
                      : 'Check availability'}
                </span>
                <h3>{product.name}</h3>
                <p>{product.tagline}</p>
                <strong>From {money(Math.min(...product.variants.map((v) => v.price)))}</strong>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
