import type { Order, Payment, Prisma } from '@prisma/client';
import { AppError, hash, owned } from '../core.js';
import { db } from '../db.js';
import { getPaymentProvider, type PaymentProvider } from './khalti.js';

export const openPaymentStates = [
  'INITIALIZING',
  'INITIALIZATION_UNCERTAIN',
  'PENDING',
  'VERIFICATION_PENDING',
  'REVIEW_REQUIRED',
];
const publicPayment = (p: Payment) => ({
  id: p.id,
  orderId: p.orderId,
  provider: p.provider,
  amount: p.amount,
  currency: p.currency,
  status: p.status,
  url:
    ['PENDING', 'VERIFICATION_PENDING'].includes(p.status) &&
    p.expiresAt &&
    p.expiresAt > new Date()
      ? p.checkoutUrl
      : null,
  expiresAt: p.expiresAt,
});
export async function authorizedOrder(orderId: string, userId?: string, receiptKey?: string) {
  return owned(
    await db.order.findFirst({
      where: {
        id: orderId,
        OR: [
          ...(userId ? [{ userId }] : []),
          ...(receiptKey ? [{ trackingHash: hash(receiptKey) }] : []),
        ],
      },
    }),
  );
}
async function lockedOrder(tx: Prisma.TransactionClient, orderId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
  return owned(await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } }));
}

export async function initiatePayment(
  orderId: string,
  idempotencyKey: string,
  provider: PaymentProvider = getPaymentProvider(),
) {
  if (provider.name !== 'KHALTI')
    throw new AppError(
      503,
      'PAYMENT_NOT_CONFIGURED',
      'Online payments are not enabled. You can complete your reservation at the store.',
    );
  const attempt = await db.$transaction(async (tx) => {
    const order = await lockedOrder(tx, orderId);
    const existing = await tx.payment.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.orderId !== orderId)
        throw new AppError(
          409,
          'IDEMPOTENCY_CONFLICT',
          'This payment reference has already been used.',
        );
      return { payment: existing, order, created: false };
    }
    if (order.payments.some((p) => p.provider === 'KHALTI' && openPaymentStates.includes(p.status)))
      throw new AppError(
        409,
        'PAYMENT_ALREADY_OPEN',
        'A payment is already in progress. Verify its status before trying again.',
      );
    if (
      !['PLACED', 'DEPOSIT_PAID'].includes(order.status) ||
      (order.status === 'PLACED' && order.expiresAt <= new Date())
    )
      throw new AppError(
        409,
        'ORDER_CLOSED',
        'This reservation is no longer awaiting payment. Check your order status.',
      );
    const paid = order.payments
      .filter((p) => p.status === 'CONFIRMED')
      .reduce((sum, p) => sum + p.amount, 0);
    const amount = Math.min(order.total - paid, paid === 0 ? order.dueNow : order.total - paid);
    if (amount < 1000 || order.currency !== 'NPR')
      throw new AppError(
        422,
        'PAYMENT_AMOUNT_UNSUPPORTED',
        'Complete payments below NPR 10 at the store.',
      );
    const payment = await tx.payment.create({
      data: {
        orderId,
        amount,
        currency: order.currency,
        provider: 'KHALTI',
        status: 'INITIALIZING',
        idempotencyKey,
      },
    });
    return { payment, order, created: true };
  });
  if (!attempt.created) return publicPayment(attempt.payment);
  try {
    const session = await provider.createPayment({
      orderId,
      paymentId: attempt.payment.id,
      orderNumber: attempt.order.number,
      amount: attempt.payment.amount,
      currency: attempt.payment.currency,
    });
    const payment = await db.payment.update({
      where: { id: attempt.payment.id },
      data: {
        status: 'PENDING',
        externalId: session.reference,
        checkoutUrl: session.url,
        expiresAt: session.expiresAt,
      },
    });
    return publicPayment(payment);
  } catch (error) {
    // A lost response can still mean the provider created a checkout. Never automatically retry.
    const rejected = error instanceof AppError && error.code === 'PAYMENT_INITIATION_REJECTED';
    await db.payment.update({
      where: { id: attempt.payment.id },
      data: {
        status: rejected ? 'FAILED' : 'INITIALIZATION_UNCERTAIN',
        failureCode: error instanceof AppError ? error.code : 'INITIATION_INTERRUPTED',
      },
    });
    throw error;
  }
}

