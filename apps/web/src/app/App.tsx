import { lazy, Suspense, useEffect, Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Shell } from '../components/Shell';
import { Loading } from '../components/ui';
import Home from '../pages/Home';
const Passport = lazy(() => import('../pages/account/Passport'));
const Catalog = lazy(() => import('../pages/Catalog'));
const IPhone = lazy(() => import('../pages/IPhone'));
const Category = lazy(() => import('../pages/Category'));
const Product = lazy(() => import('../pages/Product'));
const Account = lazy(() => import('../pages/Account'));
const Admin = lazy(() => import('../pages/Admin'));
const Confirmation = lazy(() => import('../pages/Confirmation'));
const Cart = lazy(() => import('../pages/Commerce').then((m) => ({ default: m.Cart })));
const Checkout = lazy(() => import('../pages/Commerce').then((m) => ({ default: m.Checkout })));
const Compare = lazy(() => import('../pages/Commerce').then((m) => ({ default: m.Compare })));
const Tracking = lazy(() => import('../pages/Commerce').then((m) => ({ default: m.Tracking })));
const TradeIn = lazy(() => import('../pages/Services').then((m) => ({ default: m.TradeInPage })));
const Repair = lazy(() => import('../pages/Services').then((m) => ({ default: m.RepairPage })));
const Support = lazy(() => import('../pages/Information').then((m) => ({ default: m.Support })));
const Content = lazy(() => import('../pages/Information').then((m) => ({ default: m.Content })));
const Stores = lazy(() => import('../pages/Information').then((m) => ({ default: m.Stores })));
const NotFound = lazy(() => import('../pages/Information').then((m) => ({ default: m.NotFound })));

const SignIn = lazy(() => import('../pages/Account').then((m) => ({ default: m.SignIn })));
const ForgotPassword = lazy(() =>
  import('../pages/account/AuthRecovery').then((m) => ({ default: m.ForgotPassword })),
);
const ResetPassword = lazy(() =>
  import('../pages/account/AuthRecovery').then((m) => ({ default: m.ResetPassword })),
);
const VerifyEmail = lazy(() =>
  import('../pages/account/AuthRecovery').then((m) => ({ default: m.VerifyEmail })),
);
const RetailerNetwork = lazy(() =>
  import('../pages/Retailer').then((m) => ({ default: m.RetailerNetwork })),
);
const RetailerWorkspace = lazy(() =>
  import('../pages/Retailer').then((m) => ({ default: m.RetailerWorkspace })),
);
const WorldPriceMap = lazy(() =>
  import('../pages/Intelligence').then((m) => ({ default: m.WorldPriceMap })),
);
const ImeiCheck = lazy(() =>
  import('../pages/Intelligence').then((m) => ({ default: m.ImeiCheck })),
);
const Blog = lazy(() => import('../pages/Information').then((m) => ({ default: m.Blog })));
const BlogArticle = lazy(() =>
  import('../pages/Information').then((m) => ({ default: m.BlogArticle })),
);
const CompanyPage = lazy(() =>
  import('../pages/Information').then((m) => ({ default: m.CompanyPage })),
);
const RepairTracking = lazy(() => import('../pages/RepairTracking'));
const PaymentFailure = lazy(() => import('../pages/PaymentFailure'));

