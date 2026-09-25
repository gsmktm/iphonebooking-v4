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
import RoleEditor from './RoleEditor';
import RepairQCForm from './RepairQCForm';
import TechnicianAssignment from './TechnicianAssignment';
import ContentEditor from './ContentEditor';
export default function ResourcePage({ resource, user }: { resource: string; user: User }) {
  const config = resources[resource];
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? 1);
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [selected, setSelected] = useState<Row | null>(null),
    [action, setAction] = useState<Action | null>(null),
    [error, setError] = useState<Error | null>(null),
    [busy, setBusy] = useState(false);
  const [qcRepair, setQCRepair] = useState<string | null>(null);
  const [assignRepair, setAssignRepair] = useState<Row | null>(null);
  const qc = useQueryClient();
  const result = useQuery({
    queryKey: ['admin', resource, params.toString()],
    queryFn: () =>
      api<{ rows: Row[]; total: number; page: number; pageSize: number }>(
        `/admin/${resource}?${params}`,
      ),
  });
  const can = (p: string) => user.permissions.includes('*') || user.permissions.includes(p);
  const creator = createAction(resource);
  const serverSearch = ['products', 'variants', 'orders', 'customers'].includes(resource);
  const displayedRows = (result.data?.rows ?? []).filter(
    (row) =>
      serverSearch ||
      !params.get('q') ||
      JSON.stringify(row).toLowerCase().includes(params.get('q')!.toLowerCase()),
  );
  const exportRows = () => {
    if (!result.data) return;
    const escape = (v: unknown) =>
      `"${String(v ?? '')
        .replace(/^[=+@-]/, "'")
        .replaceAll('"', '""')}"`;
    const csv = [
      config.columns.map((c) => escape(c.label)).join(','),
      ...displayedRows.map((row) =>
        config.columns.map((c) => escape(getValue(row, c.key))).join(','),
      ),
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${resource}-page-${page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        {creator && can(creator.permission) && (
          <button className="button" onClick={() => setAction(creator)}>
            <Plus size={16} />
            {creator.label}
          </button>
        )}
        {resource === 'units' && can('inventory.adjust') && (
          <button
            className="button"
            onClick={() =>
              setAction({
                label: 'Register a physical device',
                path: '/admin/units',
                method: 'POST',
                permission: 'inventory.adjust',
                fields: [
                  { key: 'variantId', label: 'Variant ID', required: true },
                  { key: 'serial', label: 'Serial number', required: true },
                  { key: 'stockId', label: 'Inventory stock record ID', required: true },
                ],
                help: 'Serials are hashed and only the last four characters are displayed. Stock counts are managed separately in Inventory.',
              })
            }
          >
            <Plus size={16} />
            Register device
          </button>
        )}
      </div>
      <section className="admin-panel">
        <div className="admin-table-toolbar">
          <form
            className="admin-search"
            onSubmit={(e) => {
              e.preventDefault();
              setParams({ q: search, page: '1' });
            }}
          >
            <Search size={17} />
            <input
              aria-label={serverSearch ? 'Search records' : 'Filter this page'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={serverSearch ? 'Search records…' : 'Filter this page…'}
            />
            <button type="submit" className="text-button">
              Search
            </button>
          </form>
          <div>
            <span className="muted">{result.data?.total ?? 0} records</span>
            {resource !== 'customers' && (
              <button className="text-button" onClick={exportRows} disabled={!displayedRows.length}>
                <Download size={16} />
                Export this page
              </button>
            )}
          </div>
        </div>
        {result.isLoading ? (
          <Loading />
        ) : result.error ? (
          <ErrorNotice error={result.error} />
        ) : !displayedRows.length ? (
          <div className="admin-empty">
            <Package size={34} strokeWidth={1} />
            <h3>No records yet.</h3>
            <p>Records will appear here as this workflow is used.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {config.columns.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row, i) => (
                  <tr key={String(row.id ?? i)}>
                    {config.columns.map((c) => {
                      const value = getValue(row, c.key);
                      return (
                        <td key={c.key}>
                          {c.money && typeof value === 'number' ? (
                            money(value)
                          ) : c.status && typeof value === 'string' ? (
                            <Status value={value} />
                          ) : typeof value === 'boolean' ? (
                            value ? (
                              'Yes'
                            ) : (
                              'No'
                            )
                          ) : Array.isArray(value) ? (
                            value.join(', ')
                          ) : c.key.endsWith('At') && typeof value === 'string' ? (
                            date(value)
                          ) : (
                            String(value ?? '—')
                          )}
                        </td>
                      );
                    })}
                    <td>
                      <button className="text-button" onClick={() => setSelected(row)}>
                        View
                        <ArrowUpRight size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination">
          <span>
            Page {page} of {Math.max(1, Math.ceil((result.data?.total ?? 0) / 50))}
          </span>
          <div>
            <button
              className="icon-button"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() =>
                setParams((p) => {
                  p.set('page', String(page - 1));
                  return p;
                })
              }
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="icon-button"
              aria-label="Next page"
              disabled={page * 50 >= (result.data?.total ?? 0)}
              onClick={() =>
                setParams((p) => {
                  p.set('page', String(page + 1));
                  return p;
                })
              }
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>
      <Dialog
        open={!!selected && !action && !qcRepair && !assignRepair}
        onClose={() => setSelected(null)}
        title={`${config.title} · Details`}
      >
        {selected && (
          <>
            <div className="detail-fields">
              {Object.entries(selected)
                .filter(([key]) => !['passwordHash', 'trackingHash'].includes(key))
                .map(([key, value]) => (
                  <div key={key}>
                    <strong>{key}</strong>
                    <pre>
                      {typeof value === 'object'
                        ? JSON.stringify(value, null, 2)
                        : String(value ?? '—')}
                    </pre>
                  </div>
                ))}
            </div>
            <div className="button-row">
              {resource === 'repairs' &&
                can('repair.assign') &&
                ![
                  'QUALITY_CONTROL',
                  'READY',
                  'COMPLETED',
                  'CANCELLED',
                  'REJECTED',
                  'UNREPAIRABLE',
                ].includes(String(selected.status)) && (
                  <button className="button secondary" onClick={() => setAssignRepair(selected)}>
                    Assign technician
                  </button>
                )}
              {resource === 'repairs' &&
                selected.status === 'QUALITY_CONTROL' &&
                can('repair.qc') && (
                  <button className="button" onClick={() => setQCRepair(String(selected.id))}>
                    Record quality checks
                  </button>
                )}
              {actionsFor(resource, selected)
                .filter((a) => can(a.permission))
                .map((a) => (
                  <button
                    className="button secondary"
                    key={a.label}
                    onClick={() => {
                      setError(null);
                      setAction(a);
                    }}
                  >
                    {a.label}
                  </button>
                ))}
            </div>
          </>
        )}
      </Dialog>
      <Dialog open={!!assignRepair} onClose={() => setAssignRepair(null)} title="Assign technician">
        {assignRepair && (
          <TechnicianAssignment
            repairId={String(assignRepair.id)}
            currentId={
              typeof assignRepair.assignedTechnicianId === 'string'
                ? assignRepair.assignedTechnicianId
                : null
            }
            onComplete={async () => {
              await qc.invalidateQueries({ queryKey: ['admin'] });
              setAssignRepair(null);
              setSelected(null);
            }}
          />
        )}
      </Dialog>
      <Dialog open={!!qcRepair} onClose={() => setQCRepair(null)} title="Repair quality control">
        {qcRepair && (
          <RepairQCForm
            repairId={qcRepair}
            onComplete={() => {
              setQCRepair(null);
              setSelected(null);
            }}
          />
        )}
      </Dialog>
      <Dialog
        open={!!action}
        onClose={() => {
          setAction(null);
          setError(null);
        }}
        title={action?.label ?? 'Update record'}
      >
        {action &&
          (resource === 'roles' ? (
            <RoleEditor
              key={action.path}
              action={action}
              onComplete={async () => {
                await qc.invalidateQueries({ queryKey: ['admin'] });
                setAction(null);
                setSelected(null);
              }}
            />
          ) : resource === 'content' ? (
            <ContentEditor
              key={action.path}
              action={action}
              onComplete={() => {
                setAction(null);
                setSelected(null);
              }}
            />
          ) : (
            <form
              key={action.label}
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError(null);
                try {
                  const fd = new FormData(e.currentTarget);
                  const data: Row = {};
                  for (const f of action.fields) {
                    const raw = fd.get(f.key);
                    data[f.key] =
                      f.type === 'checkbox'
                        ? raw === 'on'
                        : f.type === 'number'
                          ? Number(raw)
                          : f.type === 'json'
                            ? JSON.parse(String(raw))
                            : String(raw ?? '');
                  }
                  await api(action.path, { method: action.method, body: JSON.stringify(data) });
                  await qc.invalidateQueries({ queryKey: ['admin'] });
                  setAction(null);
                  setSelected(null);
                } catch (e) {
                  setError(e as Error);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {action.help && <p className="notice">{action.help}</p>}
              {action.fields.map((f) =>
                f.type === 'checkbox' ? (
                  <label className="checkbox-label" key={f.key}>
                    <input
                      name={f.key}
                      type="checkbox"
                      defaultChecked={Boolean(action.initial?.[f.key])}
                    />
                    {f.label}
                  </label>
                ) : (
                  <label key={f.key}>
                    {f.label}
                    {f.type === 'textarea' || f.type === 'json' ? (
                      <textarea
                        name={f.key}
                        required={f.required}
                        rows={f.type === 'json' ? 12 : 4}
                        defaultValue={
                          f.type === 'json'
                            ? JSON.stringify(action.initial?.[f.key] ?? [], null, 2)
                            : String(action.initial?.[f.key] ?? '')
                        }
                      />
                    ) : (
                      <input
                        name={f.key}
                        required={f.required}
                        type={f.type === 'number' ? 'number' : 'text'}
                        defaultValue={String(action.initial?.[f.key] ?? '')}
                      />
                    )}
                  </label>
                ),
              )}
              {error && <ErrorNotice error={error} />}
              <button className="button" disabled={busy}>
                {busy ? 'Saving…' : 'Save changes'}
                <ArrowRight size={16} />
              </button>
            </form>
          ))}
      </Dialog>
    </>
  );
}
