import { useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Wrench,
  RefreshCw,
  Layers,
  FileText,
  Users,
  ShieldCheck,
  ArrowUpRight,
  Menu,
} from 'lucide-react';
import { api } from '../services/api';
import type { User } from '../services/types';
import { Brand, ErrorNotice, Loading, Empty } from '../components/ui';
import { SignIn } from './Account';
import { resources } from './admin/resources';
import Dashboard from './admin/Dashboard';
import ResourcePage from './admin/ResourcePage';
const groups = [
  { title: 'Overview', items: [['', 'Dashboard']] },
  {
    title: 'Commerce',
    items: [
      ['orders', 'Orders'],
      ['bookings', 'Pre-bookings'],
      ['products', 'Products'],
      ['categories', 'Categories'],
      ['variants', 'Configurations'],
      ['payments', 'Payments'],
      ['order-ledger', 'Order money ledger'],
      ['reconciliation', 'Order reconciliation'],
      ['refunds', 'Refund requests'],
    ],
  },
  {
    title: 'Device lifecycle',
    items: [
      ['inventory', 'Inventory'],
      ['inventory-ledger', 'Stock movements'],
      ['units', 'Serial registry'],
      ['repairs', 'Repairs'],
      ['trade-ins', 'Trade-ins & exchanges'],
      ['valuation-rules', 'Valuation rules'],
      ['device-identity', 'Device identity'],
      ['device-event', 'Device history'],
      ['device-risk-check', 'Device risk checks'],
      ['parts', 'Repair parts'],
      ['part-movements', 'Part movements'],
      ['trade-in-quote', 'Trade-in quotes'],
      ['repair-qc', 'Repair QC'],
      ['repair-warranty', 'Repair warranty'],
      ['suppliers', 'Supplier directory'],
      ['purchase-orders', 'Supplier purchases'],
      ['receipts', 'Receiving & QC'],
    ],
  },
  {
    title: 'People & experience',
    items: [
      ['customers', 'Customers'],
      ['stores', 'Stores'],
      ['content', 'Content studio'],
      ['tickets', 'Support'],
      ['notifications', 'Notifications'],
      ['subscribers', 'Launch subscribers'],
    ],
  },
  {
    title: 'System',
    items: [
      ['roles', 'Roles & permissions'],
      ['audit-logs', 'Audit trail'],
      ['jobs', 'Background jobs'],
    ],
  },
];
const icons: Record<string, typeof Package> = {
  '': LayoutDashboard,
  orders: ShoppingBag,
  products: Package,
  inventory: Layers,
  repairs: Wrench,
  'trade-ins': RefreshCw,
  content: FileText,
  customers: Users,
  roles: ShieldCheck,
};
export default function Admin() {
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<User | null>('/auth/me') });
  const { resource = '' } = useParams();
  const [navOpen, setNavOpen] = useState(false);
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
  if (!me.data) return <SignIn admin />;
  const user = me.data,
    can = (p: string) => user.permissions.includes('*') || user.permissions.includes(p);
  if (!user.role)
    return (
      <div className="container page">
        <Empty
          title="Staff access required."
          description="This account does not have operational permissions."
          link="/account"
          action="Back to your account"
        />
      </div>
    );
  return (
    <div className="admin-app">
      <aside className={`admin-sidebar ${navOpen ? 'open' : ''}`}>
        <Brand />
        <div className="workspace-label">
          <span className="availability-dot" />
          Operations workspace
        </div>
        <nav aria-label="Administration">
          {groups.map((g) => (
            <div className="admin-nav-group" key={g.title}>
              <span>{g.title}</span>
              {g.items
                .filter(
                  ([r]) => (!r || resources[r]) && can(r ? resources[r].permission : 'report.read'),
                )
                .map(([r, label]) => {
                  const Icon = icons[r] ?? FileText;
                  return (
                    <NavLink
                      key={r}
                      end
                      to={`/admin${r ? `/${r}` : ''}`}
                      onClick={() => setNavOpen(false)}
                    >
                      <Icon size={17} />
                      {label}
                    </NavLink>
                  );
                })}
            </div>
          ))}
        </nav>
        <Link className="back-to-store" to="/">
          View storefront
          <ArrowUpRight size={16} />
        </Link>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <button
            className="icon-button admin-menu-toggle"
            onClick={() => setNavOpen(!navOpen)}
            aria-label="Toggle admin navigation"
          >
            <Menu />
          </button>
          <span>
            Workspace{' '}
            <span className="muted">/ {resource ? resources[resource]?.title : 'Overview'}</span>
          </span>
          <div>
            <span className="admin-mode">LIVE DATABASE</span>
            <span className="avatar">{user.name[0]}</span>
            <span>{user.name}</span>
          </div>
        </header>
        <div className="admin-body">
          {!resource ? (
            can('report.read') ? (
              <Dashboard />
            ) : (
              <Empty
                title="Choose a workspace."
                description="Use the navigation to open a module you have access to."
                link="/account"
                action="Your account"
              />
            )
          ) : resources[resource] && can(resources[resource].permission) ? (
            <ResourcePage key={resource} resource={resource} user={user} />
          ) : (
            <Empty
              title={
                resources[resource]
                  ? 'This module isn’t available to your role.'
                  : 'This workflow is not enabled yet.'
              }
              description={
                resources[resource]
                  ? undefined
                  : 'Implementation and validation are still in progress.'
              }
              link="/admin"
              action="Back to overview"
            />
          )}
        </div>
        <footer className="admin-footer">
          iPhoneBooking · Operations V2 <span>Server-authorized actions · Audited changes</span>
        </footer>
      </div>
    </div>
  );
}
