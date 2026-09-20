import { useState } from 'react';
import { Link, NavLink, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Search,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Menu,
  Download,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { api, money, date } from '../services/api';
import type { User } from '../services/types';
import { Brand, ErrorNotice, Loading, Empty, Dialog, Status } from '../components/ui';
import { SignIn } from './Account';
import {
  resources,
  actionsFor,
  createAction,
  getValue,
  type Row,
  type Action,
} from './admin/resources';
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
      ['device-passport', 'Device passports'],
      ['device-provenance', 'Provenance'],
      ['condition-evidence', 'Condition evidence'],
      ['condition-snapshot', 'Condition snapshots'],
      ['trade-in-quote', 'Trade-in quotes'],
      ['refurbished-device', 'Refurbished stock'],
      ['repair-bom', 'Repair BOM'],
      ['repair-qc', 'Repair QC'],
      ['repair-warranty', 'Repair warranty'],
      ['pos-session', 'POS sessions'],
      ['scan-log', 'Scan log'],
      ['document', 'Documents'],
      ['appointment', 'Appointments'],
      ['fulfillment-promise', 'Fulfillment'],
      ['reverse-logistics', 'Reverse logistics'],
      ['courier-provider', 'Couriers'],
      ['courier-shipment', 'Shipments'],
      ['allocation-rule', 'Allocation rules'],
      ['allocation-entry', 'Allocation'],
      ['suppliers', 'Supplier directory'],
      ['purchase-orders', 'Supplier purchases'],
      ['receipts', 'Receiving & QC'],
      ['purchase-request', 'Purchase requests'],
      ['purchase-order', 'Purchase orders'],
      ['goods-received-note', 'GRN'],
      ['supplier-scorecard', 'Suppliers'],
      ['inventory-bin', 'Bins'],
      ['stocktake-session', 'Stocktake'],
      ['inventory-aging', 'Inventory aging'],
      ['price-intelligence', 'Pricing'],
      ['pricing-guardrail', 'Price guards'],
      ['promotion-simulation', 'Promotions'],
      ['bundle', 'Bundles'],
      ['organization', 'Orgs'],
      ['bulk-quote', 'Bulk quotes'],
      ['financial-ledger', 'Ledger'],
      ['reconciliation-mismatch', 'Reconciliations'],
      ['financing-application', 'Financing'],
      ['ai-conversation', 'AI convos'],
      ['workflow-run', 'Workflows'],
      ['ops-alert', 'Alerts'],
      ['sla-tracking', 'SLA'],
      ['feature-flag', 'Flags'],
      ['experiment', 'Experiments'],
      ['search-log', 'Search log'],
      ['sync-change', 'Sync'],
      ['integration-config', 'Integrations'],
      ['webhook-log', 'Webhooks'],
      ['outbox-message', 'Outbox'],
      ['forecast', 'Forecast'],
      ['service-status', 'Status'],
      ['incident', 'Incidents'],
      ['warranty-entitlement', 'Warranties'],
      ['loyalty-ledger-entry', 'Loyalty'],
      ['referral', 'Referrals'],
      ['accessory-fit-check', 'Accessory fit'],
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
                .filter(([r]) => can(r ? resources[r]?.permission : 'report.read'))
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
              title="This module isn’t available to your role."
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
