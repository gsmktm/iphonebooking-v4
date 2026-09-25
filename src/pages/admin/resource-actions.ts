import type { Action, Field, Row } from './resource-types';
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
