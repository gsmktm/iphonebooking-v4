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
import type { User } from '../services/types';
import { useShop } from '../store/shop';
import { Brand, Dialog, ErrorNotice } from './ui';
import { SearchDialog } from '../features/search/SearchDialog';
import { cn } from '../utils/cn';
import { InstallApp, MobileNavigation } from '../features/pwa/MobileApp';
import { AppearanceControl } from '../features/appearance/AppearanceControl';
import { RouteWayfinding } from './RouteWayfinding';
const links = [
  ['Shop', '/store'],
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
    [newsletter, setNewsletter] = useState(''),
    [subscribed, setSubscribed] = useState(false),
    [subscribing, setSubscribing] = useState(false),
    [newsletterError, setNewsletterError] = useState<unknown>();
  const location = useLocation();
  const home = location.pathname === '/';
  const { cart, compare, wishlist } = useShop();
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<User | null>('/auth/me'),
  });
  const accountSync = useCustomerSync(user);
  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => api<{ developmentData: boolean }>('/config'),
  });
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
    <div className={cn('storefront', home && 'luxe-home')}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="topbar">
        {home ? (
          <div className="topbar-links">
            <Link to="/track">Track order</Link>
            <Link to="/account/repairs">Repair status</Link>
            <Link to="/support">Support</Link>
          </div>
        ) : (
          <>
            <span>One destination. Your entire Apple world.</span>
            <Link to="/trade-in">
              Give your next upgrade a head start <ArrowUpRight size={12} />
            </Link>
          </>
        )}
        <div className="topbar-tools">
          <span className="topbar-country">NEPAL · NPR</span>
          <AppearanceControl />
        </div>
      </div>
      <header className="site-header">
        <div className="header-main container">
          <Brand diamond />
          <nav aria-label="Main navigation" className="desktop-nav">
            {links.map(([label, to]) => (
              <NavLink key={to} to={to}>
                {label}
              </NavLink>
            ))}
            <span className="nav-divider" />
            <NavLink to="/prebook">Pre-book</NavLink>
            <NavLink to="/trade-in">Trade In</NavLink>
            <NavLink to="/repair">Repair</NavLink>
            <NavLink to="/deals">Deals</NavLink>
            <NavLink to="/history/apple">History</NavLink>
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
            <Link to="/wishlist" className="icon-button account-nav" aria-label="Your wishlist">
              <Heart size={19} />
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
        <Dialog open={mobile} onClose={() => setMobile(false)} title="Explore iPhoneBooking">
          <nav className="mobile-nav mobile-nav-dialog" aria-label="Mobile navigation">
            {[
              ...links,
              ['Trade In', '/trade-in'],
              ['Repair', '/repair'],
              ['Pre-book', '/prebook'],
              ['Deals', '/deals'],
              ['Apple history', '/history/apple'],
              ['Wishlist', '/wishlist'],
              ['Retailer workspace', '/retailer'],
              ['Compare', '/compare'],
              ['Support', '/support'],
              ['My account', '/account'],
            ].map(([label, to]) => (
              <Link key={to} to={to} onClick={() => setMobile(false)}>
                {label}
                <ArrowUpRight size={16} />
              </Link>
            ))}
          </nav>
        </Dialog>
      </header>
      {accountSync.error && (
        <div className="container sync-notice" role="status">
          <p>{accountSync.error.message}</p>
          <div className="button-row">
            <button className="button secondary" onClick={accountSync.keepLocal}>
              Keep this device’s selection
            </button>
            <button className="text-button" onClick={accountSync.loadSaved}>
              Replace with saved selection
            </button>
          </div>
        </div>
      )}
      <main id="main">
        <RouteWayfinding />
        <Outlet />
      </main>
      {home && <InstallApp />}
      <section className="newsletter container">
        <div>
          <span className="eyebrow">ALWAYS ONE STEP AHEAD</span>
          <h2>Good things. In your inbox.</h2>
          <p>Be first in line for launches, offers, and a little inspiration.</p>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (subscribing) return;
            setSubscribing(true);
            setNewsletterError(undefined);
            try {
              await post('/subscribe', { email: newsletter, consent: true });
              setSubscribed(true);
            } catch (e) {
              setNewsletterError(e);
            } finally {
              setSubscribing(false);
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
                <button
                  disabled={subscribing}
                  aria-busy={subscribing}
                  aria-label={
                    subscribing ? 'Saving subscription' : 'Subscribe to launch notifications'
                  }
                >
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
            <Brand diamond />
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
                ['Apple history', '/history/apple'],
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
                ['Retailer network', '/retailer-network'],
                ['World prices', '/world-price-map'],
              ],
            },
            {
              title: 'Here for you',
              items: [
                ['Your account', '/account'],
                ['Track an order', '/track'],
                ['Help & support', '/support'],
                ['Warranty', '/policies/warranty'],
                ['Journal', '/blog'],
                ['IMEI format check', '/imei-check'],
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
            Development environment · Sample catalog, pricing, stock, and store details
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
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileNavigation />
    </div>
  );
}
