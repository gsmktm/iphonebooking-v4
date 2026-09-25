import { useLocation } from 'react-router-dom';
import { CategoryPage } from '../features/category/CategoryPage';
import { CONFIGS, type CategorySlug } from '../features/category/config';

export default function Category() {
  const path = useLocation().pathname.slice(1);
  const slug = (path in CONFIGS ? path : 'store') as CategorySlug;
  return <CategoryPage slug={slug} />;
}
