import { ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Lightweight, route-aware orientation for the entire storefront.
 * This complements page-specific intros; it deliberately has no heading.
 */
const routeLabels: Record<string, string> = {
  store: 'All products',
  catalog: 'Catalog',
  search: 'Search',
  deals: 'Deals',
  prebook: 'Pre-book',
  wishlist: 'Wishlist',
  iphone: 'iPhone',
  mac: 'Mac',
  ipad: 'iPad',
  watch: 'Watch',
  airpods: 'AirPods',
  accessories: 'Accessories',
  products: 'Product',
  compare: 'Compare devices',
  cart: 'Your bag',
  checkout: 'Checkout',
  confirmation: 'Order confirmation',
  'trade-in': 'Trade in',
  exchange: 'Exchange',
  'sell-device': 'Sell device',
  repair: 'Repair',
  track: 'Track order',
  'imei-check': 'IMEI format check',
  'world-price-map': 'World price map',
  account: 'Your account',
  login: 'Sign in',
  register: 'Create account',
  'forgot-password': 'Password help',
  'reset-password': 'Reset password',
  'verify-email': 'Verify email',
  support: 'Support',
  policies: 'Policies',
  stores: 'Stores',
  blog: 'Journal',
  news: 'News',
  retailer: 'Retailer workspace',
  'retailer-network': 'Retailer network',
};

type RelatedLink = { label: string; to: string };
type RouteFamily = { label: string; to: string; related: RelatedLink[] };

const shop: RouteFamily = {
  label: 'Shop',
  to: '/store',
  related: [
    { label: 'Pre-book', to: '/prebook' },
    { label: 'Compare', to: '/compare' },
    { label: 'Your bag', to: '/cart' },
  ],
};
const care: RouteFamily = {
  label: 'Device care',
  to: '/trade-in',
  related: [
    { label: 'Trade in', to: '/trade-in' },
    { label: 'Repair', to: '/repair' },
    { label: 'Track order', to: '/track' },
  ],
};
const account: RouteFamily = {
  label: 'Account',
  to: '/account',
  related: [
    { label: 'Orders', to: '/account/orders' },
    { label: 'Repairs', to: '/account/repairs' },
    { label: 'Your devices', to: '/account/devices' },
  ],
};
const discover: RouteFamily = {
  label: 'Explore',
  to: '/support',
  related: [
    { label: 'Support', to: '/support' },
    { label: 'Stores', to: '/stores' },
    { label: 'Journal', to: '/blog' },
  ],
};
const retailer: RouteFamily = {
  label: 'Retailer network',
  to: '/retailer-network',
  related: [
    { label: 'Network', to: '/retailer-network' },
    { label: 'Workspace', to: '/retailer' },
    { label: 'Support', to: '/support' },
  ],
};

function getFamily(path: string): RouteFamily {
  if (/^\/(trade-in|exchange|sell-device|repair|track|imei-check|world-price-map)(\/|$)/.test(path)) return care;
  if (/^\/(account|login|register|forgot-password|reset-password|verify-email|dashboard)(\/|$)/.test(path)) return account;
  if (/^\/retailer(-network)?(\/|$)/.test(path)) return retailer;
  if (/^\/(store|catalog|search|deals|prebook|wishlist|iphone|mac|ipad|watch|airpods|accessories|vision|home|products|cart|checkout|confirmation|compare)(\/|$)/.test(path)) return shop;
  return discover;
}

function getCurrentLabel(path: string) {
  const segments = path.split('/').filter(Boolean);
  const first = segments[0] ?? '';
  if (segments.length > 1 && first === 'account') {
    if (segments[1] === 'devices') return 'Device passport';
    const section = segments[1];
    return routeLabels[section] ?? section.replaceAll('-', ' ');
  }
  if (segments.length > 1 && first === 'repair') return 'Repair tracking';
  if (segments.length > 1 && (first === 'products' || first === 'iphone')) {
    return segments[1].replaceAll('-', ' ');
  }
  if (segments.length > 1 && first === 'checkout') return 'Payment result';
  if (segments.length > 1 && first === 'policies') return segments[1].replaceAll('-', ' ');
  if (segments.length > 1 && first === 'blog') return 'Journal article';
  if (segments.length > 1 && first === 'news') return 'News article';
  return routeLabels[first] ?? first.replaceAll('-', ' ');
}

export function RouteWayfinding() {
  const { pathname } = useLocation();
  if (pathname === '/') return null;
  const family = getFamily(pathname);
  const title = getCurrentLabel(pathname);
  const related = family.related.filter((link) => link.to !== pathname);
  return (
    <nav className="page-wayfinding container" aria-label="Page location and related links">
      <div className="wayfinding-trail">
        <Link to="/">Home</Link>
        <ChevronRight aria-hidden="true" size={13} />
        {family.to !== pathname && (
          <>
            <Link to={family.to}>{family.label}</Link>
            <ChevronRight aria-hidden="true" size={13} />
          </>
        )}
        <span aria-current="page">{title}</span>
      </div>
      <div className="wayfinding-actions">
        {related.map((link) => (
          <Link key={link.to} to={link.to}>
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
