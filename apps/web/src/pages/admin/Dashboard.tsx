import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  ShoppingBag,
  ShieldCheck,
  Search,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { api, money, date } from '../../services/api';
import type { User } from '../../services/types';
import { ErrorNotice, Loading, Dialog, Status } from '../../components/ui';
import { resources, actionsFor, createAction, getValue, type Row, type Action } from './resources';
interface DashboardData {
  orders: number;
  bookings: number;
  repairs: number;
  tradeIns: number;
  revenue: number;
  recentOrders: {
    id: string;
    number: string;
    name: string;
    total: number;
    status: string;
    createdAt: string;
  }[];
  lowStock: {
    id: string;
    available: number;
    variant: { sku: string; product: { name: string } };
  }[];
  events: { name: string; _count: { name: number } }[];
}
export default function Dashboard() {
  const result = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api<DashboardData>('/admin/dashboard'),
  });
  if (result.isLoading) return <Loading />;
  if (result.error) return <ErrorNotice error={result.error} retry={() => void result.refetch()} />;
  const d = result.data!;
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow">A CLEARER VIEW</span>
          <h1>Good things, in motion.</h1>
          <p>Your business at a glance. Every number connected to a real record.</p>
        </div>
        <button className="button secondary" onClick={() => void result.refetch()}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>
      <div className="admin-metrics">
        {[
          ['Collected payments', money(d.revenue), 'payments'],
          ['Total orders', d.orders, 'orders'],
          ['Active repairs', d.repairs, 'repairs'],
          ['Awaiting inspection', d.tradeIns, 'trade-ins'],
        ].map(([label, value, path]) => (
          <Link to={`/admin/${path}`} key={String(label)}>
            <span>
              {label}
              <ArrowUpRight size={15} />
            </span>
            <strong>{value}</strong>
            <small>View records</small>
          </Link>
        ))}
      </div>
      <section className="admin-panel">
        <div className="panel-heading">
          <h2>Recent orders</h2>
          <Link to="/admin/orders">
            View all
            <ArrowRight size={15} />
          </Link>
        </div>
        {d.recentOrders.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Placed</th>
                </tr>
              </thead>
              <tbody>
                {d.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/admin/orders?q=${o.number}`}>{o.number}</Link>
                    </td>
                    <td>{o.name}</td>
                    <td>{money(o.total)}</td>
                    <td>
                      <Status value={o.status} />
                    </td>
                    <td>{date(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <ShoppingBag size={32} strokeWidth={1} />
            <h3>Ready for your first order.</h3>
            <p>Reservations will appear here as customers check out.</p>
            <Link to="/store">
              Explore the store
              <ArrowUpRight size={14} />
            </Link>
          </div>
        )}
      </section>
      <div className="admin-two-columns">
        <section className="admin-panel">
          <div className="panel-heading">
            <h2>Stock needing attention</h2>
            <span className="status">{d.lowStock.length} configurations</span>
          </div>
          {d.lowStock.length ? (
            d.lowStock.slice(0, 8).map((s) => (
              <Link to="/admin/inventory" className="action-row" key={s.id}>
                <div>
                  <strong>{s.variant.product.name}</strong>
                  <small>{s.variant.sku}</small>
                </div>
                <span>
                  {s.available} left
                  <ArrowUpRight size={14} />
                </span>
              </Link>
            ))
          ) : (
            <div className="admin-empty">
              <ShieldCheck size={30} strokeWidth={1} />
              <p>No low-stock configurations.</p>
            </div>
          )}
        </section>
        <section className="admin-panel">
          <div className="panel-heading">
            <h2>Storefront activity</h2>
            <span className="muted">All time</span>
          </div>
          {d.events.length ? (
            d.events.map((e) => (
              <div className="action-row" key={e.name}>
                <span>{e.name.replaceAll('_', ' ')}</span>
                <strong>{e._count.name}</strong>
              </div>
            ))
          ) : (
            <div className="admin-empty">
              <p>Interaction events will appear as customers explore.</p>
            </div>
          )}
          <div className="panel-note">{d.bookings} pre-bookings recorded</div>
        </section>
      </div>
    </>
  );
}
