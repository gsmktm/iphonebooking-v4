import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Product } from '../services/types';
import { ProductCard } from './ProductCard';
import { DeviceFrame, type DeviceKind } from '../features/home/HomeDeviceFrames';
import './device-collection.css';

const labels: Record<DeviceKind, string> = {
  iphone: 'iPhone',
  mac: 'Mac',
  ipad: 'iPad',
  watch: 'Apple Watch',
  airpods: 'AirPods',
  accessories: 'Accessories',
};
const allFamilies: DeviceKind[] = [
  'iphone',
  'mac',
  'ipad',
  'watch',
  'airpods',
  'accessories',
];

/**
 * Every selected category has a recognisable device frame.
 * Only real catalogue entries display a product price or purchase CTA.
 */
export function DeviceCollectionStrip({
  products = [],
  kinds = allFamilies,
  title = 'Explore devices in their own frame.',
  description = 'Choose a collection, then select an available model and configuration.',
}: {
  products?: Product[];
  kinds?: readonly DeviceKind[];
  title?: string;
  description?: string;
}) {
  return (
    <section className="device-collection-strip" aria-label={title}>
      <div className="device-collection-heading">
        <span className="eyebrow">THE DEVICE COLLECTION</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="device-collection-grid">
        {kinds.map((kind) => {
          const product = products.find((item) => item.category.slug === kind);
          if (product) return <ProductCard key={product.id} product={product} />;
          return (
            <article
              className="device-family-placeholder"
              data-device-family={kind}
              key={kind}
            >
              <Link to={`/${kind}`} className="device-family-placeholder-visual">
                <DeviceFrame kind={kind} />
              </Link>
              <div className="device-family-placeholder-details">
                <h3>{labels[kind]}</h3>
                <p>Current models and prices will appear when the catalog is published.</p>
                <div className="device-family-placeholder-actions">
                  <span>Price not available</span>
                  <Link to={`/${kind}`} aria-label={`Explore ${labels[kind]}`}>
                    Explore <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
