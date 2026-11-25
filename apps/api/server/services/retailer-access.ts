import type { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { AppError } from '../core.js';
import { db } from '../db.js';

export const retailerRoles = ['OWNER', 'MANAGER', 'VIEWER'] as const;
export type RetailerRole = (typeof retailerRoles)[number];
export const retailerSummary = {
  id: true,
  code: true,
  name: true,
  region: true,
  status: true,
} satisfies Prisma.RetailerSelect;
export const storeSummary = {
  id: true,
  slug: true,
  name: true,
  address: true,
  hours: true,
  phone: true,
  services: true,
} satisfies Prisma.StoreSelect;

/** Resolve access from current database state, including inside write transactions. */
export async function retailerAccess(
  userId: string,
  retailerId: string,
  roles: readonly RetailerRole[] = retailerRoles,
  client: Prisma.TransactionClient = db,
) {
  const member = await client.retailerMember.findFirst({
    where: {
      userId,
      retailerId,
      active: true,
      user: { status: 'ACTIVE' },
      retailer: { status: 'ACTIVE' },
    },
    select: { id: true, role: true, retailer: { select: retailerSummary } },
  });
  if (!member || !retailerRoles.includes(member.role as RetailerRole))
    throw new AppError(403, 'RETAILER_ACCESS_DENIED', 'Active retailer membership is required.');
  if (!roles.includes(member.role as RetailerRole))
    throw new AppError(
      403,
      'RETAILER_ROLE_REQUIRED',
      'Your retailer role cannot make this change.',
    );
  return member;
}

/** Each store has its own assignment boundary. Older orders never enter a tenant view. */
export async function retailerOrderScope(retailerId: string, storeId?: string) {
  const stores = await db.store.findMany({
    where: { retailerId, ...(storeId ? { id: storeId } : {}) },
    select: { id: true, retailerAssignedAt: true, stocks: { select: { id: true } } },
  });
  if (storeId && !stores.length)
    throw new AppError(404, 'NOT_FOUND', 'This store was not found in your retailer workspace.');
  return {
    OR: stores
      .filter((store) => store.retailerAssignedAt !== null)
      .map((store) => ({
        stockId: { in: store.stocks.map((stock) => stock.id) },
        order: { createdAt: { gte: store.retailerAssignedAt! } },
      })),
  } satisfies Prisma.OrderItemWhereInput;
}

export function retailerAudit(
  tx: Prisma.TransactionClient,
  req: Request,
  action: string,
  entity: string,
  entityId: string,
  after: Prisma.InputJsonValue,
  before?: Prisma.InputJsonValue,
) {
  return tx.auditLog.create({
    data: {
      actorId: req.user!.id,
      requestId: req.requestId,
      action,
      entity,
      entityId,
      before,
      after,
    },
  });
}
