import { db } from '../db.js';
import { reconcilePendingPayments } from './payments.js';
import { expireReservations } from './orders.js';
import { deliverAccountEmail } from './account-recovery.js';
const MAX_ATTEMPTS = 5;
const LEASE_MS = 5 * 60_000;
/** Database-backed jobs; a conditional claim prevents two workers from processing one job. */
export async function runJobs() {
  const now = new Date();
  await db.job.updateMany({
    where: { status: 'PROCESSING', runAt: { lt: now }, attempts: { lt: MAX_ATTEMPTS } },
    data: { status: 'PENDING', lastError: 'Worker lease expired.' },
  });
  await db.job.updateMany({
    where: { status: 'PROCESSING', runAt: { lt: now }, attempts: { gte: MAX_ATTEMPTS } },
    data: { status: 'DEAD', lastError: 'Worker lease expired after maximum attempts.' },
  });
  await db.job.upsert({
    where: { key: `reservation-cleanup:${Math.floor(Date.now() / 60_000)}` },
    create: {
      type: 'RESERVATION_CLEANUP',
      key: `reservation-cleanup:${Math.floor(Date.now() / 60_000)}`,
      payload: {},
    },
    update: {},
  });
  const jobs = await db.job.findMany({
    where: { status: 'PENDING', runAt: { lte: now } },
    orderBy: { runAt: 'asc' },
    take: 10,
  });
  for (const job of jobs) {
    const claimed = await db.job.updateMany({
      where: { id: job.id, status: 'PENDING' },
      data: {
        status: 'PROCESSING',
        attempts: { increment: 1 },
        runAt: new Date(Date.now() + LEASE_MS),
      },
    });
    if (!claimed.count) continue;
    try {
      if (job.type === 'RESERVATION_CLEANUP') {
        await reconcilePendingPayments();
        await expireReservations();
      } else if (job.type === 'AUTH_EMAIL') await deliverAccountEmail(job.payload);
      else throw new Error('UNCONFIGURED_JOB_HANDLER');
      await db.job.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', lastError: null },
      });
    } catch {
      const attempts = job.attempts + 1;
      await db.job.update({
        where: { id: job.id },
        data: {
          status: attempts >= MAX_ATTEMPTS ? 'DEAD' : 'PENDING',
          runAt: new Date(Date.now() + Math.min(3600, 2 ** attempts * 15) * 1000),
          lastError: 'Job failed. Review the worker logs and integration configuration.',
        },
      });
      console.error(
        JSON.stringify({
          jobId: job.id,
          type: job.type,
          attempts,
          status: attempts >= MAX_ATTEMPTS ? 'DEAD' : 'RETRY',
        }),
      );
    }
  }
}
