export const MAX_UPLOAD_SIZE = 6 * 1024 * 1024;

export type UploadedAsset = {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  sourceType: 'OWNED' | 'LICENSED';
  sourceUrl: string | null;
  sourceCredit: string;
  license: string | null;
  licenseUrl: string | null;
  altText: string;
  createdAt: string;
};

export type RetailProduct = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  image: string;
  gallery: string[];
  badge: string | null;
  active: boolean;
  featured: boolean;
  specs: Record<string, unknown>;
  updatedAt: string;
  categoryId: string;
  category: { id: string; name: string; slug: string };
  variants: {
    id: string;
    sku: string;
    color: string;
    colorHex: string;
    storage: string;
    price: number;
    comparePrice: number | null;
    deposit: number;
    preorder: boolean;
    image: string | null;
  }[];
};

export type HistoricProduct = {
  id: string;
  slug: string;
  family: 'iphone' | 'mac' | 'ipad' | 'ipod';
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
  gallery: string[];
  checkedAt: string;
  updatedAt: string;
};
