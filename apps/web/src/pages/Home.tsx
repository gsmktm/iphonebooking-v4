import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { HomeFeed } from '../services/types';
import { ErrorNotice } from '../components/ui';
import HomeHero from '../features/home/HomeHero';
import {
  HomeTrustBar,
  HomeQuickActions,
  HomeCollection,
  HomeWhy,
  HomeCare,
  HomeNetwork,
  HomeIntelligence,
  HomeJourney,
  HomeReviews,
  HomeJournal,
  HomeFinalCTA,
} from '../features/home/home-sections';
import { HomeExplore, HomeFinderIntro, HomeSpotlights } from '../features/home/HomeDiscovery';
import DeviceFinder from '../features/home/DeviceFinder';
import HomeDeviceFrames from '../features/home/HomeDeviceFrames';
import { OfficialAppleModels } from '../features/apple/OfficialAppleModels';
import HomePersonalShelf from '../features/home/HomePersonalShelf';
import ProductPreview, {
  type DeviceSelection,
  type PreviewDevice,
} from '../features/home/ProductPreview';
import '../features/home/home.css';
import '../features/home/home-discovery.css';

export default function Home() {
  const [finderOpen, setFinderOpen] = useState(false);
  const [selection, setSelection] = useState<DeviceSelection | null>(null);
  const finderButton = useRef<HTMLButtonElement>(null);
  const preview: PreviewDevice = (product, variantId) => {
    const trigger = finderOpen
      ? finderButton.current
      : document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setFinderOpen(false);
    setSelection({ product, variantId, trigger });
  };
  const feed = useQuery({
    queryKey: ['home'],
    queryFn: ({ signal }) => api<HomeFeed>('/home', { signal }),
    staleTime: 30000,
  });
  const data = feed.data;
  const visible = (key: string) =>
    data?.sections.find((block) => block.key === key)?.enabled !== false;
  const section = (key: string, title: string, body = '', href?: string) => {
    const block = data?.sections.find((item) => item.key === key);
    return { title: block?.title || title, body: block?.body || body, href: block?.href || href };
  };
  const iphones = section(
    'iphones',
    'Find your next chapter.',
    'Choose your iPhone. Make it yours. Explore the configurations in our current collection.',
  );
  const ecosystem = section(
    'ecosystem',
    'Better, together.',
    'The devices you love. Connected to the things you do.',
  );
  const spotlights = section(
    'spotlights',
    'Big ideas. Beautiful possibilities.',
    'Meet the devices that give your everyday a little more room.',
  );
  const finder = section(
    'finder',
    'Which device feels like you?',
    'Tell us your budget and device family. We’ll find configurations in the current collection that fit.',
  );
  const saved = section(
    'saved',
    'Still on your mind?',
    'A few favorites. A fresh look. Your next chapter is waiting.',
  );
  const why = section(
    'why',
    'Considered from the first click.',
    'A clearer way to discover, reserve and care for your next device.',
  );
  const tradein = section(
    'trade-in',
    'Good things deserve a second life.',
    'Start with an estimate. After inspection, review your offer and decide what comes next.',
  );
  const repair = section(
    'repair',
    'A little care. A lot more life.',
    'Tell us what needs attention. Follow your repair, review the quote and approve the work from your account.',
  );
  const network = section(
    'network',
    'From the Himalayas. To your world.',
    'Find a pickup location or explore joining our retailer network. Built around the people who use it.',
  );
  const intelligence = section(
    'intelligence',
    'A clearer view of your next move.',
    'Compare catalog configurations and explore published international price observations, with sources you can inspect.',
  );
  const journey = section('journey', 'Your next device, in three steps.');
  const reviews = section(
    'reviews',
    'Every experience has a story.',
    'Reviews from customers who received their devices.',
  );
  const news = section(
    'news',
    'A little inspiration. A lot to discover.',
    'Buying guides, device care and stories from our community.',
  );
  const final = section(
    'final',
    'Your next chapter starts here.',
    'Discover a device that fits your world. We’ll help you take the next step.',
  );
  return (
    <div className="luxe-content home-v2">
      <HomeHero
        title={data?.hero?.title}
        body={data?.hero?.body}
        href={data?.hero?.href}
        products={data?.products}
        discoveryHref={
          visible('iphones') ? '#collection' : visible('ecosystem') ? '#explore-devices' : '/store'
        }
      />
      <HomeTrustBar />
      <HomeDeviceFrames data={data} onPreview={preview} />
      <div className="container">
        <OfficialAppleModels compact />
      </div>
      <HomeQuickActions />
      {!!feed.error && (
        <div className="container">
          <ErrorNotice error={feed.error} retry={() => void feed.refetch()} />
        </div>
      )}
      {visible('spotlights') && (
        <HomeSpotlights data={data} copy={spotlights} onPreview={preview} />
      )}
      {visible('iphones') && (
        <HomeCollection
          data={data}
          copy={iphones}
          loading={feed.isLoading}
          failed={Boolean(feed.error)}
        />
      )}
      {visible('finder') && (
        <HomeFinderIntro
          copy={finder}
          onOpen={() => setFinderOpen(true)}
          ready={Boolean(data?.categories.length)}
          buttonRef={finderButton}
        />
      )}
      {visible('ecosystem') && <HomeExplore data={data} copy={ecosystem} onPreview={preview} />}
      {visible('saved') && <HomePersonalShelf copy={saved} onPreview={preview} />}
      {visible('why') && <HomeWhy copy={why} />}
      {(visible('trade-in') || visible('repair')) && (
        <HomeCare
          tradein={visible('trade-in') ? tradein : undefined}
          repair={visible('repair') ? repair : undefined}
        />
      )}
      {visible('network') && <HomeNetwork data={data} copy={network} />}
      {visible('intelligence') && <HomeIntelligence data={data} copy={intelligence} />}
      {visible('journey') && <HomeJourney copy={journey} />}
      {visible('reviews') && <HomeReviews data={data} copy={reviews} />}
      {visible('news') && <HomeJournal data={data} copy={news} />}
      {visible('final') && <HomeFinalCTA copy={final} />}
      {finderOpen && data && (
        <DeviceFinder
          categories={data.categories}
          onClose={() => setFinderOpen(false)}
          onPreview={preview}
        />
      )}
      {selection && <ProductPreview selection={selection} onClose={() => setSelection(null)} />}
    </div>
  );
}
