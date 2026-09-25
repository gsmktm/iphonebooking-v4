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
function PageMetadata() {
  const location = useLocation();
  useEffect(() => {
    const label = location.pathname.split('/').filter(Boolean).at(-1)?.replaceAll('-', ' ');
    document.title = label
      ? `${label.replace(/^./, (c) => c.toUpperCase())} — iPhoneBooking`
      : 'iPhoneBooking — Your Apple world. All connected.';
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
            <Route path="/admin/:resource" element={<Admin />} />
            <Route element={<Shell />}>
              <Route index element={<Home />} />
              <Route path="/prebook" element={<Catalog />} />
              <Route path="/wishlist" element={<Catalog />} />
              <Route path="/iphone" element={<IPhone />} />
              {['store', 'mac', 'ipad', 'watch', 'airpods', 'accessories'].map((category) => (
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
                  ['/imei-check', '/support'],
                  ['/repair-booking', '/repair'],
                ] as const
              ).map(([from, to]) => (
                <Route key={from} path={from} element={<Navigate to={to} replace />} />
              ))}
              <Route path="/products/:slug" element={<Product />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/confirmation" element={<Confirmation />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/track" element={<Tracking />} />
              <Route path="/trade-in" element={<TradeIn />} />
              <Route path="/exchange" element={<TradeIn />} />
              <Route path="/sell-device" element={<TradeIn />} />
              <Route path="/repair" element={<Repair />} />
              <Route path="/account" element={<Account />} />
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
