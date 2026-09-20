import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Search,
  ShoppingBag,
  UserRound,
  Menu,
  ArrowUpRight,
  X,
  Heart,
  SlidersHorizontal,
  MapPin,
  ArrowRight,
  Mountain,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCustomerSync } from '../app/useCustomerSync';
import { api, post } from '../services/api';
import type { Product, User } from '../services/types';
import { useShop } from '../store/shop';
import { Brand, Dialog, ProductVisual, ErrorNotice } from './ui';
const links = [
  ['Store', '/store'],
  ['iPhone', '/iphone'],
  ['Mac', '/mac'],
  ['iPad', '/ipad'],
  ['Watch', '/watch'],
  ['AirPods', '/airpods'],
  ['Accessories', '/accessories'],
];
export function Shell() {
  const [searchOpen, setSearchOpen] = useState(false),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState(''),
    [search, setSearch] = useState(''),
    [newsletter, setNewsletter] = useState(''),
    [subscribed, setSubscribed] = useState(false),
    [newsletterError, setNewsletterError] = useState<unknown>();
  const location = useLocation();
  const { cart, compare, wishlist } = useShop();
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<User | null>('/auth/me'),
  });
  useCustomerSync(user);
  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => api<{ developmentData: boolean }>('/config'),
  });
  const { data: results, error } = useQuery({
    queryKey: ['search', search],
    queryFn: () => api<Product[]>(`/products?q=${encodeURIComponent(search)}`),
    enabled: searchOpen,
  });
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), 180);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    setMobile(false);
    setSearchOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((s) => !s);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="topbar">
        <span>One destination. Your entire Apple world.</span>
        <Link to="/trade-in">
          Give your next upgrade a head start <ArrowUpRight size={12} />
        </Link>
        <span className="topbar-country">NEPAL · NPR</span>
      </div>
      <header className="site-header">
        <div className="header-main container">
          <Brand />
          <nav aria-label="Main navigation" className="desktop-nav">
            {links.map(([label, to]) => (
              <NavLink key={to} to={to}>
                {label}
              </NavLink>
            ))}
            <span className="nav-divider" />
            <NavLink to="/trade-in">Trade In</NavLink>
            <NavLink to="/repair">Repair</NavLink>
          </nav>
          <div className="header-utilities">
            <button
              className="icon-button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search products"
            >
              <Search size={19} />
            </button>
            <Link to="/account" className="icon-button account-nav" aria-label="Your account">
              <UserRound size={19} />
            </Link>
            <Link
              to="/cart"
              className="icon-button bag-icon"
              aria-label={`Shopping bag, ${cart.reduce((s, i) => s + i.quantity, 0)} items`}
            >
              <ShoppingBag size={19} />
              {cart.length > 0 && (
                <span className="count">{cart.reduce((s, i) => s + i.quantity, 0)}</span>
              )}
            </Link>
            <button
              className="icon-button mobile-menu-button"
              onClick={() => setMobile(!mobile)}
              aria-label="Toggle navigation"
              aria-expanded={mobile}
            >
              {mobile ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {mobile && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {[
              ...links,
              ['Trade In', '/trade-in'],
              ['Repair', '/repair'],
              ['Compare', '/compare'],
              ['Support', '/support'],
              ['My account', '/account'],
            ].map(([label, to]) => (
              <Link key={to} to={to}>
                {label}
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main id="main">
        <Outlet />
      </main>
      <section className="newsletter container">
        <div>
          <span className="eyebrow">ALWAYS ONE STEP AHEAD</span>
          <h2>Good things. In your inbox.</h2>
          <p>Be first in line for launches, offers, and a little inspiration.</p>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await post('/subscribe', { email: newsletter, consent: true });
              setSubscribed(true);
            } catch (e) {
              setNewsletterError(e);
            }
          }}
        >
          {subscribed ? (
            <p role="status">You’re on the list. Your preference has been saved.</p>
          ) : (
            <>
              <label className="sr-only" htmlFor="newsletter">
                Email address
              </label>
              <div className="newsletter-input">
                <input
                  id="newsletter"
                  type="email"
                  required
                  placeholder="Your email address"
                  value={newsletter}
                  onChange={(e) => setNewsletter(e.target.value)}
                />
                <button aria-label="Subscribe to launch notifications">
                  <ArrowRight size={20} />
                </button>
              </div>
              <small>
                By subscribing, you agree to our <Link to="/policies/privacy">Privacy Policy</Link>.
                Your preferences, respected.
              </small>
            </>
          )}
          {!!newsletterError && <ErrorNotice error={newsletterError} />}
        </form>
      </section>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <Brand />
            <p>
              Technology from the Himalayas.
              <br />
              Made for your world.
            </p>
            <span className="footer-nepal">
              <Mountain size={17} /> 27.7172° N, 85.3240° E
            </span>
          </div>
          {[
            {
              title: 'Explore',
              items: [
                ['iPhone', '/iphone'],
                ['Mac', '/mac'],
                ['iPad', '/ipad'],
                ['Watch & AirPods', '/watch'],
                ['Accessories', '/accessories'],
              ],
            },
            {
              title: 'A little more',
              items: [
                ['Trade in & upgrade', '/trade-in'],
                ['Book a repair', '/repair'],
                ['Pre-booking', '/prebook'],
                ['Compare devices', '/compare'],
                ['Find a store', '/stores'],
              ],
            },
            {
              title: 'Here for you',
              items: [
                ['Your account', '/account'],
                ['Track an order', '/track'],
                ['Help & support', '/support'],
                ['Warranty', '/policies/warranty'],
                ['Returns & refunds', '/policies/returns'],
              ],
            },
          ].map((group) => (
            <div key={group.title}>
              <h3>{group.title}</h3>
              {group.items.map(([label, to]) => (
                <Link key={label} to={to}>
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} iPhoneBooking. From the Himalayas.</span>
          <div>
            <Link to="/policies/privacy">Privacy</Link>
            <Link to="/policies/terms">Terms</Link>
            <Link to="/admin">Administration</Link>
          </div>
          <span>
            NEPAL <span className="red-dot" /> ENGLISH
          </span>
        </div>
        {config?.developmentData && (
          <div className="dev-notice">
            Development environment · Sample catalog, pricing, stock, and store details · Online
            payments are not enabled
          </div>
        )}
      </footer>
      {compare.length > 0 && (
        <Link className="compare-floating" to="/compare">
          <SlidersHorizontal size={16} />
          Compare {compare.length}
          <ArrowRight size={16} />
        </Link>
      )}
      <Dialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="Find your next great thing"
      >
        <div className="search-input">
          <Search size={22} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search devices, models, or SKU…"
            aria-label="Search catalog"
          />
          <kbd>⌘ K</kbd>
        </div>
        <div className="search-results">
          {error ? (
            <ErrorNotice error={error} />
          ) : (
            results?.slice(0, 6).map((p) => (
              <Link to={`/products/${p.slug}`} key={p.id}>
                <ProductVisual image={p.image} name={p.name} />
                <div>
                  <strong>{p.name}</strong>
                  <p>{p.tagline}</p>
                </div>
                <ArrowUpRight size={18} />
              </Link>
            ))
          )}
          {results?.length === 0 && <p>No devices match. Try “iPhone”, “Mac”, or a model name.</p>}
        </div>
        <div className="search-shortcuts">
          <Link to="/compare">Compare devices {compare.length > 0 && `(${compare.length})`}</Link>
          <Link to="/wishlist">
            <Heart size={14} />
            Wishlist ({wishlist.length})
          </Link>
          <Link to="/support">Support</Link>
          <Link to="/stores">
            <MapPin size={14} />
            Stores
          </Link>
        </div>
        {user && <p className="muted">Welcome back, {user.name.split(' ')[0]}.</p>}
      </Dialog>
    </>
  );
}
