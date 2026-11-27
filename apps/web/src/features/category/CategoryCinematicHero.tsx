import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, CheckCircle2, Layers3, ShieldCheck } from 'lucide-react';
import { money } from '../../services/api';
import type { Product } from '../../services/types';
import { DeviceFrame, type DeviceKind } from '../home/HomeDeviceFrames';
import type { CategorySlug } from './config';
import './cinematic-category.css';

type HeroCopy = {
  eyebrow: string;
  first: string;
  accent: string;
  last: string;
  description: string;
  caption: string;
};

const heroCopy: Record<Exclude<CategorySlug, 'store'>, HeroCopy> = {
  iphone: {
    eyebrow: 'IPHONE COLLECTION',
    first: 'The future of',
    accent: 'glass and',
    last: 'possibility.',
    description:
      'A new perspective on the iPhone. Explore real models, compare configurations and choose your next chapter in Nepal.',
    caption: 'A more personal way to connect.',
  },
  mac: {
    eyebrow: 'MAC COLLECTION',
    first: 'Power for',
    accent: 'ideas that',
    last: 'go further.',
    description:
      'A workspace made for what comes next. Compare real Mac models and choose the configuration that fits your work.',
    caption: 'Your ideas deserve room to grow.',
  },
  ipad: {
    eyebrow: 'IPAD COLLECTION',
    first: 'A canvas',
    accent: 'for every',
    last: 'possibility.',
    description:
      'A screen for your next big idea. Discover the current iPad range with specifications and prices from our catalog.',
    caption: 'Make space for imagination.',
  },
  watch: {
    eyebrow: 'APPLE WATCH COLLECTION',
    first: 'Every',
    accent: 'moment',
    last: 'made yours.',
    description:
      'Stay closer to the moments that matter. Explore Apple Watch models, sizes and finishes in one place.',
    caption: 'Designed to move with you.',
  },
  airpods: {
    eyebrow: 'AIRPODS COLLECTION',
    first: 'Hear every',
    accent: 'detail. Feel',
    last: 'everything.',
    description:
      'Find your everyday sound. Compare the AirPods range, published specifications and available configurations.',
    caption: 'Sound is personal.',
  },
  accessories: {
    eyebrow: 'ACCESSORIES COLLECTION',
    first: 'The perfect',
    accent: 'finishing',
    last: 'touch.',
    description:
      'Thoughtful essentials for your Apple world. Explore accessories, compatibility and verified product listings.',
    caption: 'Good design is in the details.',
  },
};

function realCatalogPhoto(candidate?: string): candidate is string {
  if (!candidate) return false;
  // Never substitute a generated placeholder, marketing collage, or category sprite
  // for an actual SKU photograph. Images come only from managed same-origin assets.
  if (!candidate.startsWith('/images/') && !candidate.startsWith('/uploads/')) return false;
  return !/\/(catalog|hero|himalayas|himalayan-banner)\.(?:webp|png|jpe?g)$/i.test(candidate);
}

function selectCatalogPhoto(product?: Product, variantImage?: string) {
  return [variantImage, product?.image, ...(product?.gallery ?? [])].find(realCatalogPhoto);
}

