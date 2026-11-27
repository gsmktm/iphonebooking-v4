import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { money } from '../../services/api';
import type { HomeFeed, Product } from '../../services/types';
import type { PreviewDevice } from './ProductPreview';
import './device-frames.css';

type DeviceKind = 'iphone' | 'mac' | 'ipad' | 'watch';

const families: {
  kind: DeviceKind;
  label: string;
  eyebrow: string;
  description: string;
  href: string;
}[] = [
  {
    kind: 'iphone',
    label: 'iPhone',
    eyebrow: 'A WORLD IN YOUR HAND',
    description: 'Find the iPhone that feels like yours.',
    href: '/iphone',
  },
  {
    kind: 'mac',
    label: 'Mac',
    eyebrow: 'MADE FOR BIG IDEAS',
    description: 'Room to create, work and go further.',
    href: '/mac',
  },
  {
    kind: 'ipad',
    label: 'iPad',
    eyebrow: 'POSSIBILITY, UNBOUND',
    description: 'A beautiful canvas for every idea.',
    href: '/ipad',
  },
  {
    kind: 'watch',
    label: 'Watch',
    eyebrow: 'EVERY MOMENT MATTERS',
    description: 'Stay connected to what moves you.',
    href: '/watch',
  },
];

function DeviceFrame({ kind, image }: { kind: DeviceKind; image?: string }) {
  // Product pictures may already show the whole device. In that case the
  // product art is contained within the frame rather than cropped into a fake UI.
  const catalogArtwork = image?.startsWith('/images/') ? image : undefined;
  return (
    <div className={`home-device-frame home-device-frame--${kind}`} aria-hidden="true">
      {kind === 'iphone' && (
        <div className="home-frame-phone">
          <div className="home-frame-screen">
            <span className="home-frame-wallpaper" />
            {catalogArtwork && <img src={catalogArtwork} alt="" loading="lazy" />}
            <span className="home-frame-island" />
            <span className="home-frame-homebar" />
          </div>
        </div>
      )}
      {kind === 'mac' && (
        <div className="home-frame-mac">
          <div className="home-frame-mac-lid">
            <span className="home-frame-mac-camera" />
            <div className="home-frame-screen">
              <span className="home-frame-wallpaper" />
              {catalogArtwork && <img src={catalogArtwork} alt="" loading="lazy" />}
            </div>
          </div>
          <span className="home-frame-mac-base">
            <span className="home-frame-mac-notch" />
          </span>
        </div>
      )}
      {kind === 'ipad' && (
        <div className="home-frame-ipad">
          <span className="home-frame-ipad-camera" />
          <div className="home-frame-screen">
            <span className="home-frame-wallpaper" />
            {catalogArtwork && <img src={catalogArtwork} alt="" loading="lazy" />}
          </div>
        </div>
      )}
      {kind === 'watch' && (
        <div className="home-frame-watch">
          <span className="home-frame-watch-band home-frame-watch-band-top" />
          <div className="home-frame-watch-case">
            <div className="home-frame-screen">
              <span className="home-frame-wallpaper" />
              {catalogArtwork ? (
                <img src={catalogArtwork} alt="" loading="lazy" />
              ) : (
                <span className="home-frame-watch-dial">
                  <span className="home-frame-watch-dial-inner" />
                </span>
              )}
            </div>
          </div>
          <span className="home-frame-watch-crown" />
          <span className="home-frame-watch-band home-frame-watch-band-bottom" />
        </div>
      )}
    </div>
  );
}

function availableVariant(product?: Product) {
  return (
    product?.variants.find((variant) => variant.stock.some((stock) => stock.available > 0)) ??
    product?.variants[0]
  );
}

export default function HomeDeviceFrames({
  data,
  onPreview,
}: {
  data?: HomeFeed;
  onPreview: PreviewDevice;
}) {
  return (
    <section className="home-device-showcase home-section" aria-labelledby="device-showcase-title">
      <div className="container">
        <header className="home-device-showcase-heading">
          <div>
            <span className="eyebrow">DESIGNED AROUND THE DEVICE</span>
            <h2 id="device-showcase-title">
              Four worlds. <em>One destination.</em>
            </h2>
            <p>Explore each family in its own iconic frame. From the Himalayas, for your world.</p>
          </div>
          <Link to="/store" className="home-device-showcase-all">
            Explore every device <ArrowUpRight aria-hidden="true" size={18} />
          </Link>
        </header>
        <div className="home-device-showcase-grid">
          {families.map((family, index) => {
            const product =
              (family.kind === 'iphone' ? data?.iphones[0] : undefined) ??
              data?.products.find((item) => item.category.slug === family.kind);
            const variant = availableVariant(product);
            const price = product?.variants.length
              ? Math.min(...product.variants.map((item) => item.price))
              : undefined;
            const destination = product ? `/products/${product.slug}` : family.href;
            return (
              <article
                key={family.kind}
                className={`home-device-family home-device-family--${family.kind}`}
                data-device-family={family.kind}
              >
                <div className="home-device-family-top">
                  <span className="home-device-family-number">0{index + 1} / 04</span>
                  <span className="home-device-family-name">{family.label}</span>
                </div>
                <Link
                  to={destination}
                  className="home-device-family-frame-link"
                  aria-label={product ? `View ${product.name}` : `Explore ${family.label}`}
                >
                  <DeviceFrame kind={family.kind} image={variant?.image || product?.image} />
                </Link>
                <div className="home-device-family-details">
                  <span className="eyebrow">{family.eyebrow}</span>
                  <h3>{product?.name ?? family.label}</h3>
                  <p>{product?.tagline ?? family.description}</p>
                  <div className="home-device-family-bottom">
                    <span className="home-device-family-price">
                      {price === undefined ? 'Discover the collection' : `From ${money(price)}`}
                    </span>
                    {product && variant ? (
                      <button
                        type="button"
                        className="home-device-family-action"
                        onClick={() => onPreview(product, variant.id)}
                        aria-label={`Configure ${product.name}`}
                      >
                        <ArrowRight size={20} aria-hidden="true" />
                      </button>
                    ) : (
                      <Link
                        className="home-device-family-action"
                        to={family.href}
                        aria-label={`Browse ${family.label} collection`}
                      >
                        <ArrowRight size={20} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
