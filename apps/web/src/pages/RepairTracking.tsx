import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Wrench } from 'lucide-react';
import { api, date, money } from '../services/api';
import type { Repair, User } from '../services/types';
import { PageIntro, Loading, ErrorNotice, Status, ButtonLink } from '../components/ui';

export default function RepairTracking() {
  const { ticketId } = useParams();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<User | null>('/auth/me') });
  const repair = useQuery({
    queryKey: ['repair', ticketId, me.data?.id],
    queryFn: () => api<Repair>(`/repairs/${encodeURIComponent(ticketId!)}`),
    enabled: Boolean(ticketId && me.data),
  });
  if (me.isLoading)
    return (
      <div className="container page">
        <Loading />
      </div>
    );
  if (me.error)
    return (
      <div className="container page">
        <ErrorNotice error={me.error} retry={() => void me.refetch()} />
      </div>
    );
  if (!me.data)
    return (
      <div className="container page narrow">
        <PageIntro
          eyebrow="YOUR DEVICE CARE"
          title="Sign in to follow your repair."
          description="Repair progress and quotations are private to the account that booked the service."
        />
        <ButtonLink to={`/login?redirect=${encodeURIComponent(`/repair/${ticketId}`)}`}>
          Sign in
        </ButtonLink>
      </div>
    );
  return (
    <div className="container page narrow">
      <PageIntro
        eyebrow="YOUR DEVICE CARE"
        title={repair.data ? `${repair.data.model}. A little care.` : 'Your repair journey.'}
        description="Follow every recorded service update. Quotations need your approval before work begins."
      />
      {repair.isLoading ? (
        <Loading />
      ) : repair.error ? (
        <ErrorNotice error={repair.error} retry={() => void repair.refetch()} />
      ) : (
        repair.data && (
          <>
            <article className="record-card">
              <div className="panel-actions">
                <Wrench size={24} aria-hidden="true" />
                <Status value={repair.data.status} />
              </div>
              <h2>{repair.data.issue}</h2>
              <p>{repair.data.description}</p>
              <p className="fine-print">
                Requested {date(repair.data.createdAt)} · Reference {repair.data.id}
              </p>
              <ol className="repair-timeline">
                {repair.data.history.map((event) => (
                  <li key={event.id}>
                    <Status value={event.status} />
                    <p>{event.note}</p>
                    <time dateTime={event.createdAt}>{date(event.createdAt)}</time>
                  </li>
                ))}
              </ol>
            </article>
            {!!repair.data.quotes.length && (
              <section className="record-card">
                <h2>Your quotations</h2>
                {repair.data.quotes.map((quote) => (
                  <div className="notice" key={quote.id}>
                    <Status value={quote.status} />
                    <p>{quote.diagnosis}</p>
                    <strong>{money(quote.total)}</strong>
                    <p className="fine-print">
                      Service warranty: {quote.warrantyDays} days, as quoted.
                    </p>
                  </div>
                ))}
                <ButtonLink to="/account/repairs">Review quotations in your account</ButtonLink>
              </section>
            )}
            <div className="button-row">
              <ButtonLink secondary to="/account/repairs">
                All your repairs
              </ButtonLink>
              <Link className="text-button" to="/account/tickets">
                Contact support
              </Link>
            </div>
          </>
        )
      )}
    </div>
  );
}
