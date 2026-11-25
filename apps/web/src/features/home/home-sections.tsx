import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Wrench,
  MapPin,
  Smartphone,
  PackageCheck,
  SlidersHorizontal,
  Globe2,
  ArrowRight,
  Headphones,
  CircleCheck,
  ReceiptText,
  BookOpen,
  Mountain,
} from 'lucide-react';
import { money, date } from '../../services/api';
import type { HomeFeed } from '../../services/types';
import { ProductCard } from '../../components/ProductCard';
import { ArrowLink, ButtonLink, SectionHeading, ProductVisual, Loading } from '../../components/ui';
import QuickConfigure from './QuickConfigure';
import { Rating, ReviewCard } from '../reviews/Reviews';

export interface HomeCopy {
  title: string;
  body: string;
  href?: string;
}
type DataProps = { data?: HomeFeed; copy: HomeCopy };

const actions = [
  {
    Icon: Smartphone,
    title: 'Pre-book a device',
    note: 'Your next chapter starts here',
    to: '/prebook',
  },
  {
    Icon: SlidersHorizontal,
    title: 'Compare devices',
    note: 'Find the right fit for you',
    to: '/compare',
  },
  {
    Icon: RefreshCw,
    title: 'Trade in & upgrade',
    note: 'Give good things a new life',
    to: '/trade-in',
  },
  { Icon: Wrench, title: 'Book a repair', note: 'A little care. A lot more life.', to: '/repair' },
];

function NetworkArt() {
  return (
    <div className="network-art" aria-hidden="true">
      <svg viewBox="0 0 640 340" fill="none">
        <defs>
          <pattern id="map-dots" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill="currentColor" />
          </pattern>
        </defs>
        <g fill="url(#map-dots)">
          <path d="M65 68 131 47 195 63 205 102 178 114 160 141 134 140 120 159 104 149 89 110 61 92Z" />
          <path d="M143 169 177 155 204 175 207 204 186 239 171 273 152 256 155 214 140 195Z" />
          <path d="M271 78 309 64 336 79 341 109 323 127 308 115 289 123 277 105Z" />
          <path d="M291 135 340 124 366 151 363 185 342 229 313 221 302 184 282 161Z" />
          <path d="M343 69 396 46 450 58 482 49 533 72 551 107 509 128 475 121 459 151 429 168 407 136 382 125 363 105Z" />
          <path d="M426 165 443 178 453 205 473 213 457 228 444 204Z" />
          <path d="M475 245 513 224 548 238 559 271 534 288 489 279Z" />
          <path d="M214 27 248 18 265 43 235 53Z" />
        </g>
        <path
          d="M430 142Q382 84 324 105M430 142Q242 112 143 104M430 142Q455 172 513 256"
          stroke="currentColor"
          strokeOpacity=".2"
          strokeDasharray="4 6"
        />
        <circle cx="430" cy="142" r="23" stroke="currentColor" strokeOpacity=".18" />
        <circle cx="430" cy="142" r="12" stroke="currentColor" strokeOpacity=".5" />
        <circle cx="430" cy="142" r="4" fill="currentColor" />
      </svg>
      <span className="network-map-label">
        <span className="gold-dot" /> NEPAL
      </span>
    </div>
  );
}