function PageMetadata() {
  const location = useLocation();
  useEffect(() => {
    const label = location.pathname.split('/').filter(Boolean).at(-1)?.replaceAll('-', ' ');
    document.title = label
      ? `${label.replace(/^./, (c) => c.toUpperCase())} — iPhoneBooking`
      : 'iPhoneBooking — Book the Future.';
  }, [location.pathname]);
  return null;
}
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="container page">
        <h1>Let’s get you back on track.</h1>
        <p>This page couldn’t finish loading. Your bag is saved.</p>
        <button className="button" onClick={() => window.location.reload()}>
          Reload this page
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <PageMetadata />
        <Suspense
          fallback={
            <div className="container page">
              <Loading />
            </div>
          }
        >
          <Routes>
            <Route path="/admin" element={<Admin />} />
            {(
              [
                ['dashboard', '/admin'],
                ['preorders', '/admin/bookings'],
                ['cms', '/admin/content'],
                ['news', '/admin/content'],
                ['imei', '/admin/units'],
                ['audit', '/admin/audit-logs'],
                ['shipments', '/admin/orders'],
              ] as const
            ).map(([from, to]) => (
              <Route key={from} path={`/admin/${from}`} element={<Navigate replace to={to} />} />
            ))}
            <Route path="/admin/:resource" element={<Admin />} />
            <Route element={<Shell />}>
              <Route index element={<Home />} />
              <Route path="/store" element={<Catalog />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/search" element={<Catalog />} />
              <Route path="/deals" element={<Catalog />} />
              <Route path="/prebook" element={<Catalog />} />
              <Route path="/wishlist" element={<Catalog />} />
              <Route path="/iphone" element={<IPhone />} />
              {['mac', 'ipad', 'watch', 'airpods', 'accessories'].map((category) => (
                <Route key={category} path={`/${category}`} element={<Category />} />
              ))}
              {['vision', 'home'].map((category) => (
                <Route key={category} path={`/${category}`} element={<Catalog />} />
              ))}
              {(
                [
                  ['/iphone-18', '/iphone'],
                  ['/pre-order', '/prebook'],
                  ['/compare-iphones', '/compare'],
                  ['/emi-options', '/support'],
                  ['/track-order', '/track'],
                  ['/repair-booking', '/repair'],
                ] as const
              ).map(([from, to]) => (
                <Route key={from} path={from} element={<Navigate to={to} replace />} />
              ))}
              <Route path="/products/:slug" element={<Product />} />
              <Route path="/iphone/:slug" element={<Product />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/confirmation" element={<Confirmation />} />
              <Route path="/checkout/success" element={<Confirmation />} />
              <Route path="/checkout/failure" element={<PaymentFailure />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/track" element={<Tracking />} />
              <Route path="/trade-in" element={<TradeIn />} />
              <Route path="/exchange" element={<TradeIn />} />
              <Route path="/sell-device" element={<TradeIn />} />
              <Route path="/repair" element={<Repair />} />
              <Route path="/repair/:ticketId" element={<RepairTracking />} />
              <Route path="/login" element={<SignIn key="login" />} />
              <Route path="/register" element={<SignIn key="register" />} />
              {['/forgot-password', '/account/forgot-password'].map((path) => (
                <Route key={path} path={path} element={<ForgotPassword />} />
              ))}
              {['/reset-password', '/account/reset-password'].map((path) => (
                <Route key={path} path={path} element={<ResetPassword />} />
              ))}
              {['/verify-email', '/account/verify-email'].map((path) => (
                <Route key={path} path={path} element={<VerifyEmail />} />
              ))}
              <Route path="/retailer-network" element={<RetailerNetwork />} />
              <Route path="/retailer" element={<RetailerWorkspace />} />
              <Route path="/world-price-map" element={<WorldPriceMap />} />
              <Route path="/imei-check" element={<ImeiCheck />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogArticle />} />
              <Route path="/news" element={<Blog />} />
              <Route path="/news/:slug" element={<BlogArticle />} />
              <Route path="/about" element={<CompanyPage slug="about-us" />} />
              {[
                'about-us',
                'contact-us',
                'careers',
                'press-room',
                'history',
                'cookies',
                'accessibility',
              ].map((slug) => (
                <Route key={slug} path={`/${slug}`} element={<CompanyPage slug={slug} />} />
              ))}
              {[
                'profile',
                'orders',
                'repairs',
                'trade-ins',
                'addresses',
                'notifications',
                'security',
              ].map((section) => (
                <Route
                  key={section}
                  path={`/${section}`}
                  element={<Navigate replace to={`/account/${section}`} />}
                />
              ))}
              <Route path="/dashboard" element={<Navigate replace to="/account" />} />
              <Route path="/preorders" element={<Navigate replace to="/account/orders" />} />
              <Route path="/privacy" element={<Navigate replace to="/policies/privacy" />} />
              <Route path="/terms" element={<Navigate replace to="/policies/terms" />} />
              <Route path="/returns" element={<Navigate replace to="/policies/returns" />} />
              <Route path="/refund-policy" element={<Navigate replace to="/policies/returns" />} />
              <Route path="/warranty" element={<Navigate replace to="/policies/warranty" />} />
              <Route
                path="/shipping"
                element={<Navigate replace to="/support/support-delivery" />}
              />
              <Route path="/warranty-info" element={<Navigate replace to="/policies/warranty" />} />
              <Route path="/faq" element={<Support />} />
              <Route path="/account" element={<Account />} />
              <Route
                path="/account/preorders"
                element={<Navigate replace to="/account/orders" />}
              />
              <Route path="/account/wishlist" element={<Navigate replace to="/wishlist" />} />
              <Route path="/account/devices/:id" element={<Passport />} />
              <Route path="/account/:section" element={<Account />} />
              <Route path="/support" element={<Support />} />
              <Route path="/support/:slug" element={<Content />} />
              <Route path="/policies/:slug" element={<Content />} />
              <Route path="/campaign/:slug" element={<Content />} />
              <Route path="/stores" element={<Stores />} />
              <Route path="/stores/:slug" element={<Stores />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
