import type { Action, Field } from './resource-types';
export function createAction(resource: string): Action | undefined {
  const f = (key: string, label: string, type: Field['type'] = 'text'): Field => ({
    key,
    label,
    type,
    required: true,
  });
  const fields: Record<string, Field[]> = {
    roles: [f('name', 'Role name'), f('permissions', 'Permission names (JSON array)', 'json')],
    suppliers: [
      f('name', 'Supplier name'),
      f('email', 'Contact email'),
      f('phone', 'Phone'),
      f('contact', 'Contact person'),
    ],
    'purchase-orders': [
      f('supplierId', 'Supplier ID'),
      f('items', 'Lines: JSON array of variantId, quantity and unitCost (paisa)', 'json'),
      f('tax', 'Tax (paisa)', 'number'),
      f('freight', 'Freight (paisa)', 'number'),
      f('invoiceRef', 'Supplier invoice or quotation reference'),
    ],
    parts: [
      f('sku', 'Part SKU'),
      f('name', 'Part name'),
      f('cost', 'Unit cost (paisa)', 'number'),
      f('binLocation', 'Bin location'),
      f('productIds', 'Compatible product IDs (JSON array)', 'json'),
    ],
    products: [
      f('name', 'Product name'),
      f('slug', 'URL slug'),
      f('tagline', 'Tagline'),
      f('description', 'Description', 'textarea'),
      f('categoryId', 'Category ID'),
      f('image', 'Local image path, e.g. /images/hero.webp'),
      f('specs', 'Specifications (JSON object)', 'json'),
      f('active', 'Published', 'checkbox'),
      f('featured', 'Featured', 'checkbox'),
    ],
    categories: [
      f('name', 'Category name'),
      f('slug', 'URL slug'),
      f('description', 'Description'),
      f('image', 'Image key or local image path'),
    ],
    variants: [
      f('productId', 'Product ID'),
      f('sku', 'SKU'),
      f('color', 'Color'),
      f('colorHex', 'Color hex, e.g. #aabbcc'),
      f('storage', 'Configuration label'),
      f('price', 'Selling price (paisa)', 'number'),
      f('deposit', 'Booking deposit (paisa)', 'number'),
      f('preorder', 'Pre-booking', 'checkbox'),
    ],
    inventory: [
      f('variantId', 'Variant ID'),
      f('storeId', 'Store ID'),
      f('quantity', 'Opening stock quantity', 'number'),
      f('reference', 'Supplier receipt reference'),
    ],
    stores: [
      f('name', 'Store name'),
      f('slug', 'URL slug'),
      f('address', 'Address'),
      f('hours', 'Opening hours'),
      f('phone', 'Contact phone'),
      f('services', 'Services (JSON array of strings)', 'json'),
    ],
    content: [
      f('title', 'Title'),
      f('slug', 'URL slug'),
      f('description', 'Description', 'textarea'),
      f('blocks', 'Content blocks (JSON array)', 'json'),
      f('published', 'Published', 'checkbox'),
    ],
    'valuation-rules': [f('model', 'Device model'), f('baseValue', 'Base value (paisa)', 'number')],
  };
  const permissions: Record<string, string> = {
    roles: 'role.manage',
    parts: 'inventory.adjust',
    products: 'product.create',
    categories: 'product.create',
    variants: 'product.create',
    inventory: 'inventory.adjust',
    stores: 'store.update',
    content: 'content.update',
    'valuation-rules': 'tradein.update',
    suppliers: 'procurement.create',
    'purchase-orders': 'procurement.create',
  };
  if (!fields[resource]) return undefined;
  return {
    label: `Create ${resource === 'content' ? 'page' : resource === 'inventory' ? 'stock record' : resource.replace(/s$/, '')}`,
    path: `/admin/${resource}`,
    method: 'POST',
    permission: permissions[resource],
    fields: fields[resource],
    initial: { specs: {}, blocks: [], services: [], active: true },
    help: 'Create the record with validated data. Copy related IDs from their respective modules. Amounts use integer paisa.',
  };
}
