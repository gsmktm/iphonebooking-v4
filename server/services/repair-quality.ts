import type { Prisma } from '@prisma/client';
import { AppError } from '../core.js';
export const qcChecks = [
  'power',
  'display',
  'touch',
  'camera',
  'speaker',
  'microphone',
  'charging',
  'buttons',
  'network',
  'battery',
  'cosmetic',
] as const;
export async function requireRepairQC(tx: Prisma.TransactionClient, repairId: string) {
  const [stage, qc] = await Promise.all([
    tx.repairStatusHistory.findFirst({
      where: { repairId, status: 'QUALITY_CONTROL' },
      orderBy: { createdAt: 'desc' },
    }),
    tx.repairQC.findFirst({ where: { repairId }, orderBy: { checkedAt: 'desc' } }),
  ]);
  if (!stage || !qc || qc.status !== 'PASSED' || qc.checkedAt < stage.createdAt)
    throw new AppError(
      409,
      'QC_REQUIRED',
      'Record a passing quality-control checklist for the current repair cycle before marking it ready.',
    );
}
export async function issueRepairWarranty(tx: Prisma.TransactionClient, repairId: string) {
  const quote = await tx.repairQuote.findFirst({
    where: { repairId, status: 'APPROVED' },
    orderBy: { decidedAt: 'desc' },
  });
  if (!quote || quote.warrantyDays === 0) return;
  const startDate = new Date();
  await tx.repairWarranty.create({
    data: {
      repairId,
      startDate,
      expiryDate: new Date(startDate.getTime() + quote.warrantyDays * 86400000),
      terms: `Covers the work described in approved quote ${quote.id}. Coverage is subject to inspection of the reported issue.`,
      claimHistory: [],
    },
  });
}
