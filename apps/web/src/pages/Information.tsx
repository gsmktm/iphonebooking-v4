import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Search, MapPin, Clock, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import type { Store, ContentPage } from '../services/types';
import { PageIntro, ErrorNotice, Empty, Loading, ButtonLink } from '../components/ui';
export function Support() {
  const [search, setSearch] = useState('');
  const result = useQuery({
    queryKey: ['articles'],
    queryFn: () => api<ContentPage[]>('/articles'),
  });
  const articles = result.data?.filter((a) =>
    (a.title + a.description).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="container page">
      <PageIntro
        eyebrow="REAL PEOPLE. REAL CARE."
        title="A little help. A lot of possibility."
        description="From your first question to your next upgrade, we’re here."
      />
      <div className="support-search">
        <Search size={22} />
        <input
          aria-label="Search help articles"
          placeholder="What can we help you with?"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {result.isLoading ? (
        <Loading />
      ) : result.error ? (
        <ErrorNotice error={result.error} />
      ) : (
        <div className="support-grid">
          {articles?.map((a) => (
            <Link className="record-card" key={a.slug} to={`/support/${a.slug}`}>
              <h2>
                {a.title}
                <ArrowUpRight size={20} />
              </h2>
              <p>{a.description}</p>
              <span className="text-button">
                Find out more
                <ArrowRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      )}
      <div className="buying-guide">
        <div>
          <h2>Sometimes, a conversation is better.</h2>
          <p>Open a ticket and keep your conversation connected to your account.</p>
        </div>
        <ButtonLink to="/account/tickets">Talk to us</ButtonLink>
      </div>
    </div>
  );
}
export function Content() {
  const { slug } = useParams();
  const result = useQuery({
    queryKey: ['content', slug],
    queryFn: () => api<ContentPage>(`/content/${slug}`),
  });
  if (result.isLoading)
    return (
      <div className="container page">
        <Loading />
      </div>
    );
  if (result.error || !result.data)
    return (
      <div className="container page">
        <ErrorNotice error={result.error} />
      </div>
    );
  const page = result.data;
  return (
    <article className="container page narrow content-page">
      <PageIntro eyebrow="IPHONEBOOKING" title={page.title} description={page.description} />
      {page.blocks.map((b, i) => (
        <section key={i}>
          <h2>{b.title}</h2>
          <p>{b.body}</p>
          {b.href && <ButtonLink to={b.href}>Explore more</ButtonLink>}
        </section>
      ))}
      <Link className="text-button" to="/support">
        Back to support
        <ArrowRight size={16} />
      </Link>
    </article>
  );
}
export function Stores() {
  const { slug } = useParams();
  const result = useQuery({ queryKey: ['stores'], queryFn: () => api<Store[]>('/stores') });
  const stores = result.data?.filter((s) => !slug || s.slug === slug);
  return (
    <div className="container page">
      <PageIntro
        eyebrow="CLOSER THAN YOU THINK"
        title="A real place. A warm welcome."
        description="Meet your next device. Get a little advice. Let’s make a connection."
      />
      {result.isLoading ? (
        <Loading />
      ) : result.error ? (
        <ErrorNotice error={result.error} />
      ) : (
        <div className="stores-grid">
          {stores?.map((s) => (
            <article className="store-card" key={s.id}>
              <div className="store-art">
                <MapPin size={60} strokeWidth={0.8} />
                <span>KATHMANDU, NEPAL</span>
              </div>
              <div>
                <h2>{s.name}</h2>
                <p>
                  <MapPin size={17} />
                  {s.address}
                </p>
                <p>
                  <Clock size={17} />
                  {s.hours}
                </p>
                <div className="store-services">
                  {s.services.map((service) => (
                    <span key={service}>{service}</span>
                  ))}
                </div>
                <ButtonLink to="/account/tickets">Arrange your visit</ButtonLink>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
export function NotFound() {
  return (
    <div className="container page">
      <Empty
        title="A little off the beaten path."
        description="We couldn’t find this page. There’s still plenty to discover."
      />
    </div>
  );
}