async function reviewPayment(tx: Prisma.TransactionClient, payment: Payment, reason: string) {
  await tx.payment.update({
    where: { id: payment.id },
    data: { status: 'REVIEW_REQUIRED', failureCode: reason, verifiedAt: new Date() },
  });
  await tx.auditLog.create({
    data: {
      actorId: 'payment-verifier',
      action: 'payment.review',
      entity: 'Payment',
      entityId: payment.id,
      after: { reason },
      requestId: payment.id,
    },
  });
}
export async function verifyPayment(
  paymentId: string,
  provider: PaymentProvider = getPaymentProvider(),
) {
  const original = owned(await db.payment.findUnique({ where: { id: paymentId } }));
  if (original.provider !== 'KHALTI')
    throw new AppError(422, 'WRONG_PROVIDER', 'This payment is managed by the store.');
  if (original.status === 'CONFIRMED') return publicPayment(original);
  if (!original.externalId)
    throw new AppError(
      409,
      'PAYMENT_REFERENCE_PENDING',
      'Payment initiation needs store review. Do not make another payment until the store confirms its status.',
    );
  if (original.status === 'REVIEW_REQUIRED') return publicPayment(original);
  const evidence = await provider.verifyPayment(original.externalId);
  const result = await db.$transaction(async (tx) => {
    const order = await lockedOrder(tx, original.orderId);
    const payment = owned(await tx.payment.findUnique({ where: { id: paymentId } }));
    if (payment.status === 'CONFIRMED' || payment.status === 'REVIEW_REQUIRED') return payment;
    if (
      evidence.reference !== payment.externalId ||
      evidence.amount !== payment.amount ||
      evidence.currency !== payment.currency
    ) {
      await reviewPayment(tx, payment, 'PROVIDER_AMOUNT_MISMATCH');
    } else if (evidence.status === 'COMPLETED') {
      const paid = order.payments
        .filter((p) => p.status === 'CONFIRMED')
        .reduce((sum, p) => sum + p.amount, 0);
      if (
        !evidence.transactionId ||
        !['PLACED', 'DEPOSIT_PAID'].includes(order.status) ||
        payment.amount > order.total - paid
      ) {
        await reviewPayment(tx, payment, 'ORDER_REQUIRES_RECONCILIATION');
      } else {
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: 'CONFIRMED',
            transactionId: evidence.transactionId,
            verifiedAt: new Date(),
            failureCode: null,
          },
        });
        await tx.payment.updateMany({
          where: { orderId: order.id, provider: 'STORE', status: 'PENDING' },
          data: { status: 'SUPERSEDED' },
        });
        await tx.orderMoneyEntry.create({
          data: {
            orderId: order.id,
            paymentId,
            kind: 'PAYMENT',
            amount: -payment.amount,
            eventKey: `payment:${paymentId}`,
            source: 'KHALTI_VERIFIED',
          },
        });
        const status = paid + payment.amount >= order.total ? 'PAID' : 'DEPOSIT_PAID';
        await tx.order.update({
          where: { id: order.id },
          data: {
            status,
            history: { create: { status, note: 'Payment verified directly with Khalti.' } },
          },
        });
        await tx.booking.updateMany({
          where: { orderId: order.id },
          data: { status: 'AWAITING_ALLOCATION' },
        });
        if (order.userId)
          await tx.notification.create({
            data: {
              userId: order.userId,
              title: 'Payment verified',
              body: `${order.number}: your payment has been verified. Follow progress in your orders.`,
            },
          });
        await tx.auditLog.create({
          data: {
            actorId: 'payment-verifier',
            action: 'payment.verified',
            entity: 'Payment',
            entityId: paymentId,
            after: { amount: payment.amount, currency: payment.currency, status },
            requestId: paymentId,
          },
        });
      }
    } else {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status:
            evidence.status === 'PENDING'
              ? 'VERIFICATION_PENDING'
              : evidence.status === 'REFUNDED'
                ? 'REVIEW_REQUIRED'
                : evidence.status,
          verifiedAt: new Date(),
        },
      });
    }
    return (await tx.payment.findUnique({ where: { id: paymentId } }))!;
  });
  return publicPayment(result);
}
export async function orderPayments(order: Order) {
  return (
    await db.payment.findMany({ where: { orderId: order.id }, orderBy: { createdAt: 'desc' } })
  ).map(publicPayment);
}
export async function reconcilePendingPayments() {
  if (getPaymentProvider().name !== 'KHALTI') return;
  const attempts = await db.payment.findMany({
    where: {
      provider: 'KHALTI',
      externalId: { not: null },
      status: { in: ['PENDING', 'VERIFICATION_PENDING'] },
      OR: [{ verifiedAt: null }, { verifiedAt: { lt: new Date(Date.now() - 60000) } }],
    },
    orderBy: [{ verifiedAt: 'asc' }, { createdAt: 'asc' }],
    take: 5,
  });
  for (const attempt of attempts) {
    try {
      await verifyPayment(attempt.id);
    } catch {
      await db.payment.updateMany({
        where: { id: attempt.id, status: { in: ['PENDING', 'VERIFICATION_PENDING'] } },
        data: { verifiedAt: new Date(), failureCode: 'RECONCILIATION_RETRY' },
      });
    }
  }
}
