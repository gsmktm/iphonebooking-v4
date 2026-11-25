import { AppError, type Identity } from '../core.js';
export const permissionCatalog = [
  'product.read',
  'product.create',
  'product.update',
  'inventory.read',
  'inventory.adjust',
  'inventory.receive',
  'inventory.qc',
  'order.read',
  'order.fulfill',
  'payment.view',
  'payment.collect',
  'repair.read',
  'repair.update',
  'repair.assign',
  'repair.qc',
  'tradein.read',
  'tradein.update',
  'customer.read',
  'store.read',
  'store.update',
  'retailer.read',
  'retailer.manage',
  'content.read',
  'content.update',
  'review.read',
  'review.moderate',
  'support.read',
  'support.update',
  'role.read',
  'role.manage',
  'audit.read',
  'system.read',
  'report.read',
  'device.read',
  'device.inspect',
  'procurement.read',
  'procurement.create',
  'procurement.approve',
] as const;
export function assertGrantable(actor: Identity, permissions: string[]) {
  if (
    !actor.role?.permissions.includes('*') &&
    permissions.some((p) => !actor.role?.permissions.includes(p))
  )
    throw new AppError(
      403,
      'PRIVILEGE_ESCALATION',
      'You may only grant or manage permissions already assigned to you.',
    );
}
