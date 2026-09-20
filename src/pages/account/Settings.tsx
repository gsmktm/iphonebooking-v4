import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, post, date } from '../../services/api';
import type { Notification, Ticket, User } from '../../services/types';
import { ErrorNotice, Loading, Empty, Status } from '../../components/ui';
export function AccountNotifications() {
  const result = useQuery({
    queryKey: ['account', 'notifications'],
    queryFn: () => api<Notification[]>('/account/notifications'),
  });
  return (
    <>
      <h2>A little update for you.</h2>
      {result.isLoading ? (
        <Loading />
      ) : result.error ? (
        <ErrorNotice error={result.error} />
      ) : !result.data?.length ? (
        <Empty
          title="You’re all caught up."
          description="Order and service updates will appear here."
        />
      ) : (
        result.data.map((n) => (
          <article key={n.id} className={`record-card ${n.read ? 'read' : ''}`}>
            <div className="record-header">
              <h3>{n.title}</h3>
              <small>{date(n.createdAt)}</small>
            </div>
            <p>{n.body}</p>
            {!n.read && (
              <button
                className="text-button"
                onClick={async () => {
                  await api(`/account/notifications/${n.id}`, { method: 'PATCH', body: '{}' });
                  await result.refetch();
                }}
              >
                Mark as read
              </button>
            )}
          </article>
        ))
      )}
    </>
  );
}
export function AccountTickets() {
  const result = useQuery({
    queryKey: ['account', 'tickets'],
    queryFn: () => api<Ticket[]>('/account/tickets'),
  });
  const [error, setError] = useState<Error | null>(null),
    [busy, setBusy] = useState(false);
  return (
    <>
      <h2>A real conversation.</h2>
      <details className="record-card">
        <summary>Start a support conversation</summary>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            setBusy(true);
            try {
              await post('/account/tickets', {
                subject: data.get('subject'),
                message: data.get('message'),
              });
              form.reset();
              await result.refetch();
            } catch (e) {
              setError(e as Error);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Subject
            <input name="subject" required minLength={3} maxLength={150} />
          </label>
          <label>
            How can we help?
            <textarea name="message" required minLength={10} maxLength={4000} rows={4} />
          </label>
          <button className="button" disabled={busy}>
            Send your request
          </button>
        </form>
      </details>
      {error && <ErrorNotice error={error} />}{' '}
      {result.isLoading ? (
        <Loading />
      ) : result.error ? (
        <ErrorNotice error={result.error} />
      ) : !result.data?.length ? (
        <p className="muted">No conversations yet. Start one above whenever you need a hand.</p>
      ) : (
        result.data.map((t) => (
          <article className="record-card" key={t.id}>
            <div className="record-header">
              <h3>{t.subject}</h3>
              <Status value={t.status} />
            </div>
            {t.messages.map((m) => (
              <div className={`message ${m.staff ? 'staff' : ''}`} key={m.id}>
                <strong>{m.staff ? 'iPhoneBooking' : 'You'}</strong>
                <p>{m.body}</p>
                <small>{date(m.createdAt)}</small>
              </div>
            ))}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                setBusy(true);
                try {
                  await post(`/account/tickets/${t.id}/messages`, {
                    body: new FormData(form).get('body'),
                  });
                  form.reset();
                  await result.refetch();
                } catch (e) {
                  setError(e as Error);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Reply
                <textarea required name="body" rows={2} />
              </label>
              <button className="button secondary" disabled={busy}>
                Send reply
              </button>
            </form>
          </article>
        ))
      )}
    </>
  );
}
export function AccountSecurity() {
  const result = useQuery({
    queryKey: ['account', 'sessions'],
    queryFn: () =>
      api<{ id: string; userAgent: string; createdAt: string; expiresAt: string }[]>(
        '/auth/sessions',
      ),
  });
  const [error, setError] = useState<Error | null>(null);
  const qc = useQueryClient();
  return (
    <>
      <h2>Your security.</h2>
      <p>Review your active sessions. Revoking a session signs that browser out immediately.</p>
      {result.isLoading ? (
        <Loading />
      ) : result.error ? (
        <ErrorNotice error={result.error} />
      ) : (
        result.data?.map((s) => (
          <article key={s.id} className="record-card">
            <h3>{s.userAgent?.includes('Mobile') ? 'Mobile browser' : 'Browser session'}</h3>
            <p className="fine-print break-word">{s.userAgent ?? 'Unknown browser'}</p>
            <p>
              Started {date(s.createdAt)} · Expires {date(s.expiresAt)}
            </p>
            <button
              className="text-button"
              onClick={async () => {
                try {
                  await api(`/auth/sessions/${s.id}`, { method: 'DELETE' });
                  await result.refetch();
                  await qc.invalidateQueries({ queryKey: ['me'] });
                } catch (e) {
                  setError(e as Error);
                }
              }}
            >
              Revoke session
            </button>
          </article>
        ))
      )}
      {error && <ErrorNotice error={error} />}
      <PasswordForm />
    </>
  );
}
function PasswordForm() {
  const [error, setError] = useState<Error | null>(null),
    [success, setSuccess] = useState(false),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="record-card"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        setBusy(true);
        try {
          await post('/auth/password', {
            currentPassword: data.get('currentPassword'),
            newPassword: data.get('newPassword'),
          });
          form.reset();
          setSuccess(true);
        } catch (e) {
          setError(e as Error);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Change your password</h3>
      <label>
        Current password
        <input name="currentPassword" type="password" autoComplete="current-password" required />
      </label>
      <label>
        New password
        <input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
      </label>
      <button className="button secondary" disabled={busy}>
        Update password
      </button>
      {success && <p role="status">Password updated. Other sessions have been revoked.</p>}
      {error && <ErrorNotice error={error} />}
    </form>
  );
}
interface Address {
  id: string;
  label: string;
  province: string;
  district: string;
  municipality: string;
  ward: string;
  area: string;
  landmark: string;
  phone: string;
}
export function AccountAddresses() {
  const result = useQuery({
    queryKey: ['account', 'addresses'],
    queryFn: () => api<Address[]>('/account/addresses'),
  });
  const [error, setError] = useState<Error | null>(null),
    [busy, setBusy] = useState(false);
  return (
    <>
      <h2>Your saved places.</h2>
      {result.isLoading ? (
        <Loading />
      ) : result.error ? (
        <ErrorNotice error={result.error} />
      ) : (
        result.data?.map((a) => (
          <article className="record-card" key={a.id}>
            <h3>{a.label}</h3>
            <p>
              {a.area}, Ward {a.ward}
              <br />
              {a.municipality}, {a.district}, {a.province}
              <br />
              {a.phone}
            </p>
          </article>
        ))
      )}
      <details className="record-card">
        <summary>Add an address</summary>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = Object.fromEntries(new FormData(form));
            setBusy(true);
            try {
              await post('/account/addresses', data);
              form.reset();
              await result.refetch();
            } catch (e) {
              setError(e as Error);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-grid">
            {[
              'label',
              'province',
              'district',
              'municipality',
              'ward',
              'area',
              'landmark',
              'phone',
            ].map((field) => (
              <label key={field}>
                {field[0].toUpperCase() + field.slice(1)}
                <input
                  name={field}
                  required={field !== 'landmark'}
                  maxLength={field === 'ward' ? 3 : 100}
                />
              </label>
            ))}
          </div>
          <button className="button" disabled={busy}>
            Save address
          </button>
        </form>
      </details>
      {error && <ErrorNotice error={error} />}
    </>
  );
}
export function AccountProfile({ user }: { user: User }) {
  const [error, setError] = useState<Error | null>(null),
    [saved, setSaved] = useState(false);
  const qc = useQueryClient();
  return (
    <form
      className="record-card"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api('/account/profile', {
            method: 'PATCH',
            body: JSON.stringify({ name: new FormData(e.currentTarget).get('name') }),
          });
          setSaved(true);
          await qc.invalidateQueries({ queryKey: ['me'] });
        } catch (e) {
          setError(e as Error);
        }
      }}
    >
      <h2>A little about you.</h2>
      <label>
        Full name
        <input name="name" defaultValue={user.name} minLength={2} maxLength={100} required />
      </label>
      <label>
        Email address
        <input type="email" value={user.email} readOnly />
      </label>
      <p className="fine-print">
        Contact support to request an email change or account data export.
      </p>
      <button className="button">Save profile</button>
      {saved && <p role="status">Your profile is up to date.</p>}
      {error && <ErrorNotice error={error} />}
    </form>
  );
}
