import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  History,
  ImageOff,
  Search,
} from 'lucide-react';
import { api } from '../services/api';
import { ErrorNotice, Loading } from '../components/ui';
import './apple-history.css';

type Family = 'iphone' | 'ipad' | 'ipod' | 'mac';
type HistoryDevice = {
  id: string;
  slug: string;
  family: Family;
  name: string;
  introducedYear: number;
  modelNumbers: string | null;
  capacity: string | null;
  chip: string | null;
  sourceUrl: string;
  referenceUrl: string | null;
  imageUrl: string | null;
  imageSourceUrl: string | null;
  imageCredit: string | null;
  imageLicense: string | null;
  imageLicenseUrl: string | null;
  checkedAt: string;
};
type Page = {
  items: HistoryDevice[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
type Summary = {
  total: number;
  earliest: number | null;
  latest: number | null;
  families: { family: Family; count: number }[];
};

const families: { slug: Family; name: string; era: string }[] = [
  { slug: 'iphone', name: 'iPhone', era: 'From 2007' },
  { slug: 'mac', name: 'Mac', era: 'From 1984' },
  { slug: 'ipad', name: 'iPad', era: 'From 2010' },
  { slug: 'ipod', name: 'iPod', era: 'From 2001' },
];
const validFamilies: Family[] = families.map((item) => item.slug);

function ArchivePhoto({ device, large = false }: { device: HistoryDevice; large?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const label = `${device.name} (${device.introducedYear})`;
  const hasPhoto = Boolean(
    device.imageUrl && device.imageSourceUrl && device.imageUrl !== failedUrl,
  );
  return (
    <div
      className={`apple-history-photo apple-history-photo--${device.family} ${large ? 'apple-history-photo--large' : ''}`}
    >
      {hasPhoto ? (
        <img
          src={device.imageUrl ?? undefined}
          alt={`Licensed historical photograph: ${label}`}
          loading={large ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailedUrl(device.imageUrl)}
        />
      ) : (
        <div
          className="apple-history-placeholder"
          aria-label={
            device.imageUrl ? 'Historical photograph temporarily unavailable' : 'Archival photograph not yet licensed'
          }
        >
          <ImageOff aria-hidden="true" size={large ? 46 : 32} />
          <span>
            {device.family.toUpperCase()} · {device.introducedYear}
          </span>
        </div>
      )}
    </div>
  );
}

function ArchiveCredit({ device }: { device: HistoryDevice }) {
  if (!device.imageSourceUrl || !device.imageLicense) return null;
  return (
    <div className="apple-history-credit">
      Photo: {device.imageCredit || 'Wikimedia Commons contributor'} ·{' '}
      <a href={device.imageSourceUrl} rel="noopener noreferrer" target="_blank">
        Wikimedia Commons
      </a>{' '}
      ·{' '}
      {device.imageLicenseUrl ? (
        <a href={device.imageLicenseUrl} rel="noopener noreferrer" target="_blank">
          {device.imageLicense}
        </a>
      ) : (
        device.imageLicense
      )}
    </div>
  );
}

function HistoryCard({ device }: { device: HistoryDevice }) {
  return (
    <article className="apple-history-card">
      <Link
        to={`/history/apple/device/${device.slug}`}
        className="apple-history-card-photo"
        aria-label={`View history of ${device.name}`}
      >
        <ArchivePhoto device={device} />
      </Link>
      <div className="apple-history-card-content">
        <span className="apple-history-card-meta">
          <CalendarDays size={13} aria-hidden="true" /> {device.introducedYear} ·{' '}
          {device.family.toUpperCase()}
        </span>
        <h3>
          <Link to={`/history/apple/device/${device.slug}`}>{device.name}</Link>
        </h3>
        {device.modelNumbers && <p>Model ID: {device.modelNumbers}</p>}
        {device.chip && <p>Chip: {device.chip}</p>}
        {device.capacity && <p>Original capacities: {device.capacity}</p>}
        <div className="apple-history-card-bottom">
          <Link to={`/history/apple/device/${device.slug}`}>
            View history <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <span>ARCHIVE · NOT FOR SALE</span>
        </div>
      </div>
    </article>
  );
}

export default function AppleHistory() {
  const { family } = useParams<{ family?: string }>();
  const [filters, setFilters] = useSearchParams();
  const selectedFamily: Family | undefined =
    family && validFamilies.includes(family as Family) ? (family as Family) : undefined;
  const selectedYear = filters.get('year') ?? '';
  const query = filters.get('q') ?? '';
  const page = Math.max(1, Number(filters.get('page') || 1) || 1);
  const search = new URLSearchParams();
  if (selectedFamily) search.set('family', selectedFamily);
  if (selectedYear && /^\d{4}$/.test(selectedYear)) search.set('year', selectedYear);
  if (query.trim()) search.set('q', query.trim());
  search.set('page', String(page));
  search.set('pageSize', '48');

  const summary = useQuery({
    queryKey: ['apple-history-summary'],
    queryFn: () => api<Summary>('/apple-history/summary'),
    staleTime: 60 * 60 * 1000,
  });
  const history = useQuery({
    queryKey: ['apple-history', search.toString()],
    queryFn: () => api<Page>(`/apple-history?${search}`),
    staleTime: 15 * 60 * 1000,
  });
  const change = (key: string, value: string) => {
    setFilters((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });
  };
  const list = history.data?.items ?? [];
  const years = [...new Set(list.map((item) => item.introducedYear))];
  const collectionName = families.find((entry) => entry.slug === selectedFamily)?.name;

  return (
    <div className="apple-history">
      <header className="apple-history-hero">
        <div className="container">
          <span className="apple-history-eyebrow">APPLE DEVICE HISTORY · A RESEARCH ARCHIVE</span>
          <h1>
            Every era has <em>its own story.</em>
          </h1>
          <p>
            A sourced history of iPhone, Mac, iPad and iPod across generations. Find introduction
            years, Apple model identifiers and independently licensed photographs.
          </p>
          <div className="apple-history-hero-facts">
            <div>
              <strong>{summary.data?.total ?? '—'}</strong>
              <span>DEVICE RECORDS</span>
            </div>
            <div>
              <strong>{summary.data?.earliest ?? '—'}</strong>
              <span>EARLIEST YEAR</span>
            </div>
            <div>
              <strong>4</strong>
              <span>PRODUCT FAMILIES</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container apple-history-content">
        <nav className="apple-history-family-nav" aria-label="History families">
          <Link className={!selectedFamily ? 'selected' : ''} to="/history/apple">
            All devices
          </Link>
          {families.map((item) => (
            <Link
              key={item.slug}
              className={selectedFamily === item.slug ? 'selected' : ''}
              to={`/history/apple/${item.slug}`}
            >
              <strong>{item.name}</strong>
              <small>{item.era}</small>
              <span>
                {summary.data?.families.find((value) => value.family === item.slug)?.count ?? '—'}{' '}
                models
              </span>
            </Link>
          ))}
        </nav>

        <div className="apple-history-controls">
          <div>
            <span className="eyebrow">THE COLLECTION</span>
            <h2>
              {collectionName
                ? `${collectionName} through the years`
                : 'Browse the entire timeline.'}
            </h2>
            <p>
              Historical records are for education and identification only. They do not indicate
              stock, pricing or repair availability in Nepal.
            </p>
          </div>
          <div className="apple-history-fields">
            <label>
              <Search size={17} aria-hidden="true" />
              <span className="sr-only">Search historical models</span>
              <input
                type="search"
                value={query}
                onChange={(event) => change('q', event.target.value)}
                placeholder="Search model name"
                maxLength={100}
              />
            </label>
            <label>
              <span className="sr-only">Introduction year</span>
              <select value={selectedYear} onChange={(event) => change('year', event.target.value)}>
                <option value="">All years</option>
                {Array.from({ length: 2026 - 1984 + 1 }, (_, i) => 2026 - i).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {history.isLoading && <Loading />}
        {history.isError && (
          <ErrorNotice error={history.error} retry={() => void history.refetch()} />
        )}
        {history.isSuccess && (
          <>
            <p className="apple-history-results" role="status">
              {history.data.total} verified historical records · {years.length} years on this page
            </p>
            {list.length ? (
              <div className="apple-history-timeline">
                {years.map((year) => (
                  <section
                    key={year}
                    className="apple-history-year"
                    aria-labelledby={`year-${year}`}
                  >
                    <div className="apple-history-year-heading">
                      <span className="apple-history-year-rule" aria-hidden="true" />
                      <h3 id={`year-${year}`}>{year}</h3>
                      <span>
                        {list.filter((device) => device.introducedYear === year).length} devices
                      </span>
                    </div>
                    <div className="apple-history-grid">
                      {list
                        .filter((device) => device.introducedYear === year)
                        .map((device) => (
                          <HistoryCard key={device.id} device={device} />
                        ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <p className="apple-history-empty">
                No archived models match these filters. Try another year or model name.
              </p>
            )}
            {history.data.pageCount > 1 && (
              <div className="apple-history-pagination">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => change('page', String(page - 1))}
                >
                  <ArrowLeft size={17} /> Previous
                </button>
                <span>
                  Page {page} of {history.data.pageCount}
                </span>
                <button
                  type="button"
                  disabled={page >= history.data.pageCount}
                  onClick={() => change('page', String(page + 1))}
                >
                  Next <ArrowRight size={17} />
                </button>
              </div>
            )}
          </>
        )}
        <div className="apple-history-method">
          <History size={26} aria-hidden="true" />
          <div>
            <h3>Independent historical research</h3>
            <p>
              Model names and introduction years follow Apple's product identification records. The
              GSMArena Apple archive is linked as an additional reading reference for phones and
              tablets; its product photographs and descriptions have not been republished. Photos
              shown here come from individually licensed Wikimedia Commons files, with the author
              and license displayed on each detailed entry. Missing images are marked rather than
              replaced with unrelated or AI-generated device pictures.
            </p>
            <a
              href="https://www.gsmarena.com/apple-phones-48.php"
              target="_blank"
              rel="noopener noreferrer"
            >
              GSMArena Apple model index <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppleHistoryDetail() {
  const { slug } = useParams<{ slug: string }>();
  const result = useQuery({
    queryKey: ['apple-history-device', slug],
    queryFn: () => api<HistoryDevice>(`/apple-history/${encodeURIComponent(slug ?? '')}`),
    enabled: Boolean(slug),
  });
  if (result.isLoading)
    return (
      <div className="container page">
        <Loading />
      </div>
    );
  if (!result.data || result.error)
    return (
      <div className="container page">
        <ErrorNotice error={result.error ?? new Error('Historical device not found')} />
      </div>
    );
  const device = result.data;
  return (
    <article className="container page apple-history-detail">
      <Link to={`/history/apple/${device.family}`} className="apple-history-back">
        <ArrowLeft size={18} /> Back to {device.family.toUpperCase()} timeline
      </Link>
      <div className="apple-history-detail-grid">
        <div>
          <span className="apple-history-eyebrow">
            {device.family.toUpperCase()} ARCHIVE · {device.introducedYear}
          </span>
          <h1>{device.name}</h1>
          <p>Historical model reference, independently curated from Apple documentation.</p>
          <dl>
            <div>
              <dt>Introduced</dt>
              <dd>{device.introducedYear}</dd>
            </div>
            {device.modelNumbers && (
              <div>
                <dt>Model identifiers</dt>
                <dd>{device.modelNumbers}</dd>
              </div>
            )}
            {device.capacity && (
              <div>
                <dt>Original capacity</dt>
                <dd>{device.capacity}</dd>
              </div>
            )}
            {device.chip && (
              <div>
                <dt>Chip</dt>
                <dd>{device.chip}</dd>
              </div>
            )}
            <div>
              <dt>Status</dt>
              <dd>Historical reference · not a local retail offer</dd>
            </div>
          </dl>
          <div className="apple-history-detail-links">
            <a href={device.sourceUrl} target="_blank" rel="noopener noreferrer">
              Official Apple record <ArrowUpRight size={17} />
            </a>
            {device.referenceUrl && (
              <a href={device.referenceUrl} target="_blank" rel="noopener noreferrer">
                GSMArena index <ArrowUpRight size={17} />
              </a>
            )}
            {!device.imageSourceUrl && (
              <a
                href={`https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(device.name)}&title=Special:MediaSearch&type=image`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Search licensed archive photos <ArrowUpRight size={17} />
              </a>
            )}
          </div>
          <p className="apple-history-disclaimer">
            Prices, original retail configurations, remaining software support and service
            eligibility can vary by market and time. These records are not shopping listings.
          </p>
        </div>
        <div>
          <ArchivePhoto device={device} large />
          <ArchiveCredit device={device} />
        </div>
      </div>
    </article>
  );
}
