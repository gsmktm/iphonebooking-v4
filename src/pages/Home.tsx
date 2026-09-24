import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Wrench,
  MapPin,
  Smartphone,
  PackageCheck,
  Gem,
} from 'lucide-react';
import { api, money } from '../services/api';
import type { Product, Category, ContentPage } from '../services/types';
import { ProductCard } from '../components/ProductCard';
import {
  ArrowLink,
  ButtonLink,
  SectionHeading,
  ProductVisual,
  Loading,
  ErrorNotice,
  Empty,
} from '../components/ui';
import HomeHero from '../features/home/HomeHero';
import QuickConfigure from '../features/home/QuickConfigure';
import WhatsNew from '../features/releases/WhatsNew';
export default function Home() {
  const products = useQuery({
    queryKey: ['products', 'home'],
    queryFn: () => api<Product[]>('/products'),
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => api<Category[]>('/categories'),
  });
  const { data: content } = useQuery({
    queryKey: ['content', 'home'],
    queryFn: () => api<ContentPage>('/content/home'),
  });
  const hero = content?.blocks.find((b) => b.type === 'hero');
  const featured = products.data?.filter((p) => p.featured).slice(0, 4) ?? [];
  const configurable = featured.find((p) => p.category.slug === 'iphone' && p.variants.length);
  const value = products.data
    ?.filter((p) => p.category.slug === 'iphone')
    .flatMap((p) =>
      p.variants
        .filter((v) => v.stock.some((s) => s.available > 0))
        .map((v) => ({ product: p, variant: v })),
    )
    .sort((a, b) => a.variant.price - b.variant.price)[0];
  return (
    <div className="luxe-content">
      <HomeHero title={hero?.title} body={hero?.body} href={hero?.href} />
      <WhatsNew products={products.data} />
      <section className="container home-section">
        <div className="compact-heading">
          <h2 className="text-balance">Shop what you love.</h2>
          <ArrowLink to="/store">All categories</ArrowLink>
        </div>
        {categories.isLoading ? (
          <Loading />
        ) : categories.error ? (
          <ErrorNotice error={categories.error} />
        ) : (
          <div className="category-grid">
            {categories.data?.map((c) => (
              <Link to={`/${c.slug}`} className="category-tile" key={c.id}>
                <ProductVisual image={c.image} name={c.name} />
                <span>
                  {c.name}
                  <ArrowUpRight size={13} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className="container home-section products-section">
        <SectionHeading
          title="Your next favourite starts here."
          action={<ArrowLink to="/store">View all products</ArrowLink>}
        />
        {products.isLoading ? (
          <Loading />
        ) : products.error ? (
          <ErrorNotice error={products.error} retry={() => void products.refetch()} />
        ) : !featured.length ? (
          <Empty
            title="The collection is being updated."
            link="/store"
            action="Explore the store"
          />
        ) : (
          <div className="product-grid">
            {featured.map((p) => (
              <ProductCard product={p} key={p.id} />
            ))}
          </div>
        )}
      </section>
      {configurable && (
        <div className="container home-section">
          <QuickConfigure key={configurable.id} product={configurable} />
        </div>
      )}
      <section className="container home-section grid gap-4 lg:grid-cols-2">
        <article className="luxe-panel service-panel">
          <RefreshCw size={28} />
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <h2 className="text-balance">
            Your old device.
            <br />
            New possibilities.
          </h2>
          <p className="text-pretty">
            Get an estimate, review your inspection offer, and put your device toward your next
            upgrade.
          </p>
          <ButtonLink to="/trade-in">Check trade-in value</ButtonLink>
        </article>
        <article className="luxe-panel service-panel">
          <span className="eyebrow">A CLEARER CHOICE</span>
          <h2 className="text-balance">A good place to start.</h2>
          {value ? (
            <div className="value-product grid grid-cols-2 items-center gap-4">
              <ProductVisual image={value.product.image} name={value.product.name} />
              <div>
                <h3>{value.product.name}</h3>
                <p>
                  {value.variant.storage} · {value.variant.color}
                </p>
                <strong className="value-price tabular-nums">{money(value.variant.price)}</strong>
                <ArrowLink to={`/products/${value.product.slug}`}>View configuration</ArrowLink>
              </div>
            </div>
          ) : (
            <>
              <p>Compare configurations and current availability.</p>
              <ButtonLink to="/compare">Compare devices</ButtonLink>
            </>
          )}
        </article>
      </section>
      <section className="container home-section grid gap-4 md:grid-cols-2">
        {[
          {
            Icon: Wrench,
            title: 'Expert care. More life.',
            body: 'Book a repair, approve your quote, and follow every service update.',
            to: '/repair',
            cta: 'Book a repair',
          },
          {
            Icon: ShieldCheck,
            title: 'Your device. Its whole story.',
            body: 'Purchases, masked serials, warranty and service history, together in My Devices.',
            to: '/account/devices',
            cta: 'Open My Devices',
          },
        ].map(({ Icon, title, body, to, cta }) => (
          <article className="luxe-panel service-panel compact-service" key={to}>
            <Icon size={30} />
            <h2 className="text-balance">{title}</h2>
            <p className="text-pretty">{body}</p>
            <ArrowLink to={to}>{cta}</ArrowLink>
          </article>
        ))}
      </section>
      <section className="container home-section">
        <SectionHeading title="One account. Your entire Apple world." />
        <div className="ecosystem-links grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { Icon: Gem, label: 'Discover', note: 'Find your next device', to: '/store' },
            { Icon: RefreshCw, label: 'Upgrade', note: 'Explore trade-in', to: '/trade-in' },
            { Icon: Wrench, label: 'Care', note: 'Track your repair', to: '/account/repairs' },
            { Icon: PackageCheck, label: 'Track', note: 'Follow your order', to: '/track' },
            { Icon: Smartphone, label: 'Own', note: 'Manage your devices', to: '/account/devices' },
          ].map(({ Icon, label, note, to }) => (
            <Link className="luxe-panel" key={label} to={to}>
              <Icon size={25} />
              <strong>{label}</strong>
              <small>{note}</small>
            </Link>
          ))}
        </div>
      </section>
      <section className="himalayan-story">
        <div className="container story-content">
          <span className="eyebrow">FROM 8848. FOR NEPAL.</span>
          <h2 className="text-balance">
            Same roots.
            <br />
            Higher possibilities.
          </h2>
          <p>Technology moves forward. Connection stays.</p>
          <ArrowLink to="/stores" light>
            Find your nearest store
          </ArrowLink>
        </div>
      </section>
      <section className="container home-section grid gap-4 md:grid-cols-2">
        <article className="luxe-panel service-panel">
          <MapPin size={28} />
          <h2 className="text-balance">
            Online convenience.
            <br />
            Local connection.
          </h2>
          <p>Explore store locations, opening hours, pickup and available services.</p>
          <ButtonLink to="/stores">Find a store</ButtonLink>
        </article>
        <article className="luxe-panel service-panel">
          <h2 className="text-balance">
            A little guidance.
            <br />A better decision.
          </h2>
          <div className="guide-links">
            {[
              ['Buying & booking', '/support'],
              ['Compare your options', '/compare'],
              ['Warranty & care', '/policies/warranty'],
            ].map(([label, to]) => (
              <ArrowLink key={to} to={to}>
                {label}
              </ArrowLink>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
