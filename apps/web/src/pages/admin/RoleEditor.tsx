import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, human } from '../../services/api';
import { ErrorNotice, Loading } from '../../components/ui';
import type { Action } from './resources';
export default function RoleEditor({
  action,
  onComplete,
}: {
  action: Action;
  onComplete: () => Promise<void>;
}) {
  const query = useQuery({
    queryKey: ['permission-catalog'],
    queryFn: () => api<string[]>('/admin/permission-catalog'),
  });
  const [error, setError] = useState<Error | null>(null),
    [busy, setBusy] = useState(false);
  if (query.isLoading) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  const initial = Array.isArray(action.initial?.permissions) ? action.initial.permissions : [];
  const groups = [...new Set(query.data?.map((p) => p.split('.')[0]))];
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const data = new FormData(e.currentTarget);
        try {
          await api(action.path, {
            method: action.method,
            body: JSON.stringify({
              name: data.get('name'),
              permissions: data.getAll('permissions'),
            }),
          });
          await onComplete();
        } catch (e) {
          setError(e as Error);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Role name
        <input
          name="name"
          required
          minLength={2}
          maxLength={80}
          defaultValue={String(action.initial?.name ?? '')}
        />
      </label>
      <p>Choose only the access this role needs. Changes sign out staff using the role.</p>
      <div className="qc-grid">
        {groups.map((group) => (
          <fieldset className="role-permission-group" key={group}>
            <legend>{human(group)}</legend>
            {query.data
              ?.filter((p) => p.startsWith(`${group}.`))
              .map((p) => (
                <label className="checkbox-label" key={p}>
                  <input
                    type="checkbox"
                    name="permissions"
                    value={p}
                    defaultChecked={initial.includes(p)}
                  />
                  {human(p.split('.')[1])}
                </label>
              ))}
          </fieldset>
        ))}
      </div>
      {error && <ErrorNotice error={error} />}
      <button className="button" disabled={busy}>
        {busy ? 'Saving…' : 'Save role'}
      </button>
    </form>
  );
}
