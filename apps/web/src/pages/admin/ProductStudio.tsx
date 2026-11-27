import { NavLink } from 'react-router-dom';
import { History, Images, Package } from 'lucide-react';
import type { User } from '../../services/types';
import RetailProductStudio from './RetailProductStudio';
import HistoryProductStudio from './HistoryProductStudio';
import MediaLibraryStudio from './MediaLibraryStudio';
import './product-studio.css';

export default function ProductStudio({
  mode,
  user,
}: {
  mode: 'retail' | 'history' | 'media';
  user: User;
}) {
  const tabs = [
    { slug: 'retail', title: 'Retail products', path: '/admin/product-studio', icon: Package },
    { slug: 'history', title: 'Apple history', path: '/admin/history-studio', icon: History },
    { slug: 'media', title: 'Image library', path: '/admin/media-library', icon: Images },
  ] as const;
  return (
    <div className="product-studio">
      <nav className="studio-tabs" aria-label="Product and media studio">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink key={tab.slug} to={tab.path} className={mode === tab.slug ? 'active' : ''}>
              <Icon size={17} />
              {tab.title}
            </NavLink>
          );
        })}
      </nav>
      {mode === 'retail' && <RetailProductStudio user={user} />}
      {mode === 'history' && <HistoryProductStudio user={user} />}
      {mode === 'media' && <MediaLibraryStudio user={user} />}
    </div>
  );
}
