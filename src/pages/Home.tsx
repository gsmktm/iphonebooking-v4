import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Truck,
  Headphones,
  RefreshCw,
  MoveUpRight,
  Wrench,
  Mountain,
  Check,
} from 'lucide-react';
import { api } from '../services/api';
import type { Product, Category, ContentPage } from '../services/types';
import { ProductCard } from '../components/ProductCard';
import {
  ArrowLink,
  ButtonLink,
  SectionHeading,
  ProductVisual,
  Loading,
  ErrorNotice,
} from '../components/ui';
import { t } from '../app/i18n';
export default function Home() {
  const products = useQuery({
    queryKey: ['products', 'home'],
    queryFn: () => api<Product[]>('/products'),
  });
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });
  const { data: content } = useQuery({
    queryKey: ['content', 'home'],
    queryFn: () => api<ContentPage>('/content/home'),
  });
  const hero = content?.blocks.find((b) => b.type === 'hero');
  return (
    <>
      <section className="hero">
        <img
          src="/images/hero.webp"
          className="hero-image"
          alt="Desert titanium smartphones photographed in soft studio light"
          fetchPriority="high"
          width="1536"
          height="1024"
        />
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="red-dot" /> A NEW PERSPECTIVE
            </span>
            <h1>{hero?.title ?? t('heroTitle')}</h1>
            <p>{hero?.body ?? t('heroText')}</p>
            <div className="hero-actions">
              <ButtonLink to={hero?.href ?? '/iphone'}>{t('heroCta')}</ButtonLink>
              <ArrowLink to="/compare">Find your perfect match</ArrowLink>
            </div>
            <div className="hero-note">
              <span className="small-line" /> PRO IN EVERY WAY. YOURS IN EVERY DETAIL.
            </div>
          </div>
          <div className="hero-bottom">
            <span>DESIGNED FOR POSSIBILITY.</span>
            <span>
              <span className="slide-line" /> A CLOSER LOOK
            </span>
            <Link to="/store">
              Explore the collection <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
      <div className="trust-strip">
        <div className="container">
          {[
            [ShieldCheck, 'Genuine products', 'Confidence, included.'],
            [Truck, 'Across Nepal', 'Closer than you think.'],
            [RefreshCw, 'Easy upgrades', 'More from your old device.'],
            [Headphones, 'Real people. Real care.', 'Here, when you need us.'],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <div key={String(title)}>
                <I size={22} strokeWidth={1.3} />
                <span>
                  <strong>{String(title)}</strong>
                  <small>{String(body)}</small>
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <section className="container ecosystem-section">
        <div className="compact-heading">
          <h2>A world of possibilities.</h2>
          <ArrowLink to="/store">Shop all products</ArrowLink>
        </div>
        <div className="category-grid">
          {categories?.map((c) => (
            <Link to={`/${c.slug}`} className="category-tile" key={c.id}>
              <ProductVisual image={c.image} name={c.name} />
              <span>
                {c.name}
                <ArrowUpRight size={13} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="container section products-section">
        <SectionHeading
          eyebrow="GOOD THINGS START HERE"
          title={t('collectionTitle')}
          description={t('collectionText')}
          action={<ArrowLink to="/store">Explore the collection</ArrowLink>}
        />
        {products.isLoading ? (
          <Loading />
        ) : products.error ? (
          <ErrorNotice error={products.error} retry={() => void products.refetch()} />
        ) : (
          <div className="product-grid">
            {products.data
              ?.filter((p) => p.featured)
              .slice(0, 4)
              .map((p) => (
                <ProductCard product={p} key={p.id} />
              ))}
          </div>
        )}
      </section>
      <section className="container services-grid">
        <article className="trade-promo">
          <span className="eyebrow">
            <RefreshCw size={15} /> THE NEXT CHAPTER
          </span>
          <h2>
            Goodbye, old.
            <br />
            Hello, possibilities.
          </h2>
          <p>
            Your current device could be the start
            <br />
            of something new. Trade in. Step up.
          </p>
          <ButtonLink to="/trade-in">Discover your trade-in value</ButtonLink>
          <div className="trade-art">
            <ProductVisual image="phone" name="Devices ready for their next chapter" />
            <span>
              <RefreshCw size={27} strokeWidth={1.2} />
            </span>
          </div>
          <small>Better for your pocket. Better for the planet.</small>
        </article>
        <article className="repair-promo">
          <span className="eyebrow">
            <Wrench size={15} /> CARE THAT GOES FURTHER
          </span>
          <h2>
            Back to doing
            <br />
            what you love.
          </h2>
          <p>
            A little care. A lot more life.
            <br />
            Expert help for the devices you rely on.
          </p>
          <ArrowLink to="/repair">Let’s get it fixed</ArrowLink>
          <div className="repair-art">
            <Wrench size={120} strokeWidth={0.7} />
            <div className="repair-check">
              <Check size={22} />
            </div>
          </div>
          <div className="repair-promo-tags">
            <span>Clear quotes</span>
            <span>Careful diagnostics</span>
            <span>Personal support</span>
          </div>
        </article>
      </section>
      <section className="container section why-section">
        <SectionHeading
          eyebrow="THE IPHONEBOOKING DIFFERENCE"
          title="More than a purchase. A connection."
          description="From your first unboxing to your next upgrade. We’re with you."
        />
        <div className="why-grid">
          {[
            [
              ShieldCheck,
              'Peace of mind. Built in.',
              'Clear product details, transparent pricing, and warranty information that makes sense.',
            ],
            [
              RefreshCw,
              'Your devices. Connected.',
              'Orders, warranty, repairs, and upgrades. One account that grows with you.',
            ],
            [
              Mountain,
              'Global thinking. Local heart.',
              'An Apple ecosystem experience, thoughtfully built for life in Nepal.',
            ],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof Mountain;
            return (
              <article key={String(title)}>
                <I size={28} strokeWidth={1.2} />
                <h3>{String(title)}</h3>
                <p>{String(body)}</p>
              </article>
            );
          })}
        </div>
      </section>
      <section className="himalayan-story">
        <div className="mountain-lines" aria-hidden="true">
          <svg viewBox="0 0 1400 450" preserveAspectRatio="none">
            <path d="M0 450 180 290 260 330 480 120 630 280 870 35 1060 280 1190 195 1400 450Z" />
            <path d="m480 120-22 98 64-35 45 93m303-241-40 141 64-60 55 94 40-32" />
          </svg>
        </div>
        <div className="container story-content">
          <span className="eyebrow">ROOTED HERE. REACHING EVERYWHERE.</span>
          <h2>
            From the Himalayas.
            <br />
            For your world.
          </h2>
          <p>
            A higher standard of technology.
            <br />A more human way to experience it.
          </p>
          <ArrowLink to="/stores" light>
            Meet iPhoneBooking
          </ArrowLink>
          <span className="altitude">
            8848 <small>METERS OF INSPIRATION</small>
          </span>
        </div>
      </section>
    </>
  );
}
