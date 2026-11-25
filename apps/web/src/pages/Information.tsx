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
        <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      ) : (
        <>
          {' '}
          {articles?.length === 0 && (
            <p className="notice">
              No guides match your search. Try a different term or contact support below.
            </p>
          )}
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
        </>
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
        <ErrorNotice error={result.error} retry={() => void result.refetch()} />
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
        <ErrorNotice error={result.error} retry={() => void result.refetch()} />
      ) : (
        <>
          {' '}
          {!stores?.length && (
            <Empty
              title="No store found."
              description="Browse the current store list or contact support."
              link="/stores"
              action="All stores"
            />
          )}
          <div className="stores-grid">
            {stores?.map((s) => (
              <article className="store-card" key={s.id}>
                <div className="store-art">
                  <MapPin size={60} strokeWidth={0.8} />
                  <span>STORE LOCATION</span>
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
                  {s.phone && /^[+0-9 ()-]{7,25}$/.test(s.phone) && (
                    <a className="text-button" href={`tel:${s.phone.replace(/[^+0-9]/g, '')}`}>
                      {s.phone}
                    </a>
                  )}
                  <ButtonLink to="/account/tickets">Arrange your visit</ButtonLink>
                </div>
              </article>
            ))}
          </div>
        </>
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

export function CompanyPage({ slug }: { slug: string }) {
  const page = useQuery({
    queryKey: ['company', slug],
    queryFn: () => api<ContentPage>(`/content/${slug}`),
    retry: false,
  });
  const titles: Record<string, string> = {
    'about-us': 'From the Himalayas to the World.',
    'contact-us': 'A conversation starts here.',
    careers: 'Build what comes next.',
    'press-room': 'The latest from iPhoneBooking.',
    history: 'Our story.',
    cookies: 'Your privacy preferences.',
    accessibility: 'An experience for everyone.',
  };
  return (
    <div className="container page narrow">
      <PageIntro
        eyebrow="IPHONEBOOKING WORLD"
        title={page.data?.title ?? titles[slug] ?? 'Information'}
        description={page.data?.description}
      />
      {page.isLoading ? (
        <Loading />
      ) : page.data ? (
        page.data.blocks.map((b, i) => (
          <section key={i}>
            <h2>{b.title}</h2>
            <p>{b.body}</p>
            {b.href && <ButtonLink to={b.href}>Find out more</ButtonLink>}
          </section>
        ))
      ) : slug === 'about-us' ? (
        <p>
          iPhoneBooking connects device discovery, comparison, reservations, trade-in, and repair in
          one account. Our store network is rooted in Nepal.
        </p>
      ) : slug === 'contact-us' ? (
        <p>
          Start a private support conversation from your account, or find contact details and
          opening hours for your store.
        </p>
      ) : (
        <p>This information has not been published yet. Contact the team for current details.</p>
      )}
      <div className="button-row">
        <ButtonLink to="/account/tickets">Contact support</ButtonLink>
        <ButtonLink secondary to="/stores">
          Find a store
        </ButtonLink>
      </div>
      {page.error && !['about-us', 'contact-us'].includes(slug) && (
        <ErrorNotice error={page.error} retry={() => void page.refetch()} />
      )}
    </div>
  );
}
export function Blog() {
  const [page, setPage] = useState(1);
  const posts = useQuery({
    queryKey: ['blog', page],
    queryFn: () => api<{ rows: ContentPage[]; pages: number }>(`/blog?page=${page}`),
  });
  return (
    <div className="container page">
      <PageIntro
        eyebrow="THE IPHONEBOOKING JOURNAL"
        title="Ideas for what comes next."
        description="Device guides, updates, and perspectives from our team."
      />
      {posts.isLoading ? (
        <Loading />
      ) : posts.error ? (
        <ErrorNotice error={posts.error} retry={() => void posts.refetch()} />
      ) : posts.data?.rows.length ? (
        <div className="support-grid">
          {posts.data.rows.map((p) => (
            <Link className="record-card" key={p.slug} to={`/blog/${p.slug}`}>
              <span className="eyebrow">JOURNAL</span>
              <h2>{p.title}</h2>
              <p>{p.description}</p>
              <span className="text-button">
                Read article
                <ArrowUpRight size={17} />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <Empty
          title="Good stories take a little time."
          description="Published articles will appear here. Explore our buying and service guides in the meantime."
          link="/support"
          action="Explore guides"
        />
      )}
      {(posts.data?.pages ?? 0) > 1 && (
        <div className="panel-actions">
          <button
            className="button secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            className="button secondary"
            disabled={page === posts.data?.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
export function BlogArticle() {
  const { slug } = useParams();
  const article = useQuery({
    queryKey: ['blog', slug],
    queryFn: () => api<ContentPage>(`/blog/${slug}`),
    retry: false,
  });
  return (
    <article className="container page narrow content-page">
      {article.isLoading ? (
        <Loading />
      ) : article.error ? (
        <ErrorNotice error={article.error} />
      ) : (
        article.data && (
          <>
            <PageIntro
              eyebrow="JOURNAL"
              title={article.data.title}
              description={article.data.description}
            />
            {article.data.blocks.map((b, i) => (
              <section key={i}>
                <h2>{b.title}</h2>
                <p>{b.body}</p>
                {b.href && <ButtonLink to={b.href}>Explore more</ButtonLink>}
              </section>
            ))}
          </>
        )
      )}
      <ButtonLink secondary to="/blog">
        Back to journal
      </ButtonLink>
    </article>
  );
}
