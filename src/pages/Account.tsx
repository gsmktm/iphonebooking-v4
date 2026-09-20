import { useState } from 'react';
import { Link, NavLink, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  LogOut,
  Package,
  Smartphone,
  Wrench,
  RefreshCw,
  UserRound,
  ShieldCheck,
} from 'lucide-react';
import { api, post } from '../services/api';
import type { User, Notification } from '../services/types';
import { PageIntro, ErrorNotice, Loading, ButtonLink } from '../components/ui';
import {
  AccountOrders,
  AccountDevices,
  AccountRepairs,
  AccountTradeIns,
} from './account/Lifecycle';
import {
  AccountNotifications,
  AccountTickets,
  AccountSecurity,
  AccountAddresses,
  AccountProfile,
} from './account/Settings';
export function SignIn({ admin = false }: { admin?: boolean }) {
  const [register, setRegister] = useState(false),
    [error, setError] = useState<Error | null>(null),
    [busy, setBusy] = useState(false);
  const [params] = useSearchParams();
  const qc = useQueryClient(),
    navigate = useNavigate();
  return (
    <div className="container page auth-page">
      <div className="auth-story">
        <span className="eyebrow">YOUR APPLE WORLD. ALL CONNECTED.</span>
        <h1>
          A little more
          <br />
          you.
        </h1>
        <p>
          Your devices, orders, upgrades, and expert care.
          <br />
          Together in one place.
        </p>
        <div className="auth-features">
          <span>
            <Smartphone />
            Your devices
          </span>
          <span>
            <Package />
            Your orders
          </span>
          <span>
            <Wrench />
            Expert care
          </span>
        </div>
      </div>
      <form
        className="form-panel"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          setBusy(true);
          setError(null);
          try {
            const user = await post<User>(`/auth/${register ? 'register' : 'login'}`, {
              email: data.get('email'),
              password: data.get('password'),
              ...(register ? { name: data.get('name') } : {}),
            });
            qc.setQueryData(['me'], user);
            await qc.invalidateQueries({ queryKey: ['account'] });
            const redirect = params.get('redirect');
            if (redirect?.startsWith('/') && !redirect.startsWith('//')) navigate(redirect);
          } catch (e) {
            setError(e as Error);
          } finally {
            setBusy(false);
          }
        }}
      >
        <span className="eyebrow">{admin ? 'OPERATIONS ACCESS' : 'WELCOME TO IPHONEBOOKING'}</span>
        <h2>{register ? 'Make yourself at home.' : 'Good to see you.'}</h2>
        {register && (
          <label>
            Your name
            <input name="name" autoComplete="name" required minLength={2} />
          </label>
        )}
        <label>
          Email address
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={register ? 'new-password' : 'current-password'}
            minLength={12}
            maxLength={128}
            required
          />
        </label>
        {register && (
          <p className="fine-print">
            Use at least 12 characters. Your password is securely hashed.
          </p>
        )}
        {error && <ErrorNotice error={error} />}
        <button className="button" disabled={busy}>
          {busy ? 'One moment…' : register ? 'Create your account' : 'Sign in'}
          <ArrowRight size={16} />
        </button>
        {!admin && (
          <p>
            {register ? 'Already part of the family?' : 'New here?'}{' '}
            <button
              type="button"
              className="text-button inline"
              onClick={() => {
                setRegister(!register);
                setError(null);
              }}
            >
              {register ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        )}
        <p className="fine-print">
          By continuing, you agree to our <Link to="/policies/terms">Terms</Link> and{' '}
          <Link to="/policies/privacy">Privacy Policy</Link>.
        </p>
      </form>
    </div>
  );
}
const sections = [
  ['overview', 'Overview'],
  ['orders', 'Orders & bookings'],
  ['devices', 'My devices'],
  ['repairs', 'Repairs'],
  ['trade-ins', 'Trade-ins & exchanges'],
  ['addresses', 'Saved addresses'],
  ['notifications', 'Notifications'],
  ['tickets', 'Support tickets'],
  ['profile', 'Profile'],
  ['security', 'Security'],
];
export default function Account() {
  const { section = 'overview' } = useParams();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<User | null>('/auth/me') });
  if (me.isLoading)
    return (
      <div className="container page">
        <Loading />
      </div>
    );
  if (me.error)
    return (
      <div className="container page">
        <ErrorNotice error={me.error} />
      </div>
    );
  if (!me.data) return <SignIn />;
  const user = me.data;
  return (
    <div className="container page">
      <PageIntro
        eyebrow="YOUR APPLE WORLD"
        title={`Hello, ${user.name.split(' ')[0]}.`}
        description="Everything you love, all connected."
      />
      <div className="account-layout">
        <aside className="account-sidebar">
          <nav aria-label="Account">
            {sections.map(([path, name]) => (
              <NavLink key={path} to={path === 'overview' ? '/account' : `/account/${path}`} end>
                {name}
                <ArrowRight size={14} />
              </NavLink>
            ))}
            <Link to="/wishlist">
              Wishlist
              <ArrowRight size={14} />
            </Link>
            {user.role && (
              <Link to="/admin">
                Administration
                <ArrowRight size={14} />
              </Link>
            )}
          </nav>
          <button
            className="text-button"
            onClick={async () => {
              await post('/auth/logout', {});
              qc.clear();
              qc.setQueryData(['me'], null);
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </aside>
        <div className="account-content">
          {section === 'overview' ? (
            <AccountOverview />
          ) : section === 'orders' ? (
            <AccountOrders />
          ) : section === 'devices' ? (
            <AccountDevices />
          ) : section === 'repairs' ? (
            <AccountRepairs />
          ) : section === 'trade-ins' ? (
            <AccountTradeIns />
          ) : section === 'addresses' ? (
            <AccountAddresses />
          ) : section === 'notifications' ? (
            <AccountNotifications />
          ) : section === 'tickets' ? (
            <AccountTickets />
          ) : section === 'security' ? (
            <AccountSecurity />
          ) : section === 'profile' ? (
            <AccountProfile user={user} />
          ) : (
            <p>Select an account section to continue.</p>
          )}
        </div>
      </div>
    </div>
  );
}
function AccountOverview() {
  const result = useQuery({
    queryKey: ['account', 'overview'],
    queryFn: () =>
      api<{
        orders: number;
        devices: number;
        repairs: number;
        tradeIns: number;
        notifications: Notification[];
      }>('/account/overview'),
  });
  if (result.isLoading) return <Loading />;
  if (result.error) return <ErrorNotice error={result.error} />;
  const data = result.data;
  return (
    <>
      <h2>Your world, at a glance.</h2>
      <div className="account-metrics">
        {[
          [Package, 'Orders', data?.orders, 'orders'],
          [Smartphone, 'Devices', data?.devices, 'devices'],
          [Wrench, 'Repairs', data?.repairs, 'repairs'],
          [RefreshCw, 'Trade-ins', data?.tradeIns, 'trade-ins'],
        ].map(([Icon, title, value, path]) => {
          const I = Icon as typeof Package;
          return (
            <Link to={`/account/${path}`} key={String(title)}>
              <I size={23} strokeWidth={1.4} />
              <strong>{String(value ?? 0)}</strong>
              <span>{String(title)}</span>
            </Link>
          );
        })}
      </div>
      <div className="record-card">
        <ShieldCheck size={28} strokeWidth={1.3} />
        <h2>One account. A lasting connection.</h2>
        <p>
          When your order is fulfilled and its device is assigned, it appears in My Devices.
          Warranty, repair history, and future trade-ins stay connected.
        </p>
        <ButtonLink to="/store">Find your next device</ButtonLink>
      </div>
    </>
  );
}
