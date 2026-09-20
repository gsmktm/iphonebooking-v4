import type { Prisma } from '@prisma/client';
export async function recordOrderCharge(
  tx: Prisma.TransactionClient,
  order: { id: string; total: number; items: { quantity: number; unitPrice: number }[] },
) {
  const gross = order.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  await tx.orderMoneyEntry.create({
    data: {
      orderId: order.id,
      kind: 'CHARGE',
      amount: gross,
      eventKey: `charge:${order.id}`,
      source: 'CHECKOUT',
    },
  });
  if (gross > order.total)
    await tx.orderMoneyEntry.create({
      data: {
        orderId: order.id,
        kind: 'TRADE_IN_CREDIT',
        amount: order.total - gross,
        eventKey: `trade-credit:${order.id}`,
        source: 'ACCEPTED_INSPECTION',
      },
    });
}
export async function recordStorePayment(
  tx: Prisma.TransactionClient,
  payment: { id: string; orderId: string; amount: number },
) {
  await tx.orderMoneyEntry.create({
    data: {
      orderId: payment.orderId,
      paymentId: payment.id,
      kind: 'PAYMENT',
      amount: -payment.amount,
      eventKey: `payment:${payment.id}`,
      source: 'STAFF_RECEIPT',
    },
  });
}
export async function voidReservationCharge(
  tx: Prisma.TransactionClient,
  order: { id: string; total: number },
) {
  await tx.orderMoneyEntry.create({
    data: {
      orderId: order.id,
      kind: 'VOID',
      amount: -order.total,
      eventKey: `void:${order.id}`,
      source: 'RESERVATION_EXPIRY',
    },
  });
}