export function CategoryCinematicHero({
  slug,
  products,
}: {
  slug: CategorySlug;
  products: Product[];
}) {
  const [storage, setStorage] = useState('');
  const [color, setColor] = useState('');
  const product = products.find((item) => item.featured) ?? products[0];
  const variants = product?.variants ?? [];
  const storages = [...new Set(variants.map((variant) => variant.storage))];
  const activeStorage = storages.includes(storage) ? storage : storages[0];
  const storageVariants = variants.filter((variant) => variant.storage === activeStorage);
  const variant = storageVariants.find((item) => item.color === color) ?? storageVariants[0];
  const hasStock = variant?.stock.some((stock) => stock.available > 0) ?? false;
  const photo = selectCatalogPhoto(product, variant?.image);
  const family = slug === 'store' ? 'iphone' : slug;
  const copy = slug === 'store' ? heroCopy.iphone : heroCopy[slug];
  const destination = product
    ? `/products/${product.slug}${variant ? `?variant=${encodeURIComponent(variant.id)}` : ''}`
    : '/store';

  const action = !product
    ? 'Explore the collection'
    : variant?.preorder
      ? 'Pre-book now'
      : hasStock
        ? 'Buy now'
        : 'Check availability';

  return (
    <section
      className={`cinematic-category cinematic-category--${family}`}
      aria-labelledby="cinematic-title"
    >
      <div className="cinematic-category-grid" aria-hidden="true" />
      <div className="container cinematic-category-inner">
        <div className="cinematic-category-copy">
          <div className="cinematic-category-eyebrow">
            <span className="cinematic-category-dash" />
            <span className="cinematic-category-diamond" />
            {copy.eyebrow}
          </div>

          <h1 id="cinematic-title">
            <span>{copy.first}</span>
            <em>{copy.accent}</em>
            <span>{copy.last}</span>
          </h1>
          <p className="cinematic-category-description">
            {product
              ? `${product.name}. ${product.tagline} Discover its available configurations and verified catalog prices.`
              : copy.description}
          </p>

          {product && variants.length > 0 && (
            <div className="cinematic-category-config" aria-label={`Configure ${product.name}`}>
              {storages.length > 1 && (
                <div className="cinematic-category-config-row">
                  <span>Configuration</span>
                  <div role="group" aria-label="Storage">
                    {storages.map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={activeStorage === option}
                        onClick={() => {
                          setStorage(option);
                          setColor('');
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {storageVariants.length > 1 && (
                <div className="cinematic-category-config-row">
                  <span>Finish</span>
                  <div role="group" aria-label="Colour">
                    {storageVariants.map((option) => (
                      <button
                        type="button"
                        key={option.id}
                        aria-pressed={variant?.id === option.id}
                        onClick={() => setColor(option.color)}
                      >
                        <span
                          className="cinematic-category-swatch"
                          style={{ background: option.colorHex }}
                        />
                        {option.color}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="cinematic-category-actions">
            <Link className="cinematic-category-primary" to={product ? destination : '#lineup'}>
              {action} <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            <Link className="cinematic-category-secondary" to="/compare">
              Compare devices <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>

          <div className="cinematic-category-facts">
            {product ? (
              <>
                <div>
                  <strong>{String(products.length).padStart(2, '0')}</strong>
                  <span>CATALOG MODELS</span>
                </div>
                <div>
                  <strong>{variant?.storage || '—'}</strong>
                  <span>SELECTED CONFIGURATION</span>
                </div>
                <div>
                  <strong>{variant ? money(variant.price) : 'On request'}</strong>
                  <span>CATALOG PRICE</span>
                </div>
                <div>
                  <strong>
                    {variant?.preorder ? 'Pre-book' : hasStock ? 'Available' : 'Check stock'}
                  </strong>
                  <span>FULFILMENT</span>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Layers3 size={24} aria-hidden="true" />
                  <strong>Explore</strong>
                  <span>DEVICE FAMILY</span>
                </div>
                <div>
                  <CheckCircle2 size={24} aria-hidden="true" />
                  <strong>Compare</strong>
                  <span>CONFIGURATIONS</span>
                </div>
                <div>
                  <ShieldCheck size={24} aria-hidden="true" />
                  <strong>Verified</strong>
                  <span>PRICES WHEN LISTED</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="cinematic-category-stage">
          <div className="cinematic-category-halo" aria-hidden="true" />
          {photo && product ? (
            <div className="cinematic-category-real-photo">
              <img
                src={photo}
                alt={product.name}
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>
          ) : (
            <div className="cinematic-category-outline">
              <DeviceFrame kind={family as DeviceKind} realOnly />
            </div>
          )}
          <div className="cinematic-category-photo-caption">
            <span className="cinematic-category-diamond" aria-hidden="true" />
            <span>{photo && product ? product.name : copy.caption}</span>
            {!photo && <small>Product photograph available with published listings</small>}
          </div>
          {product && variant && (
            <Link
              to={destination}
              className="cinematic-category-price-tag"
              aria-label={`View ${product.name} from ${money(variant.price)}`}
            >
              <small>{variant.preorder ? 'PRE-BOOK' : 'FROM'}</small>
              <strong>{money(variant.price)}</strong>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
