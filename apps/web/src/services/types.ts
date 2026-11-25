export interface Variant {
  id: string;
  sku: string;
  color: string;
  colorHex: string;
  storage: string;
  price: number;
  comparePrice?: number;
  deposit: number;
  preorder: boolean;
  image?: string;
  stock: { id: string; available: number; reserved: number; store?: Store }[];
}
export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
}
export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  gallery: string[];
  category: Category;
  categoryId: string;
  specs: Record<string, string>;
  badge?: string;
  featured: boolean;
  active: boolean;
  variants: Variant[];
}
export interface Store {
  id: string;
  slug: string;
  name: string;
  address: string;
  hours: string;
  phone: string;
  services: string[];
}
export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  permissions: string[];
}
export interface ContentPage {
  id: string;
  slug: string;
  title: string;
  description: string;
  published: boolean;
  updatedAt: string;
  blocks: {
    type: string;
    key?: string;
    title: string;
    body: string;
    href?: string;
    enabled?: boolean;
  }[];
}
export interface CustomerReview {
  id: string;
  rating: number;
  title: string;
  body: string;
  author: string;
  verifiedPurchase: boolean;
  createdAt: string;
  product: { name: string; slug: string };
}
export interface HomeFeed {
  products: Product[];
  iphones: Product[];
  categories: Category[];
  stores: Store[];
  hero: ContentPage['blocks'][number] | null;
  sections: ContentPage['blocks'];
  articles: { title: string; slug: string; description: string; updatedAt: string }[];
  reviews: CustomerReview[];
  reviewSummary: { total: number; average: number | null };
  marketSummary: { sources: number; countries: number };
}
export interface CatalogResult {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}
export interface History {
  id: string;
  status: string;
  note: string;
  createdAt: string;
}
export interface Payment {
  id: string;
  amount: number;
  status: string;
  provider: string;
  refunds?: { status: string }[];
}
export interface Order {
  id: string;
  number: string;
  name: string;
  email: string;
  total: number;
  dueNow: number;
  status: string;
  createdAt: string;
  trackingToken?: string;
  history: History[];
  booking?: { id: string; status: string };
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    variant: Variant & { product: Product };
  }[];
  payments: Payment[];
}
export interface Repair {
  id: string;
  model: string;
  issue: string;
  description: string;
  status: string;
  createdAt: string;
  history: History[];
  quotes: {
    id: string;
    diagnosis: string;
    parts: number;
    labor: number;
    total: number;
    warrantyDays: number;
    status: string;
    decidedAt?: string;
  }[];
}
export interface TradeIn {
  tradeInQuotes?: {
    id: string;
    version: string;
    stage: string;
    newValue: number;
    difference: number | null;
    reasonCodes: string[];
  }[];
  id: string;
  model: string;
  storage: string;
  condition: string;
  estimate: number;
  finalValue?: number;
  status: string;
  kind: string;
  createdAt: string;
}
export interface Device {
  id: string;
  warrantyUntil: string;
  createdAt: string;
  unit: { serialLast4: string; variant: Variant & { product: Product } };
  repairs: Repair[];
  tradeIns: TradeIn[];
}
export interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
export interface Ticket {
  id: string;
  subject: string;
  status: string;
  messages: { id: string; body: string; staff: boolean; createdAt: string }[];
}
