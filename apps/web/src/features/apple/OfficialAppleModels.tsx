import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, BadgeCheck, ExternalLink, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api';
import { ErrorNotice, Loading } from '../../components/ui';
import './official-apple.css';

type Category = 'iphone' | 'mac' | 'ipad' | 'watch' | 'airpods' | 'accessories';

type AppleReference = {
  id: string;
  category: Category;
  name: string;
  summary: string;
  officialUrl: string;
  sourceCheckedAt: string;
};

const categoryLabels: Record<Category, string> = {
  iphone: 'iPhone',
  mac: 'Mac',
  ipad: 'iPad',
  watch: 'Apple Watch',
  airpods: 'AirPods',
  accessories: 'Accessories',
};

const categories: Category[] = [
  'iphone',
  'mac',
  'ipad',
  'watch',
  'airpods',
  'accessories',
];

function checkedDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.valueOf())
    ? 'Date not recorded'
    : date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function OfficialAppleModels({
  category,
  compact = false,
}: {
  category?: Category;
  compact?: boolean;
}) {
  const references = useQuery({
    queryKey: ['official-apple-models', category ?? 'all'],
    queryFn: () =>
      api<AppleReference[]>(
        '/official-apple-models' + (category ? `?category=${encodeURIComponent(category)}` : ''),
      ),
    staleTime: 60 * 60 * 1000,
  });

  // On large landing pages show one current official reference from each family;
  // category pages show all records in that family.
  const models = compact
    ? categories
        .map((family) => references.data?.find((item) => item.category === family))
        .filter((item): item is AppleReference => Boolean(item))
    : (references.data ?? []);

  return (
    <section
      id={category ? 'apple-references' : undefined}
      className={`official-apple-models ${compact ? 'official-apple-models--compact' : ''}`}
      aria-labelledby={category ? `official-${category}-title` : 'official-apple-models-title'}
      data-apple-reference-section
    >
      <header className="official-apple-models-header">
        <div>
          <span className="official-apple-eyebrow">
            <BadgeCheck size={15} aria-hidden="true" /> SOURCE: APPLE.COM
          </span>
          <h2 id={category ? `official-${category}-title` : 'official-apple-models-title'}>
            {category ? `Explore ${categoryLabels[category]} models.` : 'Discover the Apple line-up.'}
          </h2>
          <p>
            Model names and product information are checked against Apple’s website. This is
            an independent reference, not an Apple Store or a claim of Nepal availability.
          </p>
        </div>
        <a
          href={category ? (category === 'accessories' ? 'https://www.apple.com/shop/accessories/all' : `https://www.apple.com/${category === 'watch' ? 'watch' : category}/`) : 'https://www.apple.com/'}
          className="official-apple-category-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Visit Apple.com <ExternalLink size={16} aria-hidden="true" />
        </a>
      </header>
      {references.isLoading && <Loading />}
      {references.error && (
        <ErrorNotice
          error={references.error}
          retry={() => void references.refetch()}
        />
      )}
      {models.length > 0 && (
        <div className="official-apple-models-grid">
          {models.map((model, index) => (
            <article
              className={`official-apple-model official-apple-model--${model.category}`}
              key={model.id}
              data-apple-reference={model.id}
            >
              <div className="official-apple-model-top">
                <span className="official-apple-model-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="official-apple-model-category">{categoryLabels[model.category]}</span>
              </div>
              <div className="official-apple-model-body">
                <h3>{model.name}</h3>
                <p>{model.summary}</p>
              </div>
              <div className="official-apple-model-footer">
                <span>
                  <ShieldAlert size={13} aria-hidden="true" />
                  Local price & stock not confirmed
                </span>
                <a
                  href={model.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Read Apple specifications for ${model.name} (opens new tab)`}
                >
                  Apple specs <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
      {models.length > 0 && (
        <p className="official-apple-models-legal">
          Source pages reviewed {checkedDate(models[0].sourceCheckedAt)}.
          Apple product names belong to Apple Inc. iPhoneBooking is an independent service;
          Apple.com information is not a Nepal retail offer. Product photos require
          permission or independently licensed originals.
        </p>
      )}
    </section>
  );
}
