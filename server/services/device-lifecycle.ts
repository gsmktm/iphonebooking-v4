import type { Prisma } from '@prisma/client';
import { AppError, owned } from '../core.js';

export type Actor = { id: string; requestId: string };
export async function ensureIdentity(tx: Prisma.TransactionClient, unitId: string) {
  const unit = owned(
    await tx.inventoryUnit.findUnique({ where: { id: unitId }, include: { variant: true } }),
  );
  return tx.deviceIdentity.upsert({
    where: { unitId },
    update: {},
    create: {
      unitId,
      productId: unit.variant.productId,
      variantId: unit.variantId,
      status: unit.status,
      links: {
        create: {
          type: 'SERIAL',
          valueHash: unit.serialHash,
          valueLast4: unit.serialLast4,
          source: 'INVENTORY_REGISTRY',
        },
      },
    },
  });
}
export async function deviceEvent(
  tx: Prisma.TransactionClient,
  input: {
    unitId: string;
    type: string;
    key: string;
    actor: Actor;
    reference: string;
    location?: string;
    visible?: boolean;
    metadata?: Prisma.InputJsonObject;
    status?: string;
  },
) {
  const identity = await ensureIdentity(tx, input.unitId);
  await tx.deviceEvent.create({
    data: {
      deviceId: identity.id,
      eventKey: input.key,
      eventType: input.type,
      actor: input.actor.id,
      reference: input.reference,
      location: input.location,
      metadata: { ...input.metadata, requestId: input.actor.requestId },
      customerVisible: input.visible ?? false,
    },
  });
  if (input.status)
    await tx.deviceIdentity.update({ where: { id: identity.id }, data: { status: input.status } });
  return identity;
}
export async function verifyUnitLocation(
  tx: Prisma.TransactionClient,
  unit: { id: string; stockId: string | null },
  stockId: string,
) {
  if (unit.stockId !== stockId)
    throw new AppError(
      409,
      'UNIT_LOCATION_MISMATCH',
      'This serial is not registered at the stock location reserved for this order. Transfer or locate it first.',
    );
  return owned(await tx.inventoryStock.findUnique({ where: { id: stockId } }));
}
export async function serviceEvent(
  tx: Prisma.TransactionClient,
  input: {
    deviceId: string | null;
    type: string;
    key: string;
    actor: Actor;
    reference: string;
  },
) {
  if (!input.deviceId) return;
  const device = owned(await tx.device.findUnique({ where: { id: input.deviceId } }));
  await deviceEvent(tx, { ...input, unitId: device.unitId, visible: true });
}
