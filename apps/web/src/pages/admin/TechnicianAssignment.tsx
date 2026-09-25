import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, post } from '../../services/api';
import { ErrorNotice, Loading } from '../../components/ui';
interface Technician {
  id: string;
  name: string;
  role: { name: string };
  activeRepairs: number;
}
export default function TechnicianAssignment({
  repairId,
  currentId,
  onComplete,
}: {
  repairId: string;
  currentId: string | null;
  onComplete: () => Promise<void>;
}) {
  const technicianField = useId();
  const [search, setSearch] = useState(''),
    [query, setQuery] = useState(''),
    [technicianId, setTechnicianId] = useState('');
  const [error, setError] = useState<Error | null>(null),
    [busy, setBusy] = useState(false);
  const technicians = useQuery({
    queryKey: ['admin', 'repair-technicians', query],
    queryFn: () => api<Technician[]>(`/admin/repair-technicians?q=${encodeURIComponent(query)}`),
  });
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setBusy(true);
        setError(null);
        try {
          await post(`/admin/repairs/${repairId}/assign`, {
            technicianId,
            expectedTechnicianId: currentId,
            reason: data.get('reason'),
          });
          await onComplete();
        } catch (e) {
          setError(e as Error);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        Choose staff with repair work permission. Previous assignments remain in the audit history.
      </p>
      <label>
        Find technician
        <input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} />
      </label>
      <button
        className="button secondary"
        type="button"
        onClick={() => {
          setQuery(search);
          setTechnicianId('');
        }}
      >
        Search staff
      </button>
      {technicians.isLoading ? (
        <Loading />
      ) : technicians.error ? (
        <ErrorNotice error={technicians.error} retry={() => void technicians.refetch()} />
      ) : (
        <>
          <label htmlFor={technicianField}>Assigned technician</label>
          <select
            id={technicianField}
            required
            value={technicianId}
            onChange={(event) => setTechnicianId(event.target.value)}
          >
            <option value="">Choose a technician</option>
            {technicians.data
              ?.filter((person) => person.id !== currentId)
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} · {person.role.name} · {person.activeRepairs} active
                </option>
              ))}
          </select>
          {!technicians.data?.some((person) => person.id !== currentId) && (
            <p>
              No eligible alternative found. Change the search or configure a staff role with repair
              work permission.
            </p>
          )}
          <p className="fine-print">Up to 50 matches. Search by name to narrow the list.</p>
        </>
      )}
      <label>
        Assignment reason
        <textarea name="reason" required minLength={10} maxLength={1000} />
      </label>
      {error && <ErrorNotice error={error} />}
      <button className="button" disabled={busy || !technicianId || technicians.isFetching}>
        {busy ? 'Assigning…' : 'Confirm technician'}
      </button>
    </form>
  );
}
