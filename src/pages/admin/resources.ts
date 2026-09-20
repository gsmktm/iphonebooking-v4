export interface Field {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'json' | 'checkbox';
  required?: boolean;
}
export interface Action {
  label: string;
  path: string;
  method: 'POST' | 'PATCH';
  fields: Field[];
  initial?: Record<string, unknown>;
  permission: string;
  help?: string;
}
export type Row = Record<string, unknown>;
export interface Resource {
  title: string;
  description: string;
  permission: string;
  columns: { key: string; label: string; money?: boolean; status?: boolean }[];
}
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
  'device-passport': {
    title: 'Device passports',
    description: 'Ownership documents linked to devices.',
    permission: 'device.read',
    columns: columns('device.model', 'document.type', 'verified', 'createdAt'),
  },
  'device-provenance': {
    title: 'Device provenance',
    description: 'Supply chain origin of each device.',
    permission: 'device.read',
    columns: columns('device.model', 'source', 'date', 'batch', 'createdAt'),
  },
  'condition-evidence': {
    title: 'Condition evidence',
    description: 'Photos and media capturing device condition.',
    permission: 'device.read',
    columns: columns('device.model', 'condition', 'note', 'createdAt'),
  },
  'condition-snapshot': {
    title: 'Condition snapshots',
    description: 'Snapshot of device condition at a point in time.',
    permission: 'device.read',
    columns: columns('device.model', 'value', 'condition', 'createdAt'),
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
  'refurbished-device': {
    title: 'Refurbished stock',
    description: 'Refurbished inventory with grade and quality data.',
    permission: 'inventory.read',
    columns: columns(
      'device.model',
      'refurbished.grade',
      'refurbished.qualityScore',
      'costPrice',
      'price',
      'status',
      'createdAt',
    ),
  },
  'repair-bom': {
    title: 'Repair BOM',
    description: 'Bill of materials and parts for repairs.',
    permission: 'repair.read',
    columns: columns('repair.model', 'repair.status', 'part.name', 'part.supplier', 'createdAt'),
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
  'pos-session': {
    title: 'POS sessions',
    description: 'Point-of-sale register sessions.',
    permission: 'order.read',
    columns: columns(
      'order.number',
      'pos.sessionRef',
      'openedAt',
      'closedAt',
      'total',
      'createdAt',
    ),
  },
  'scan-log': {
    title: 'Scan log',
    description: 'History of scanned barcodes and identifiers.',
    permission: 'inventory.read',
    columns: columns('barcode', 'variant.sku', 'user.name', 'device.imei', 'location', 'createdAt'),
  },
  document: {
    title: 'Documents',
    description: 'Uploaded files and attachments.',
    permission: 'document.read',
    columns: columns('name', 'category', 'mime', 'size', 'entity', 'entityId', 'createdAt'),
  },
  appointment: {
    title: 'Appointments',
    description: 'Scheduled support and service appointments.',
    permission: 'repair.read',
    columns: columns('user.name', 'store.name', 'topic', 'status', 'scheduledFor', 'createdAt'),
  },
  'fulfillment-promise': {
    title: 'Fulfillment',
    description: 'Promises and SLAs around order fulfillment.',
    permission: 'order.read',
    columns: columns(
      'order.number',
      'fulfillment.type',
      'targetDate',
      'committedAt',
      'status',
      'createdAt',
    ),
  },
  'reverse-logistics': {
    title: 'Reverse logistics',
    description: 'Returns, replacements, and recovery workflows.',
    permission: 'inventory.read',
    columns: columns('reason', 'rmaNumber', 'receivedAt', 'resolution', 'status', 'createdAt'),
  },
  'courier-provider': {
    title: 'Couriers',
    description: 'Courier integrations and providers.',
    permission: 'system.read',
    columns: columns('name', 'integration', 'testMode', 'rate', 'status', 'createdAt'),
  },
  'courier-shipment': {
    title: 'Shipments',
    description: 'Tracked outbound shipments and labels.',
    permission: 'system.read',
    columns: columns(
      'courier.name',
      'order.number',
      'tracking.number',
      'deliveryAt',
      'status',
      'createdAt',
    ),
  },
  'allocation-rule': {
    title: 'Allocation rules',
    description: 'Rules governing stock allocation.',
    permission: 'inventory.read',
    columns: columns('type', 'variant.sku', 'minStock', 'maxStock', 'updatedAt', 'createdAt'),
  },
  'allocation-entry': {
    title: 'Allocation',
    description: 'Individual stock allocation records.',
    permission: 'inventory.read',
    columns: columns(
      'allocationRule.type',
      'allocationRule.variant',
      'user.name',
      'quantity',
      'createdAt',
    ),
  },
  'purchase-request': {
    title: 'Purchase requests',
    description: 'Requests to procure new stock.',
    permission: 'system.read',
    columns: columns(
      'variant.sku',
      'store.name',
      'requestedQty',
      'approvedQty',
      'status',
      'createdAt',
    ),
  },
  'purchase-order': {
    title: 'Purchase orders',
    description: 'Issued purchase orders to suppliers.',
    permission: 'system.read',
    columns: columns(
      'supplier.name',
      'variant.sku',
      'quantity',
      'expectedAt',
      'status',
      'total',
      'createdAt',
    ),
  },
  supplier: {
    title: 'Suppliers',
    description: 'Device and parts suppliers.',
    permission: 'system.read',
    columns: columns('name', 'email', 'category', 'country', 'paymentTerms', 'status', 'createdAt'),
  },
  user: {
    title: 'Users',
    description: 'Accounts and authentication metadata.',
    permission: 'customer.read',
    columns: columns('name', 'email', 'role.name', 'company', 'status', 'lastLoginAt', 'createdAt'),
  },
  warehouse: {
    title: 'Warehouses',
    description: 'Storage locations and capacity.',
    permission: 'inventory.read',
    columns: columns('name', 'address', 'capacity', 'utilization', 'status', 'createdAt'),
  },
  'price-intelligence': {
    title: 'Price intelligence',
    description: 'Market and competitor price analysis.',
    permission: 'product.read',
    columns: columns(
      'product.name',
      'market.name',
      'ourPrice',
      'competitorPrice',
      'competitor.name',
      'observedAt',
      'createdAt',
    ),
  },
  promotion: {
    title: 'Promotions',
    description: 'Marketing promotions and campaigns.',
    permission: 'product.read',
    columns: columns('name', 'type', 'discount', 'startsAt', 'endsAt', 'status', 'createdAt'),
  },
  'shipping-partner': {
    title: 'Shipping partners',
    description: 'Shipping service providers.',
    permission: 'system.read',
    columns: columns('name', 'region', 'rate', 'transitDays', 'status', 'createdAt'),
  },
  'shipping-rate': {
    title: 'Shipping rates',
    description: 'Calculated shipping rates.',
    permission: 'system.read',
    columns: columns(
      'shippingPartner.name',
      'order.number',
      'amount',
      'weight',
      'distance',
      'createdAt',
    ),
  },
  marketplace: {
    title: 'Marketplaces',
    description: 'Third-party marketplaces connected.',
    permission: 'system.read',
    columns: columns('name', 'integration', 'syncAt', 'orderCount', 'status', 'createdAt'),
  },
  'marketplace-listing': {
    title: 'Marketplace listings',
    description: 'Listings published to marketplaces.',
    permission: 'system.read',
    columns: columns(
      'marketplace.name',
      'product.name',
      'price',
      'status',
      'lastSyncAt',
      'createdAt',
    ),
  },
  'loyalty-program': {
    title: 'Loyalty programs',
    description: 'Customer loyalty and rewards.',
    permission: 'customer.read',
    columns: columns('name', 'type', 'tier', 'pointsBalance', 'status', 'createdAt'),
  },
  'loyalty-tiers': {
    title: 'Loyalty tiers',
    description: 'Tier thresholds and benefits.',
    permission: 'customer.read',
    columns: columns('loyaltyProgram.name', 'tier', 'minPoints', 'benefits', 'status', 'createdAt'),
  },
  return: {
    title: 'Returns',
    description: 'Return and exchange request records.',
    permission: 'tradein.read',
    columns: columns('order.number', 'user.name', 'reason', 'refundAmount', 'status', 'createdAt'),
  },
  refund: {
    title: 'Refunds',
    description: 'Processed refund records.',
    permission: 'payment.view',
    columns: columns('order.number', 'amount', 'reason', 'processedAt', 'status', 'createdAt'),
  },
  subscription: {
    title: 'Subscriptions',
    description: 'Recurring billing subscriptions.',
    permission: 'payment.view',
    columns: columns('user.name', 'plan', 'status', 'nextBillingAt', 'createdAt'),
  },
  template: {
    title: 'Templates',
    description: 'Document and communication templates.',
    permission: 'content.read',
    columns: columns('name', 'subject', 'category', 'version', 'createdAt'),
  },
  ticket: {
    title: 'Tickets',
    description: 'Support tickets from customers.',
    permission: 'support.read',
    columns: columns('subject', 'user.name', 'category', 'priority', 'status', 'createdAt'),
  },
  'webhook-endpoint': {
    title: 'Webhooks',
    description: 'Outbound webhook integrations.',
    permission: 'system.read',
    columns: columns('url', 'event', 'status', 'lastTriggeredAt', 'createdAt'),
  },
  'reconciliation-mismatch': {
    title: 'Reconciliation mismatches',
    description: 'Discrepancies detected during reconciliation.',
    permission: 'payment.view',
    columns: columns('type', 'externalId', 'amount', 'source', 'detectedAt', 'status', 'createdAt'),
  },
  'device-pairing': {
    title: 'Device pairing',
    description: 'Linked device relationships (e.g. paired accessories).',
    permission: 'device.read',
    columns: columns('primaryDevice.imei', 'secondaryDevice.imei', 'pairedAt', 'createdAt'),
  },
  warranty: {
    title: 'Warranties',
    description: 'Warranty policies and coverage.',
    permission: 'device.read',
    columns: columns(
      'device.model',
      'policy.number',
      'startsAt',
      'expiresAt',
      'coverage',
      'status',
      'createdAt',
    ),
  },
  review: {
    title: 'Reviews',
    description: 'Customer reviews of devices and services.',
    permission: 'content.read',
    columns: columns('product.name', 'user.name', 'rating', 'title', 'status', 'createdAt'),
  },
  'support-article': {
    title: 'Support articles',
    description: 'Help center knowledge base articles.',
    permission: 'content.read',
    columns: columns('title', 'category', 'author.name', 'views', 'rating', 'status', 'createdAt'),
  },
  notification: {
    title: 'Notifications',
    description: 'System-generated user notifications.',
    permission: 'support.read',
    columns: columns('user.name', 'title', 'body', 'read', 'createdAt'),
  },
  cart: {
    title: 'Cart',
    description: 'Shopping cart state for active sessions.',
    permission: 'product.read',
    columns: columns('user.name', 'variant.sku', 'quantity', 'price', 'createdAt'),
  },
  wishlist: {
    title: 'Wishlist',
    description: 'Saved wishlists for future purchase.',
    permission: 'product.read',
    columns: columns('user.name', 'product.name', 'variant.sku', 'createdAt'),
  },
  'gift-card': {
    title: 'Gift cards',
    description: 'Gift card inventory and balances.',
    permission: 'payment.view',
    columns: columns('code', 'balance', 'denomination', 'status', 'createdAt'),
  },
  feedback: {
    title: 'Feedback',
    description: 'User feedback and suggestions.',
    permission: 'customer.read',
    columns: columns('user.name', 'rating', 'message', 'category', 'status', 'createdAt'),
  },
  report: {
    title: 'Reports',
    description: 'Generated analytics reports.',
    permission: 'report.read',
    columns: columns('title', 'type', 'dateRange', 'generatedBy.name', 'status', 'createdAt'),
  },
  analytics: {
    title: 'Analytics',
    description: 'Platform analytics and metrics.',
    permission: 'report.read',
    columns: columns('metric', 'value', 'dimension', 'date', 'createdAt'),
  },
  'price-history': {
    title: 'Price history',
    description: 'Historical price changes for products.',
    permission: 'product.read',
    columns: columns(
      'product.name',
      'variant.sku',
      'oldPrice',
      'newPrice',
      'changedBy.name',
      'createdAt',
    ),
  },
  access: {
    title: 'Access',
    description: 'Access logs and login history.',
    permission: 'system.read',
    columns: columns('user.name', 'ip', 'userAgent', 'success', 'createdAt'),
  },
  'audit-detail': {
    title: 'Audit details',
    description: 'Detailed audit entries.',
    permission: 'audit.read',
    columns: columns(
      'auditLog.action',
      'auditLog.entity',
      'field',
      'oldValue',
      'newValue',
      'createdAt',
    ),
  },
  inventoryAdjustment: {
    title: 'Inventory adjustments',
    description: 'Stock adjustment records.',
    permission: 'inventory.read',
    columns: columns(
      'inventory.variant.sku',
      'inventory.store.name',
      'quantity',
      'reference',
      'type',
      'createdAt',
    ),
  },
  'device-history': {
    title: 'Device history',
    description: 'Lifecycle events for each device.',
    permission: 'device.read',
    columns: columns('device.imei', 'event', 'note', 'actor.name', 'createdAt'),
  },
  'user-device': {
    title: 'User devices',
    description: 'Devices owned by customers.',
    permission: 'customer.read',
    columns: columns(
      'user.name',
      'device.imei',
      'device.model',
      'status',
      'purchasedAt',
      'createdAt',
    ),
  },
  shipping: {
    title: 'Shipping',
    description: 'Shipping details for orders.',
    permission: 'order.read',
    columns: columns(
      'order.number',
      'carrier',
      'tracking.number',
      'deliveredAt',
      'status',
      'createdAt',
    ),
  },
  order: {
    title: 'Order',
    description: 'Order records and metadata.',
    permission: 'order.read',
    columns: columns('number', 'user.name', 'total', 'status', 'createdAt'),
  },
  'payment-method': {
    title: 'Payment methods',
    description: 'Customer saved payment methods.',
    permission: 'payment.view',
    columns: columns('user.name', 'type', 'last4', 'brand', 'isDefault', 'createdAt'),
  },
  'checkout-session': {
    title: 'Checkout sessions',
    description: 'Checkout session state.',
    permission: 'order.read',
    columns: columns('order.number', 'session.id', 'status', 'total', 'createdAt'),
  },
  'price-rule': {
    title: 'Price rules',
    description: 'Dynamic pricing rules.',
    permission: 'product.read',
    columns: columns('name', 'type', 'discount', 'appliesTo', 'active', 'createdAt'),
  },
  'stock-movement': {
    title: 'Stock movements',
    description: 'Individual stock movement records.',
    permission: 'inventory.read',
    columns: columns('variant.sku', 'store.name', 'quantity', 'reference', 'type', 'createdAt'),
  },
  'device-price': {
    title: 'Device prices',
    description: 'Device pricing by model and variant.',
    permission: 'product.read',
    columns: columns('device.model', 'variant.sku', 'price', 'deposit', 'costPrice', 'createdAt'),
  },
  reviewReply: {
    title: 'Review replies',
    description: 'Replies to customer reviews.',
    permission: 'content.read',
    columns: columns('review.product.name', 'user.name', 'reply', 'createdAt'),
  },
  returnItem: {
    title: 'Return items',
    description: 'Individual items within a return request.',
    permission: 'tradein.read',
    columns: columns(
      'return.order.number',
      'variant.sku',
      'reason',
      'refundAmount',
      'status',
      'createdAt',
    ),
  },
  refundRequest: {
    title: 'Refund requests',
    description: 'Refund requests awaiting review.',
    permission: 'payment.view',
    columns: columns('order.number', 'user.name', 'amount', 'reason', 'status', 'createdAt'),
  },
  shippingLabel: {
    title: 'Shipping labels',
    description: 'Generated shipping labels.',
    permission: 'system.read',
    columns: columns('order.number', 'carrier', 'tracking.number', 'labelUrl', 'createdAt'),
  },
  taxRate: {
    title: 'Tax rates',
    description: 'Regional tax rate configuration.',
    permission: 'system.read',
    columns: columns('region', 'rate', 'category', 'effectiveFrom', 'createdAt'),
  },
};
export function actionsFor(resource: string, row: Row): Action[] {
  const id = String(row.id),
    path = `/admin/${resource}/${id}`;
  const text = (key: string, label: string, type: Field['type'] = 'text'): Field => ({
    key,
    label,
    type,
    required: true,
  });
  switch (resource) {
    case 'products':
      return [
        {
          label: 'Edit product',
          path,
          method: 'PATCH',
          permission: 'product.update',
          initial: row,
          fields: [
            text('name', 'Product name'),
            text('slug', 'URL slug'),
            text('tagline', 'Tagline'),
            text('description', 'Description', 'textarea'),
            text('active', 'Published', 'checkbox'),
            text('featured', 'Featured', 'checkbox'),
          ],
        },
      ];
    case 'variants':
      return [
        {
          label: 'Update pricing',
          path,
          method: 'PATCH',
          permission: 'product.update',
          initial: row,
          help: 'Money is stored in paisa: NPR 1 = 100 paisa. Every change is audited.',
          fields: [
            text('price', 'Selling price (paisa)', 'number'),
            text('deposit', 'Booking deposit (paisa)', 'number'),
            text('preorder', 'Pre-booking enabled', 'checkbox'),
          ],
        },
      ];
    case 'inventory':
      return [
        {
          label: 'Adjust inventory',
          path: `${path}/adjust`,
          method: 'POST',
          permission: 'inventory.adjust',
          fields: [
            text('quantity', 'Quantity change (+ or −)', 'number'),
            text('reason', 'Reason for adjustment', 'textarea'),
          ],
          help: 'Adjustments change available stock and append a stock ledger entry.',
        },
      ];
    case 'orders':
      return [
        {
          label: 'Allocate physical units',
          path: `${path}/allocate`,
          method: 'POST',
          permission: 'order.fulfill',
          fields: [text('unitIds', 'Inventory unit IDs (JSON array)', 'json')],
          initial: { unitIds: [] },
          help: 'Assign available serials after a deposit or full payment. Units are reserved exclusively for this order.',
        },
        {
          label: 'Update fulfillment stage',
          path: `${path}/status`,
          method: 'PATCH',
          permission: 'order.fulfill',
          fields: [
            text('status', 'Next stage'),
            text('note', 'Customer-visible update', 'textarea'),
          ],
          help: 'PAID → PROCESSING → READY_FOR_DISPATCH → SHIPPED → OUT_FOR_DELIVERY. Use Fulfill to mark delivery and create ownership.',
        },
        {
          label: 'Record store payment',
          path: `${path}/collect`,
          method: 'POST',
          permission: 'payment.collect',
          help: 'Only record funds actually received at the store. The receipt reference must be unique.',
          fields: [
            text('amount', 'Amount received (paisa)', 'number'),
            text('reference', 'Store receipt reference'),
          ],
        },
        {
          label: 'Fulfill & assign devices',
          path: `${path}/fulfill`,
          method: 'POST',
          permission: 'order.fulfill',
          fields: [text('unitIds', 'Inventory unit IDs (JSON array)', 'json')],
          initial: { unitIds: [] },
          help: 'Requires full payment and a connected customer account. Assign one available unit per item.',
        },
      ];
    case 'roles':
      return [
        {
          label: 'Edit role permissions',
          path,
          method: 'PATCH',
          permission: 'role.manage',
          fields: [
            text('name', 'Role name'),
            text('permissions', 'Permissions (JSON array)', 'json'),
          ],
          initial: row,
          help: 'Changing this role signs out affected users. Your own role and system administrator roles are protected. Use permission names from the API permission catalog.',
        },
      ];
    case 'customers':
      return [
        {
          label: 'Assign staff role',
          path: `${path}/role`,
          method: 'PATCH',
          permission: 'role.manage',
          fields: [text('roleId', 'Role ID or null (JSON)', 'json')],
          initial: { roleId: null },
          help: 'Changing a role revokes this user’s active sessions. You cannot change your own role or grant permissions above your own.',
        },
      ];
    case 'device-identity':
      return [
        {
          label: 'Check external risk status',
          path: `${path}/risk-check`,
          method: 'POST',
          permission: 'device.inspect',
          fields: [],
          help: 'The external registry is not configured. This records UNKNOWN rather than assuming a clear result. View Device risk checks for the recorded outcome.',
        },
      ];
    case 'purchase-orders':
      return [
        {
          label: 'Approve purchase',
          path: `${path}/approve`,
          method: 'POST',
          permission: 'procurement.approve',
          fields: [text('reason', 'Approval reason', 'textarea')],
          help: 'The approver must be different from the staff member who created this purchase.',
        },
        {
          label: 'Receive serialized devices',
          path: `${path}/receive`,
          method: 'POST',
          permission: 'inventory.receive',
          fields: [
            text('reference', 'Unique goods receipt number'),
            text('storeId', 'Receiving store ID'),
            text('units', 'Devices: JSON array of variantId and serial', 'json'),
          ],
          initial: { units: [] },
          help: 'Units enter QC_PENDING. Receiving alone does not make them available for purchase.',
        },
      ];
    case 'receipts':
      return [
        {
          label: 'Record receiving QC',
          path: `${path}/qc`,
          method: 'POST',
          permission: 'inventory.qc',
          fields: [
            text('passed', 'All devices passed receiving inspection', 'checkbox'),
            text('notes', 'Inspection findings', 'textarea'),
          ],
          help: 'Check passed only when every unit in this receipt passed inspection. Otherwise the complete receipt is quarantined.',
        },
      ];
    case 'parts':
      return [
        {
          label: 'Receive parts',
          path: `${path}/receive`,
          method: 'POST',
          permission: 'inventory.adjust',
          fields: [
            text('quantity', 'Quantity', 'number'),
            text('unitCost', 'Unit cost (paisa)', 'number'),
            text('reference', 'Unique supplier receipt reference'),
          ],
        },
      ];
    case 'repairs':
      return [
        {
          label: 'Consume repair part',
          path: `${path}/parts`,
          method: 'POST',
          permission: 'repair.update',
          fields: [
            text('partId', 'Compatible part ID'),
            text('quantity', 'Quantity', 'number'),
            text('reference', 'Unique usage reference'),
          ],
          help: 'Deducts available part stock and records the cost against this approved repair.',
        },
        {
          label: 'Update service stage',
          path: `${path}/status`,
          method: 'PATCH',
          permission: 'repair.update',
          fields: [
            text('status', 'Next status'),
            text('note', 'Customer-visible update', 'textarea'),
            { key: 'technician', label: 'Technician' },
          ],
          help: 'Valid sequence: REQUESTED → RECEIVED → INSPECTION → DIAGNOSIS. After quote approval: APPROVED → REPAIR_IN_PROGRESS → QUALITY_CONTROL → READY → COMPLETED.',
        },
        {
          label: 'Prepare repair quote',
          path: `${path}/quote`,
          method: 'POST',
          permission: 'repair.update',
          fields: [
            text('diagnosis', 'Diagnosis', 'textarea'),
            text('parts', 'Parts (paisa)', 'number'),
            text('labor', 'Labor (paisa)', 'number'),
            text('warrantyDays', 'Warranty days', 'number'),
          ],
          help: 'Complete diagnosis before preparing a quote. The customer must approve it.',
        },
      ];
    case 'trade-ins':
      return [
        {
          label: 'Complete inspection',
          path: `${path}/inspect`,
          method: 'PATCH',
          permission: 'tradein.update',
          fields: [
            text('finalValue', 'Final inspected value (paisa)', 'number'),
            text('reason', 'Why this value was offered', 'textarea'),
          ],
          help: 'The customer will review and accept or reject this offer.',
        },
      ];
    case 'valuation-rules':
      return [
        {
          label: 'Edit valuation rule',
          path,
          method: 'PATCH',
          permission: 'tradein.update',
          initial: row,
          fields: [
            text('baseValue', 'Base value (paisa)', 'number'),
            text('goodPercent', 'Good condition (%)', 'number'),
            text('fairPercent', 'Fair condition (%)', 'number'),
            text('damagedPercent', 'Damaged condition (%)', 'number'),
            text('active', 'Active', 'checkbox'),
          ],
        },
      ];
    case 'content':
      return [
        {
          label: 'Edit content',
          path,
          method: 'PATCH',
          permission: 'content.update',
          initial: row,
          fields: [
            text('title', 'Page title'),
            text('description', 'SEO description', 'textarea'),
            text('blocks', 'Content blocks', 'json'),
            text('published', 'Published', 'checkbox'),
          ],
          help: 'Blocks support hero, text, faq and cta. Each needs type, title and body; href must be a local path.',
        },
      ];
    case 'tickets':
      return [
        {
          label: 'Reply or add a note',
          path: `${path}/messages`,
          method: 'POST',
          permission: 'support.update',
          fields: [
            text('body', 'Message', 'textarea'),
            text('internal', 'Private staff note', 'checkbox'),
          ],
        },
      ];
    default:
      return [];
  }
}
export const getValue = (row: Row, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (value, key) => (value && typeof value === 'object' ? (value as Row)[key] : undefined),
      row,
    );
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
    'device-identity': 'device.create',
    'device-passport': 'device.create',
    'device-provenance': 'device.create',
    'condition-evidence': 'device.create',
    'condition-snapshot': 'device.create',
    'trade-in-quote': 'tradein.update',
    refurbished: 'inventory.adjust',
    repairs: 'repair.update',
    'pos-session': 'order.fulfill',
    appointments: 'repair.update',
    'fulfillment-promise': 'order.fulfill',
    couriers: 'system.update',
    'allocation-rule': 'inventory.adjust',
    purchaseRequests: 'system.create',
    suppliers: 'procurement.create',
    'purchase-orders': 'procurement.create',
    users: 'user.create',
    warehouses: 'system.create',
    promotions: 'product.create',
    subscriptions: 'subscription.create',
    templates: 'content.create',
    tickets: 'support.create',
    reconciliation: 'payment.view',
    warranties: 'device.create',
    reviews: 'content.create',
    cart: 'order.create',
    wishlists: 'order.create',
    'gift-card': 'payment.view',
    feedback: 'customer.create',
    reports: 'report.create',
    'price-history': 'product.update',
    access: 'system.read',
    'device-history': 'device.read',
    shipping: 'shipping.create',
    orders: 'order.create',
    'payment-method': 'payment.create',
    'price-rule': 'product.create',
    'stock-movement': 'inventory.create',
    'device-price': 'product.create',
    'return-item': 'tradein.create',
    'refund-request': 'payment.create',
    'shipping-label': 'shipping.create',
    'tax-rate': 'system.create',
    'audit-detail': 'audit.read',
    inventoryAdjustments: 'inventory.adjust',
    'user-device': 'device.create',
    'checkout-session': 'order.create',
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
