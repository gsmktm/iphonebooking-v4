import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, post, human } from '../../services/api';
import { ErrorNotice, Loading } from '../../components/ui';
export default function RepairQCForm({
  repairId,
  onComplete,
}: {
  repairId: string;
  onComplete: () => void;
}) {
  const query = useQuery({
    queryKey: ['repair-qc-checklist'],
    queryFn: () => api<string[]>('/admin/repairs/qc-checklist'),
  });
  const client = useQueryClient();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<Error | null>(null);
  if (query.isLoading) return <Loading />;
  if (query.error) return <ErrorNotice error={query.error} />;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        try {
          await post(`/admin/repairs/${repairId}/qc`, {
            checks: query.data!.map((name) => ({ name, passed: fd.get(name) === 'pass' })),
            notes: fd.get('notes'),
          });
          await client.invalidateQueries({ queryKey: ['admin'] });
          onComplete();
        } catch (e) {
          setError(e as Error);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>Inspect each function. A failed check keeps this repair from being marked ready.</p>
      <div className="qc-grid">
        {query.data?.map((name) => (
          <label key={name}>
            {human(name)}
            <select name={name} required defaultValue="">
              <option value="" disabled>
                Choose result
              </option>
              <option value="pass">Passed</option>
              <option value="fail">Failed / needs attention</option>
            </select>
          </label>
        ))}
      </div>
      <label>
        Inspection notes
        <textarea name="notes" maxLength={1000} />
      </label>
      {error && <ErrorNotice error={error} />}
      <button className="button" disabled={busy}>
        {busy ? 'Recording…' : 'Record QC results'}
      </button>
    </form>
  );
}
