import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, Mountain, CircleCheck } from 'lucide-react';
import { ButtonLink, ProductVisual } from '../../components/ui';
import { money } from '../../services/api';
import type { Product } from '../../services/types';
import './home-hero.css';

export default function HomeHero({
  title,
  body,
  href,
  products = [],
  discoveryHref = '#collection',
}: {
  title?: string;
  body?: string;
  href?: string;
  products?: Product[];
  discoveryHref?: string;
}) {
  const primary = products.find((product) => product.category.slug === 'iphone') ?? products[0];
  const secondary = products.find(
    (product) => product.id !== primary?.id && product.category.slug === 'mac',
  );
  const variant =
    primary?.variants.find((option) => option.stock.some((stock) => stock.available > 0)) ??
    primary?.variants[0];
  const heading = title || 'Book the Future.';
  return (
    <section className="campaign-hero" aria-labelledby="campaign-title">
      <picture className="campaign-landscape">
        <source media="(max-width: 640px)" srcSet="/images/himalayas-v2-800.jpg" />
        <img
          src="/images/himalayas-v2.jpg"
          alt=""
          fetchPriority="high"
          decoding="async"
          width={1536}
          height={1024}
        />
      </picture>
      <div className="container campaign-inner">
        <div className="campaign-copy">
          <span className="eyebrow">
            <span className="gold-dot" /> A HIGHER STANDARD OF CONNECTION
          </span>
          <h1 id="campaign-title">
            {heading === 'Book the Future.' ? (
              <>
                Book the
                <br />
                <em>Future.</em>
              </>
            ) : (
              heading
            )}
          </h1>
          <p className="campaign-subtitle">From the Himalayas to the World.</p>
          <p className="campaign-description">
            {body ||
              'Discover the devices you love. Book your next chapter. And find care that stays with you.'}
          </p>
          <div className="campaign-actions">
            <ButtonLink to={href || '/prebook'}>Pre-book now</ButtonLink>
            <ButtonLink to="/store" secondary>
              Explore devices
            </ButtonLink>
          </div>
          <div className="campaign-assurance">
            <CircleCheck size={15} aria-hidden="true" /> Your device. Every chapter. One place.
          </div>
        </div>
        {primary && variant && (
          <div className="campaign-devices" aria-label="Featured catalog devices">
            {secondary && (
              <Link className="hero-device hero-device-back" to={`/products/${secondary.slug}`}>
                <span className="hero-device-label">{secondary.category.name}</span>
                <ProductVisual image={secondary.image} name={secondary.name} priority />
                <span className="hero-device-name">
                  {secondary.name}
                  <ArrowUpRight size={17} />
                </span>
              </Link>
            )}
            <Link
              className="hero-device hero-device-front"
              to={`/products/${primary.slug}?variant=${variant.id}`}
            >
              <div className="hero-device-top">
                <span className="hero-device-label">{primary.category.name}</span>
                <span className="hero-device-availability">
                  <span className="gold-dot" />
                  {variant.stock.some((stock) => stock.available > 0)
                    ? variant.preorder
                      ? 'PRE-BOOK'
                      : 'IN STOCK'
                    : 'VIEW DETAILS'}
                </span>
              </div>
              <ProductVisual
                image={variant.image || primary.image}
                name={`${primary.name}, ${variant.color}`}
                priority
              />
              <div className="hero-device-detail">
                <div>
                  <strong>{primary.name}</strong>
                  <span>
                    {variant.storage} · {variant.color}
                  </span>
                </div>
                <ArrowUpRight size={21} />
              </div>
              <span className="hero-device-price">{money(variant.price)}</span>
            </Link>
            <span className="hero-studio-note">Catalog studio illustration</span>
          </div>
        )}
      </div>
      <div className="container campaign-base">
        <a href={discoveryHref}>
          <ArrowDown size={15} aria-hidden="true" /> Discover your next chapter
        </a>
        <span>
          <Mountain size={16} aria-hidden="true" /> NEPAL, AT HEART. THE WORLD, AHEAD.
        </span>
        <span>27.7172° N · 85.3240° E</span>
      </div>
    </section>
  );
}
