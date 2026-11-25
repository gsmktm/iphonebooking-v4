import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Store as StoreIcon, Users, Package, ArrowUpRight } from 'lucide-react';
import { api, post, date } from '../services/api';
import type { Store, User } from '../services/types';
import { PageIntro, Loading, ErrorNotice, Empty, Status, ButtonLink } from '../components/ui';
type List<T> = { items: T[]; total: number; page: number; take: number };
type Application = {
  id: string;
  businessName: string;
  contactName: string;
  contactPhone: string;
  city: string;
  address: string;
  note: string;
  status: string;
  reviewNote: string | null;
  retailerId: string | null;
  createdAt: string;
  applicant?: { name: string; email: string };
};
type Member = {
  id: string;
  role: string;
  active: boolean;
  user: { id: string; name: string; email: string };
};
type Membership = {
  id: string;
  role: string;
  retailer: { id: string; name: string; code: string; region: string };
};
type Stock = {
  id: string;
  available: number;
  reserved: number;
  trackedUnits: boolean;
  store: { id: string; name: string };
  variant: { sku: string; color: string; storage: string; product: { name: string } };
};
type TenantOrder = {
  id: string;
  number: string;
  status: string;
  fulfillment: string;
  createdAt: string;
  items: { id: string; quantity: number; variant: { sku: string; product: { name: string } } }[];
};
function Pager({
  page,
  total,
  take = 20,
  onPage,
}: {
  page: number;
  total: number;
  take?: number;
  onPage: (p: number) => void;
}) {
  return total > take ? (
    <nav className="panel-actions" aria-label="Results pages">
      <button className="button secondary" disabled={page === 1} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span>
        Page {page} of {Math.ceil(total / take)}
      </span>
      <button
        className="button secondary"
        disabled={page * take >= total}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </nav>
  ) : null;
}
export function RetailerNetwork() {
  const [page, setPage] = useState(1),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false);
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<User | null>('/auth/me') });
  const stores = useQuery({
    queryKey: ['retailer-network', page],
    queryFn: () => api<List<Store>>(`/retailer-network?page=${page}`),
  });
  const application = useQuery({
    queryKey: ['retailer-application', me.data?.id],
    queryFn: () => api<Application | null>('/retailer-applications'),
    enabled: !!me.data,
  });
  return (
    <div className="container page">
      <PageIntro
        eyebrow="LOCAL CONNECTION. SHARED POSSIBILITY."
        title="Grow with the network."
        description="Discover participating stores, or apply to connect your retail business with iPhoneBooking."
      />
      <div className="button-row">
        <ButtonLink to="/stores">All store locations</ButtonLink>
        <ButtonLink secondary to="/retailer">
          Retailer workspace
        </ButtonLink>
      </div>
      {stores.isLoading ? (
        <Loading />
      ) : stores.error ? (
        <ErrorNotice error={stores.error} retry={() => void stores.refetch()} />
      ) : stores.data?.items.length ? (
        <div className="support-grid">
          {stores.data.items.map((s) => (
            <Link className="record-card" key={s.id} to={`/stores/${s.slug}`}>
              <StoreIcon size={24} />
              <h2>{s.name}</h2>
              <p>{s.address}</p>
              <p>{s.hours}</p>
              <span className="text-button">
                Store details
                <ArrowUpRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="notice">
          Partner store listings will appear after applications are reviewed and locations are
          connected. You can still browse all store locations.
        </div>
      )}
      <Pager page={page} total={stores.data?.total ?? 0} onPage={setPage} />
      <section className="form-panel narrow">
        <h2>Build the next chapter with us.</h2>
        <p>
          Tell us about your business. The operations team reviews every application before granting
          store access.
        </p>
        {me.isLoading ? (
          <Loading />
        ) : me.error ? (
          <ErrorNotice error={me.error} />
        ) : !me.data ? (
          <ButtonLink to="/login?redirect=/retailer-network">Sign in to apply</ButtonLink>
        ) : application.isLoading ? (
          <Loading />
        ) : application.error ? (
          <ErrorNotice error={application.error} retry={() => void application.refetch()} />
        ) : (
          <>
            {application.data && (
              <div className="notice">
                <Status value={application.data.status} />
                <h3>{application.data.businessName}</h3>
                <p>
                  {application.data.reviewNote ??
                    'Your application is waiting for review. Updates appear in your account.'}
                </p>
                {application.data.status === 'APPROVED' && (
                  <ButtonLink to="/retailer">Open workspace</ButtonLink>
                )}
              </div>
            )}
            {(!application.data || application.data.status === 'REJECTED') && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  setBusy(true);
                  setError(undefined);
                  try {
                    await post('/retailer-applications', Object.fromEntries(f));
                    await application.refetch();
                  } catch (e) {
                    setError(e);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <div className="form-grid">
                  {[
                    ['businessName', 'Business name', 2, 120],
                    ['contactName', 'Contact name', 2, 100],
                    ['contactPhone', 'Contact phone', 7, 25],
                    ['city', 'City', 2, 100],
                    ['address', 'Business address', 8, 300],
                  ].map(([name, label, min, max]) => (
                    <label key={name}>
                      {label}
                      <input
                        name={String(name)}
                        required
                        minLength={Number(min)}
                        maxLength={Number(max)}
                        defaultValue={
                          (application.data?.[name as keyof Application] as string) ?? ''
                        }
                      />
                    </label>
                  ))}
                </div>
                <label>
                  About your business
                  <textarea
                    name="note"
                    minLength={20}
                    maxLength={2000}
                    required
                    rows={4}
                    defaultValue={application.data?.note}
                    placeholder="Your stores, services, and experience with Apple devices"
                  />
                </label>
                {!!error && <ErrorNotice error={error} />}
                <button className="button" disabled={busy}>
                  {busy ? 'Submitting…' : 'Submit application'}
                </button>
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
}
export function RetailerWorkspace() {
  const [selected, setSelected] = useState('');
  const membership = useQuery({
    queryKey: ['retailer-memberships'],
    queryFn: () => api<Membership[]>('/retailer/memberships'),
    retry: false,
  });
  const active = membership.data?.find((m) => m.retailer.id === selected) ?? membership.data?.[0];
  return (
    <div className="container page">
      <PageIntro
        eyebrow="RETAILER WORKSPACE"
        title="Your stores. In focus."
        description="Inventory, orders, and team access for your business."
      />
      {membership.isLoading ? (
        <Loading />
      ) : membership.error ? (
        <>
          <ErrorNotice error={membership.error} />
          <ButtonLink to="/login?redirect=/retailer">Sign in</ButtonLink>
        </>
      ) : !active ? (
        <Empty
          title="A workspace starts with a connection."
          description="Apply to join the retailer network, or ask your business owner to add your account."
          link="/retailer-network"
          action="Join the network"
        />
      ) : (
        <>
          <label>
            Business
            <select value={active.retailer.id} onChange={(e) => setSelected(e.target.value)}>
              {membership.data?.map((m) => (
                <option key={m.id} value={m.retailer.id}>
                  {m.retailer.name} · {m.role}
                </option>
              ))}
            </select>
          </label>
          <TenantPanel key={active.id} member={active} />
        </>
      )}
    </div>
  );
}
function TenantPanel({ member }: { member: Membership }) {
  const [tab, setTab] = useState<'inventory' | 'orders' | 'members'>('inventory'),
    [page, setPage] = useState(1),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [key, setKey] = useState(() => crypto.randomUUID());
  const path = `/retailer/${member.retailer.id}`;
  const inventory = useQuery({
    queryKey: ['retailer', member.retailer.id, 'inventory', page],
    queryFn: () => api<List<Stock>>(`${path}/inventory?page=${page}`),
    enabled: tab === 'inventory',
  });
  const orders = useQuery({
    queryKey: ['retailer', member.retailer.id, 'orders', page],
    queryFn: () => api<List<TenantOrder>>(`${path}/orders?page=${page}`),
    enabled: tab === 'orders',
  });
  const team = useQuery({
    queryKey: ['retailer', member.retailer.id, 'members'],
    queryFn: () => api<Member[]>(`${path}/members`),
    enabled: tab === 'members' && member.role === 'OWNER',
  });
  async function change(action: () => Promise<unknown>) {
    setBusy(true);
    setError(undefined);
    setMessage('');
    try {
      await action();
      setMessage('Changes saved.');
      setKey(crypto.randomUUID());
      if (tab === 'inventory') await inventory.refetch();
      if (tab === 'members') await team.refetch();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  const current = tab === 'inventory' ? inventory : tab === 'orders' ? orders : team;
  return (
    <>
      <nav className="panel-actions" aria-label="Retailer tools">
        {(['inventory', 'orders', ...(member.role === 'OWNER' ? ['members'] : [])] as const).map(
          (t) => (
            <button
              className={`button ${tab === t ? '' : 'secondary'}`}
              key={t}
              aria-pressed={tab === t}
              onClick={() => {
                setTab(t as typeof tab);
                setPage(1);
                setError(undefined);
                setMessage('');
              }}
            >
              {t === 'inventory' ? (
                <Package size={17} />
              ) : t === 'members' ? (
                <Users size={17} />
              ) : (
                <StoreIcon size={17} />
              )}{' '}
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ),
        )}
      </nav>
      {!!error && <ErrorNotice error={error} />}
      <p role="status" className="inline-status">
        {message}
      </p>
      {current.isLoading ? (
        <Loading />
      ) : current.error ? (
        <ErrorNotice error={current.error} retry={() => void current.refetch()} />
      ) : tab === 'inventory' ? (
        <>
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Store inventory">
            <table>
              <thead>
                <tr>
                  <th scope="col">Product / SKU</th>
                  <th scope="col">Store</th>
                  <th scope="col">Available</th>
                  <th scope="col">Reserved</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {inventory.data?.items.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.variant.product.name}
                      <br />
                      <small>
                        {s.variant.storage} · {s.variant.color}
                        <br />
                        {s.variant.sku}
                      </small>
                    </td>
                    <td>{s.store.name}</td>
                    <td>{s.available}</td>
                    <td>{s.reserved}</td>
                    <td>
                      {member.role === 'VIEWER' ? (
                        'View only'
                      ) : s.trackedUnits ? (
                        'Use receiving for tracked devices'
                      ) : (
                        <details>
                          <summary>Adjust stock</summary>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const f = new FormData(e.currentTarget);
                              void change(() =>
                                post(`${path}/inventory/${s.id}/adjust`, {
                                  quantity: Number(f.get('quantity')),
                                  expectedAvailable: s.available,
                                  reason: f.get('reason'),
                                  idempotencyKey: key,
                                }),
                              );
                            }}
                          >
                            <label>
                              Quantity change
                              <input
                                type="number"
                                name="quantity"
                                required
                                min={-10000}
                                max={10000}
                                defaultValue={1}
                              />
                            </label>
                            <label>
                              Reason
                              <input name="reason" minLength={10} maxLength={300} required />
                            </label>
                            <button className="button secondary" disabled={busy}>
                              Save adjustment
                            </button>
                          </form>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!inventory.data?.items.length && (
            <p className="notice">No inventory is assigned to your stores yet.</p>
          )}
          <Pager page={page} total={inventory.data?.total ?? 0} onPage={setPage} />
        </>
      ) : tab === 'orders' ? (
        <>
          <div className="record-list">
            {orders.data?.items.map((o) => (
              <article className="record-card" key={o.id}>
                <div className="record-header">
                  <h2>{o.number}</h2>
                  <Status value={o.status} />
                </div>
                <p>
                  {date(o.createdAt)} · {o.fulfillment}
                </p>
                <ul>
                  {o.items.map((i) => (
                    <li key={i.id}>
                      {i.variant.product.name} · {i.variant.sku} × {i.quantity}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          {!orders.data?.items.length && (
            <p className="notice">New orders allocated to your stores will appear here.</p>
          )}
          <Pager page={page} total={orders.data?.total ?? 0} onPage={setPage} />
        </>
      ) : (
        <>
          <div className="record-list">
            {team.data?.map((m) => (
              <form
                className="record-card"
                key={m.id}
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void change(() =>
                    api(`${path}/members/${m.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ role: f.get('role'), active: f.has('active') }),
                    }),
                  );
                }}
              >
                <h3>{m.user.name}</h3>
                <p>{m.user.email}</p>
                {m.role === 'OWNER' ? (
                  <Status value="OWNER" />
                ) : (
                  <>
                    <label>
                      Role
                      <select name="role" defaultValue={m.role}>
                        <option>MANAGER</option>
                        <option>VIEWER</option>
                      </select>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" name="active" defaultChecked={m.active} />
                      Active membership
                    </label>
                    <button className="button secondary" disabled={busy}>
                      Update access
                    </button>
                  </>
                )}
              </form>
            ))}
          </div>
          <form
            className="record-card"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void change(() =>
                post(`${path}/members`, { email: f.get('email'), role: f.get('role') }),
              );
            }}
          >
            <h3>Add a teammate</h3>
            <p>Your teammate needs an existing account.</p>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Role
              <select name="role">
                <option>VIEWER</option>
                <option>MANAGER</option>
              </select>
            </label>
            <button className="button" disabled={busy}>
              Add member
            </button>
          </form>
        </>
      )}
    </>
  );
}
export function RetailerApplications() {
  const [page, setPage] = useState(1),
    [error, setError] = useState<unknown>(),
    [busy, setBusy] = useState(false);
  const applications = useQuery({
    queryKey: ['admin', 'retailer-applications', page],
    queryFn: () => api<List<Application>>(`/admin/retailer-applications?page=${page}`),
  });
  const stores = useQuery({
    queryKey: ['admin', 'retailer-stores'],
    queryFn: () => api<List<Store>>('/admin/retailer-stores?take=50'),
  });
  async function submit(path: string, data: unknown) {
    setBusy(true);
    setError(undefined);
    try {
      await post(path, data);
      await applications.refetch();
      await stores.refetch();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageIntro
        eyebrow="PARTNER OPERATIONS"
        title="Retailer applications."
        description="Review a business, assign its stores, and open its workspace."
      />
      {!!error && <ErrorNotice error={error} />}{' '}
      {applications.isLoading ? (
        <Loading />
      ) : applications.error ? (
        <ErrorNotice error={applications.error} />
      ) : !applications.data?.items.length ? (
        <p className="notice">No applications yet.</p>
      ) : (
        <div className="record-list">
          {applications.data.items.map((a) => (
            <article className="record-card" key={a.id}>
              <div className="record-header">
                <h2>{a.businessName}</h2>
                <Status value={a.status} />
              </div>
              <p>
                {a.contactName} · {a.contactPhone} · {a.applicant?.email}
              </p>
              <p>
                {a.address}, {a.city}
              </p>
              <p>{a.note}</p>
              {a.reviewNote && <p>Review: {a.reviewNote}</p>}
              {a.status === 'PENDING' ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const decision = f.get('decision');
                    void submit(`/admin/retailer-applications/${a.id}/review`, {
                      decision,
                      reviewNote: f.get('reviewNote'),
                      ...(decision === 'APPROVED'
                        ? { code: f.get('code'), storeIds: f.getAll('storeIds') }
                        : {}),
                    });
                  }}
                >
                  <div className="form-grid">
                    <label>
                      Decision
                      <select name="decision">
                        <option>APPROVED</option>
                        <option>REJECTED</option>
                      </select>
                    </label>
                    <label>
                      Retailer code (for approval)
                      <input
                        name="code"
                        minLength={3}
                        maxLength={30}
                        pattern="[A-Za-z0-9-]+"
                        placeholder="BUSINESS-CODE"
                      />
                    </label>
                  </div>
                  <label>
                    Review note
                    <textarea name="reviewNote" minLength={10} maxLength={1000} required />
                  </label>
                  <fieldset>
                    <legend>Assign available stores</legend>
                    {stores.data?.items.map((s) => (
                      <label className="checkbox-label" key={s.id}>
                        <input type="checkbox" name="storeIds" value={s.id} />
                        {s.name}
                      </label>
                    ))}
                  </fieldset>
                  <button className="button" disabled={busy}>
                    Save review
                  </button>
                </form>
              ) : a.retailerId ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void submit(`/admin/retailers/${a.retailerId}/stores`, {
                      storeId: f.get('storeId'),
                    });
                  }}
                >
                  <label>
                    Connect another store
                    <select name="storeId" required>
                      <option value="">Choose an unassigned store</option>
                      {stores.data?.items.map((s) => (
                        <option value={s.id} key={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="button secondary" disabled={busy}>
                    Assign store
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      )}
      <Pager page={page} total={applications.data?.total ?? 0} onPage={setPage} />
    </>
  );
}