export function HomeTrustBar() {
  return (
    <section className="trust-strip" aria-label="Shopping with iPhoneBooking">
      <div className="container">
        {[
          {
            Icon: ReceiptText,
            title: 'Clear prices in NPR',
            note: 'See your quote before you reserve',
          },
          {
            Icon: PackageCheck,
            title: 'Every step connected',
            note: 'Follow orders from your account',
          },
          {
            Icon: ShieldCheck,
            title: 'Your device, its story',
            note: 'Ownership and service history',
          },
          { Icon: Headphones, title: 'Care close to home', note: 'Pickup, trade-in and repair' },
        ].map(({ Icon, title, note }) => (
          <div key={title}>
            <Icon size={22} strokeWidth={1.4} aria-hidden="true" />
            <span>
              <strong>{title}</strong>
              <small>{note}</small>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomeQuickActions() {
  return (
    <nav className="container home-quick-actions" aria-label="Start your Apple journey">
      {actions.map(({ Icon, title, note, to }, i) => (
        <Link to={to} key={to}>
          <div className="quick-action-head">
            <Icon size={24} strokeWidth={1.3} aria-hidden="true" />
            <span>0{i + 1}</span>
          </div>
          <strong>{title}</strong>
          <small>{note}</small>
          <ArrowUpRight className="quick-action-arrow" size={18} />
        </Link>
      ))}
    </nav>
  );
}

export function HomeCollection({
  data,
  copy: iphones,
  loading,
  failed,
}: DataProps & { loading: boolean; failed: boolean }) {
  const iphone = data?.iphones[0];
  return (
    <section className="container home-section" id="collection">
      <SectionHeading
        eyebrow="THE IPHONE COLLECTION"
        title={iphones.title}
        description={iphones.body}
        action={<ArrowLink to={iphones.href || '/iphone'}>Explore iPhone</ArrowLink>}
      />
      {loading ? (
        <Loading />
      ) : iphone ? (
        <>
          <QuickConfigure key={iphone.id} product={iphone} />
          {data && data.iphones.length > 1 && (
            <div className="product-grid additional-iphones">
              {data.iphones.slice(1).map((product) => (
                <ProductCard product={product} key={product.id} />
              ))}
            </div>
          )}
        </>
      ) : (
        !failed && (
          <div className="home-empty">
            <Smartphone size={26} aria-hidden="true" />
            <p>The iPhone collection is being updated. Explore available devices in the store.</p>
            <ArrowLink to="/store">Browse the store</ArrowLink>
          </div>
        )
      )}
    </section>
  );
}

export function HomeEcosystem({
  data,
  copy: ecosystem,
  loading,
}: DataProps & { loading: boolean }) {
  const featured = data?.products.filter((product) => product.featured).slice(0, 4) ?? [];
  return (
    <section className="ecosystem-section home-section">
      <div className="container">
        <SectionHeading
          eyebrow="THE APPLE ECOSYSTEM"
          title={ecosystem.title}
          description={ecosystem.body}
          action={<ArrowLink to={ecosystem.href || '/store'}>Shop all devices</ArrowLink>}
        />
        {loading ? (
          <Loading />
        ) : (
          <div className="category-grid">
            {data?.categories.map((category) => (
              <Link
                to={`/store?category=${encodeURIComponent(category.slug)}`}
                className="category-tile"
                key={category.id}
              >
                <ProductVisual image={category.image} name={category.name} />
                <span>
                  {category.name}
                  <ArrowUpRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        )}
        {!!featured.length && (
          <div className="product-grid ecosystem-products">
            {featured.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function HomeWhy({ copy: why }: { copy: HomeCopy }) {
  return (
    <section className="container home-section why-section">
      <SectionHeading eyebrow="WHY IPHONEBOOKING" title={why.title} description={why.body} />
      <div className="why-grid">
        {[
          {
            Icon: CircleCheck,
            title: 'A clearer choice.',
            body: 'Compare real configurations, prices and specifications before making your next move.',
          },
          {
            Icon: PackageCheck,
            title: 'Every step in sight.',
            body: 'Your orders, reservations and service updates stay connected in your account.',
          },
          {
            Icon: RefreshCw,
            title: 'Upgrade on your terms.',
            body: 'An estimate is only the beginning. You decide whether to accept the inspected trade-in offer.',
          },
          {
            Icon: ShieldCheck,
            title: 'Care, with context.',
            body: 'Device ownership, warranty records and repair history help you plan what comes next.',
          },
        ].map(({ Icon, title, body }) => (
          <article key={title}>
            <Icon size={25} strokeWidth={1.3} aria-hidden="true" />
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HomeCare({ tradein, repair }: { tradein?: HomeCopy; repair?: HomeCopy }) {
  return (
    <section className="container home-section home-service-grid" aria-label="Upgrade and care">
      {tradein && (
        <article className="home-service-panel tradein-panel">
          <div className="service-panel-top">
            <RefreshCw size={28} strokeWidth={1.3} aria-hidden="true" />
            <span className="eyebrow">A SECOND LIFE. A FRESH START.</span>
          </div>
          <h2>{tradein.title}</h2>
          <p>{tradein.body}</p>
          <ButtonLink to={tradein.href || '/trade-in'}>Get a trade-in estimate</ButtonLink>
          <div className="service-panel-bottom">
            <span>Estimate</span>
            <ArrowRight size={13} />
            <span>Inspect</span>
            <ArrowRight size={13} />
            <span>You decide</span>
          </div>
        </article>
      )}
      {repair && (
        <article className="home-service-panel">
          <div className="service-panel-top">
            <Wrench size={28} strokeWidth={1.3} aria-hidden="true" />
            <span className="eyebrow">GOOD THINGS ARE WORTH CARING FOR</span>
          </div>
          <h2>{repair.title}</h2>
          <p>{repair.body}</p>
          <ButtonLink to={repair.href || '/repair'} secondary>
            Book a repair
          </ButtonLink>
          <div className="service-panel-bottom">
            <CircleCheck size={14} />
            <span>Your quote. Your approval. Your peace of mind.</span>
          </div>
        </article>
      )}
    </section>
  );
}

export function HomeNetwork({ data, copy: network }: DataProps) {
  return (
    <section className="home-network home-section">
      <div className="container network-layout">
        <div className="network-copy">
          <span className="eyebrow">THE IPHONEBOOKING NETWORK</span>
          <h2>{network.title}</h2>
          <p>{network.body}</p>
          <div className="button-row">
            <ButtonLink to="/stores" secondary>
              Find a store
            </ButtonLink>
            <ArrowLink to={network.href || '/retailer-network'}>Become a partner</ArrowLink>
          </div>
          {!!data?.stores.length && (
            <div className="network-stores">
              {data.stores.slice(0, 2).map((store) => (
                <Link key={store.id} to={`/stores/${store.slug}`}>
                  <MapPin size={17} aria-hidden="true" />
                  <span>
                    <strong>{store.name}</strong>
                    <small>{store.address}</small>
                  </span>
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            </div>
          )}
        </div>
        <NetworkArt />
      </div>
    </section>
  );
}

export function HomeIntelligence({ data, copy: intelligence }: DataProps) {
  const lowest = data?.iphones
    .flatMap((product) =>
      product.variants
        .filter((variant) => variant.stock.some((stock) => stock.available > 0))
        .map((variant) => ({ product, variant })),
    )
    .sort((a, b) => a.variant.price - b.variant.price)[0];
  return (
    <section className="container home-section intelligence-layout">
      <div>
        <span className="eyebrow">A LITTLE MORE CLARITY</span>
        <h2>{intelligence.title}</h2>
        <p>{intelligence.body}</p>
        <ArrowLink to={intelligence.href || '/world-price-map'}>
          Explore price intelligence
        </ArrowLink>
      </div>
      <div className="intelligence-card">
        <div className="intelligence-card-top">
          <Globe2 size={20} strokeWidth={1.3} />
          <span>Price & availability</span>
          <span className="status">CATALOG</span>
        </div>
        {lowest ? (
          <>
            <div className="intelligence-product">
              <ProductVisual image={lowest.product.image} name={lowest.product.name} />
              <div>
                <span className="eyebrow">LOCAL CATALOG · NPR</span>
                <h3>{lowest.product.name}</h3>
                <p>
                  {lowest.variant.storage} · {lowest.variant.color}
                </p>
                <strong>{money(lowest.variant.price)}</strong>
                <span className="intelligence-stock">
                  <span className="availability-dot" />{' '}
                  {lowest.variant.preorder ? 'Available to pre-book' : 'In stock'}
                </span>
              </div>
            </div>
            <Link
              className="intelligence-view"
              to={`/products/${lowest.product.slug}?variant=${lowest.variant.id}`}
            >
              View this configuration
              <ArrowUpRight size={17} />
            </Link>
          </>
        ) : (
          <p className="intelligence-placeholder">
            Browse the catalog for current local configurations and pricing.
          </p>
        )}
        <div className="intelligence-note">
          {data?.marketSummary.sources
            ? `${data.marketSummary.sources} recent published observations across ${data.marketSummary.countries} markets. View the source and currency for every observation.`
            : 'International observations appear when researched sources are published. Local prices come directly from the catalog.'}
        </div>
      </div>
    </section>
  );
}

export function HomeJourney({ copy: journey }: { copy: HomeCopy }) {
  return (
    <section className="container home-section">
      <SectionHeading
        eyebrow="HOW IT WORKS"
        title={journey.title}
        description={journey.body || undefined}
      />
      <div className="journey-steps">
        {[
          [
            '01',
            'Find your fit.',
            'Explore the collection. Compare the details. Choose your configuration.',
            '/store',
            'Discover devices',
          ],
          [
            '02',
            'Make your move.',
            'Review your quote, choose pickup or delivery, and place your reservation.',
            '/prebook',
            'Explore pre-booking',
          ],
          [
            '03',
            'Stay connected.',
            'Track your order and keep your device history, upgrades and care in one account.',
            '/account',
            'Your account',
          ],
        ].map(([n, title, body, to, label]) => (
          <article key={n}>
            <span>{n}</span>
            <h3>{title}</h3>
            <p>{body}</p>
            <ArrowLink to={to}>{label}</ArrowLink>
          </article>
        ))}
      </div>
    </section>
  );
}

export function HomeReviews({ data, copy: reviews }: DataProps) {
  return (
    <section className="home-reviews home-section">
      <div className="container">
        <SectionHeading
          eyebrow="REAL PEOPLE. VERIFIED PURCHASES."
          title={reviews.title}
          description={reviews.body || undefined}
          action={
            data?.reviewSummary.average != null ? (
              <div className="review-summary">
                <Rating value={data.reviewSummary.average} />
                <span>
                  {data.reviewSummary.average.toFixed(1)} · {data.reviewSummary.total} verified
                  reviews
                </span>
              </div>
            ) : undefined
          }
        />
        {data?.reviews.length ? (
          <div className="review-grid">
            {data.reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <div className="home-review-invitation">
            <ShieldCheck size={30} strokeWidth={1.3} aria-hidden="true" />
            <div>
              <h3>Your story could be next.</h3>
              <p>
                Purchased a device? Share your experience after delivery. Our reviews come from
                verified customer orders.
              </p>
            </div>
            <ArrowLink to="/account/orders">View your orders</ArrowLink>
          </div>
        )}
      </div>
    </section>
  );
}

export function HomeJournal({ data, copy: news }: DataProps) {
  return (
    <section className="container home-section">
      <SectionHeading
        eyebrow="THE JOURNAL"
        title={news.title}
        description={news.body || undefined}
        action={<ArrowLink to={news.href || '/blog'}>Explore the journal</ArrowLink>}
      />
      {data?.articles.length ? (
        <div className="home-news-grid">
          {data.articles.map((article, i) => (
            <Link className="home-article" to={`/blog/${article.slug}`} key={article.slug}>
              <div className="article-art">
                <BookOpen size={42} strokeWidth={1} aria-hidden="true" />
                <span>THE JOURNAL / 0{i + 1}</span>
              </div>
              <div>
                <time dateTime={article.updatedAt}>{date(article.updatedAt)}</time>
                <h3>{article.title}</h3>
                <p>{article.description}</p>
                <span className="text-button">
                  Read story
                  <ArrowUpRight size={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="home-guide">
          <BookOpen size={27} strokeWidth={1.3} aria-hidden="true" />
          <div>
            <h3>A good place to start.</h3>
            <p>
              While our next stories are being prepared, explore buying, booking and care guides.
            </p>
          </div>
          <ArrowLink to="/support">Visit the help center</ArrowLink>
        </div>
      )}
    </section>
  );
}

export function HomeFinalCTA({ copy: final }: { copy: HomeCopy }) {
  return (
    <section className="home-final-cta">
      <div className="container">
        <Mountain size={30} strokeWidth={1} aria-hidden="true" />
        <span className="eyebrow">FROM THE HIMALAYAS. MADE FOR YOUR WORLD.</span>
        <h2>{final.title}</h2>
        <p>{final.body}</p>
        <div className="button-row">
          <ButtonLink to={final.href || '/store'}>Find your next device</ButtonLink>
          <ButtonLink to="/support" secondary>
            Let’s talk
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
