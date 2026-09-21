import type { Resource } from './resource-types';
export type { Resource, Action, Field, Row } from './resource-types';
export { getValue } from './resource-types';
export { actionsFor } from './resource-actions';
export { createAction } from './resource-create';
const columns = (...keys: string[]) =>
  keys.map((key) => ({
    key,
    label: key
      .split('.')
      .at(-1)!
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase()),
  }));
export const resources: Record<string, Resource> = {
  'device-risk-check': {
    title: 'Device risk checks',
    description:
      'Unavailable external registry data remains UNKNOWN. These records are not certifications.',
    permission: 'device.read',
    columns: columns('device.canonicalId', 'checkType', 'result', 'performedAt'),
  },
  'order-ledger': {
    title: 'Order money ledger',
    description:
      'Immutable charges, trade-in credits, received payments, and reservation voids. All amounts are paisa.',
    permission: 'payment.view',
    columns: [
      ...columns('order.number', 'kind'),
      { key: 'amount', label: 'Amount', money: true },
      ...columns('source', 'createdAt'),
    ],
  },
  reconciliation: {
    title: 'Order reconciliation',
    description:
      'Compares recorded ledger balances with order totals and confirmed payments. External bank and gateway statements are not connected.',
    permission: 'payment.view',
    columns: [
      ...columns('number', 'status', 'orderStatus'),
      { key: 'expectedBalance', label: 'Expected balance', money: true },
      { key: 'recordedBalance', label: 'Ledger balance', money: true },
      ...columns('flags'),
    ],
  },
  suppliers: {
    title: 'Suppliers',
    description: 'Verified purchasing contacts and their purchase orders.',
    permission: 'procurement.read',
    columns: columns('name', 'contact', 'email', 'phone', 'active'),
  },
  'purchase-orders': {
    title: 'Purchase orders',
    description: 'Approved configurations and quantities, with independent approval.',
    permission: 'procurement.read',
    columns: columns(
      'poNumber',
      'supplier.name',
      'status',
      'orderedQty',
      'receivedQty',
      'pendingQty',
    ),
  },
  receipts: {
    title: 'Goods received',
    description: 'Serialized receipts remain outside sellable stock until QC passes.',
    permission: 'inventory.read',
    columns: columns('grnNumber', 'po.poNumber', 'status', 'damageFound', 'createdAt'),
  },
  'device-event': {
    title: 'Device history',
    description: 'Append-only events from verified device workflows.',
    permission: 'device.read',
    columns: columns('device.canonicalId', 'eventType', 'timestamp', 'reference'),
  },
  parts: {
    title: 'Repair parts',
    description: 'Received parts, compatible models, and available quantities.',
    permission: 'inventory.read',
    columns: columns('sku', 'name', 'stock', 'binLocation', 'cost'),
  },
  'part-movements': {
    title: 'Part movements',
    description: 'Receipts and consumption, recorded once with their cost.',
    permission: 'inventory.read',
    columns: columns('part.sku', 'type', 'quantity', 'unitCost', 'repairId', 'createdAt'),
  },
  products: {
    title: 'Products',
    description: 'The collection, thoughtfully organized.',
    permission: 'product.read',
    columns: columns('name', 'category.name', 'slug', 'active'),
  },
  categories: {
    title: 'Categories',
    description: 'Product families across the ecosystem.',
    permission: 'product.read',
    columns: columns('name', 'slug', 'description'),
  },
  variants: {
    title: 'Configurations & pricing',
    description: 'Every configuration. Every price. One source of truth.',
    permission: 'product.read',
    columns: [
      ...columns('product.name', 'sku', 'color', 'storage'),
      { key: 'price', label: 'Price', money: true },
    ],
  },
  inventory: {
    title: 'Inventory',
    description: 'Available and reserved stock, by location.',
    permission: 'inventory.read',
    columns: columns('variant.product.name', 'variant.sku', 'store.name', 'available', 'reserved'),
  },
  'inventory-ledger': {
    title: 'Stock movements',
    description: 'An immutable history of inventory movement.',
    permission: 'inventory.read',
    columns: columns('type', 'quantity', 'reference', 'createdAt'),
  },
  units: {
    title: 'Serial registry',
    description: 'Physical devices and their lifecycle status. Identifiers are masked.',
    permission: 'inventory.read',
    columns: columns('variant.sku', 'serialLast4', 'status', 'id'),
  },
  orders: {
    title: 'Orders',
    description: 'From first reservation to device handover.',
    permission: 'order.read',
    columns: [
      ...columns('number', 'name'),
      { key: 'total', label: 'Total', money: true },
      { key: 'status', label: 'Status', status: true },
      ...columns('createdAt'),
    ],
  },
  bookings: {
    title: 'Pre-bookings',
    description: 'Customer reservations and allocation progress.',
    permission: 'order.read',
    columns: [
      ...columns('order.number', 'order.name'),
      { key: 'order.dueNow', label: 'Deposit', money: true },
      { key: 'status', label: 'Status', status: true },
    ],
  },
  payments: {
    title: 'Payments',
    description: 'Recorded payments. Browser redirects are never proof of payment.',
    permission: 'payment.view',
    columns: [
      ...columns('order.number', 'provider'),
      { key: 'amount', label: 'Amount', money: true },
      { key: 'status', label: 'Status', status: true },
      ...columns('externalId'),
    ],
  },
  refunds: {
    title: 'Refund requests',
    description: 'Requested refunds awaiting operational review.',
    permission: 'payment.view',
    columns: [
      ...columns('id'),
      { key: 'amount', label: 'Amount', money: true },
      ...columns('reason'),
      { key: 'status', label: 'Status', status: true },
    ],
  },
  repairs: {
    title: 'Repairs & service',
    description: 'Careful diagnostics. Clear quotes. Connected service history.',
    permission: 'repair.read',
    columns: [
      ...columns('model', 'user.name', 'issue'),
      { key: 'status', label: 'Status', status: true },
      ...columns('technician'),
    ],
  },
  'trade-ins': {
    title: 'Trade-ins & exchanges',
    description: 'Inspect devices, prepare offers, and connect the next upgrade.',
    permission: 'tradein.read',
    columns: [
      ...columns('model', 'user.name', 'condition'),
      { key: 'estimate', label: 'Estimate', money: true },
      { key: 'finalValue', label: 'Final value', money: true },
      { key: 'status', label: 'Status', status: true },
    ],
  },
  'valuation-rules': {
    title: 'Valuation rules',
    description: 'Server-side rules that power customer estimates.',
    permission: 'tradein.read',
    columns: [
      ...columns('model'),
      { key: 'baseValue', label: 'Base value', money: true },
      ...columns('goodPercent', 'fairPercent', 'damagedPercent', 'active'),
    ],
  },
  customers: {
    title: 'Customers',
    description: 'People at the center of your ecosystem.',
    permission: 'customer.read',
    columns: columns('name', 'email', 'role.name', 'createdAt'),
  },
  stores: {
    title: 'Stores',
    description: 'Locations, service capabilities, and customer information.',
    permission: 'store.read',
    columns: columns('name', 'address', 'hours', 'phone'),
  },
  content: {
    title: 'Content studio',
    description: 'Edit homepage campaigns, help articles, and policy content.',
    permission: 'content.read',
    columns: columns('title', 'slug', 'published', 'updatedAt'),
  },
  tickets: {
    title: 'Support conversations',
    description: 'Customer messages and private operational notes.',
    permission: 'support.read',
    columns: [
      ...columns('subject', 'user.name'),
      { key: 'status', label: 'Status', status: true },
      ...columns('createdAt'),
    ],
  },
  notifications: {
    title: 'Notifications',
    description: 'In-app updates generated by business workflows.',
    permission: 'support.read',
    columns: columns('title', 'body', 'read', 'createdAt'),
  },
  roles: {
    title: 'Roles & permissions',
    description: 'Backend-enforced operational access.',
    permission: 'role.read',
    columns: columns('name', 'permissions'),
  },
  'audit-logs': {
    title: 'Audit trail',
    description: 'Sensitive changes, recorded with actor and request reference.',
    permission: 'audit.read',
    columns: columns('action', 'entity', 'entityId', 'actorId', 'createdAt'),
  },
  jobs: {
    title: 'Background jobs',
    description: 'Queued integrations and job processing records.',
    permission: 'system.read',
    columns: columns('type', 'status', 'attempts', 'runAt'),
  },
  subscribers: {
    title: 'Launch notifications',
    description: 'Email preferences captured with explicit consent.',
    permission: 'content.read',
    columns: columns('email', 'createdAt'),
  },
  'device-identity': {
    title: 'Device identity',
    description: 'Device identifiers and manufacturer metadata.',
    permission: 'device.read',
    columns: columns(
      'canonicalId',
      'product.name',
      'unit.serialLast4',
      'unit.stock.store.name',
      'status',
    ),
  },
  'trade-in-quote': {
    title: 'Trade-in quotes',
    description: 'Quotes generated for trade-in devices.',
    permission: 'tradein.read',
    columns: columns(
      'tradeInId',
      'version',
      'stage',
      'previousValue',
      'newValue',
      'status',
      'createdAt',
    ),
  },
  'repair-qc': {
    title: 'Repair QC',
    description: 'Recorded functional checks and their approving technician.',
    permission: 'repair.read',
    columns: columns('repairId', 'status', 'checkedBy', 'approvedBy', 'checkedAt'),
  },
  'repair-warranty': {
    title: 'Repair warranty',
    description: 'Service warranties issued from the approved quotation after completion.',
    permission: 'repair.read',
    columns: columns('repairId', 'status', 'startDate', 'expiryDate'),
  },
};
