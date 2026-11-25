import { createHmac } from 'node:crypto';
import type { AccountTokenPurpose, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AppError, hash, token } from '../core.js';
import { db } from '../db.js';
import { requireAccountMail, sendAccountMail } from './account-mail.js';

const TOKEN_LIFETIME = { PASSWORD_RESET: 30 * 60_000, EMAIL_VERIFICATION: 24 * 60 * 60_000 };
const REQUEST_COOLDOWN = 60_000;
const MAX_REQUESTS_PER_HOUR = 5;

function emailToken(secret: string, purpose: AccountTokenPurpose, requestKey: string) {
  return createHmac('sha256', secret)
    .update(`iphonebooking:account:v1:${purpose}:${requestKey}`)
    .digest('hex');
}

/** Call inside the transaction that accepts the request or creates the account. */
export async function queueAccountEmail(
  tx: Prisma.TransactionClient,
  userId: string,
  purpose: AccountTokenPurpose,
) {
  const config = requireAccountMail();
  // Serialize issuance and consumption per account, including requests on different workers.
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (
    !user ||
    user.status !== 'ACTIVE' ||
    (purpose === 'EMAIL_VERIFICATION' && user.emailVerifiedAt)
  )
    return;
  const now = new Date();
  const recent = await tx.accountToken.findMany({
    where: { userId, purpose, createdAt: { gt: new Date(now.getTime() - 60 * 60_000) } },
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: MAX_REQUESTS_PER_HOUR,
  });
  if (
    recent.length >= MAX_REQUESTS_PER_HOUR ||
    (recent[0] && recent[0].createdAt.getTime() > now.getTime() - REQUEST_COOLDOWN)
  )
    return;
  await tx.accountToken.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: now },
  });
  const requestKey = token();
  const record = await tx.accountToken.create({
    data: {
      userId,
      purpose,
      email: user.email,
      requestKey,
      tokenHash: hash(emailToken(config.secret, purpose, requestKey)),
      expiresAt: new Date(now.getTime() + TOKEN_LIFETIME[purpose]),
      createdAt: now,
    },
  });
  // Only the token record ID is queued. Reconstructing a link requires the server secret.
  await tx.job.create({
    data: {
      type: 'AUTH_EMAIL',
      key: `auth-email:${record.id}`,
      payload: { accountTokenId: record.id },
    },
  });
}

export async function requestAccountEmail(email: string, purpose: AccountTokenPurpose) {
  requireAccountMail();
  await db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { email }, select: { id: true } });
    if (user) await queueAccountEmail(tx, user.id, purpose);
  });
}

export async function deliverAccountEmail(payload: Prisma.JsonValue) {
  const { accountTokenId } = z
    .object({ accountTokenId: z.string().min(1).max(100) })
    .parse(payload);
  const record = await db.accountToken.findUnique({
    where: { id: accountTokenId },
    include: { user: true },
  });
  if (
    !record ||
    record.consumedAt ||
    record.deliveredAt ||
    record.expiresAt <= new Date() ||
    record.user.status !== 'ACTIVE' ||
    record.user.email !== record.email ||
    (record.purpose === 'EMAIL_VERIFICATION' && record.user.emailVerifiedAt)
  )
    return;
  const config = requireAccountMail();
  const rawToken = emailToken(config.secret, record.purpose, record.requestKey);
  if (hash(rawToken) !== record.tokenHash)
    throw new AppError(
      503,
      'MAIL_KEY_CHANGED',
      'Request a new account email after configuration changes.',
    );
  await sendAccountMail({
    recipient: record.email,
    purpose: record.purpose,
    rawToken,
    requestKey: record.requestKey,
  });
  // This means the provider accepted the message, not that an inbox received it.
  await db.accountToken.updateMany({
    where: { id: record.id, deliveredAt: null },
    data: { deliveredAt: new Date() },
  });
}

function invalidToken() {
  return new AppError(
    400,
    'INVALID_ACCOUNT_TOKEN',
    'This link is invalid or has expired. Request a new link to continue.',
  );
}

async function consumeAccountToken(
  tx: Prisma.TransactionClient,
  rawToken: string,
  purpose: AccountTokenPurpose,
) {
  const match = await tx.accountToken.findUnique({ where: { tokenHash: hash(rawToken) } });
  if (!match || match.purpose !== purpose) throw invalidToken();
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${match.userId} FOR UPDATE`;
  const record = await tx.accountToken.findUnique({
    where: { id: match.id },
    include: { user: true },
  });
  const now = new Date();
  if (
    !record ||
    record.consumedAt ||
    record.expiresAt <= now ||
    record.user.status !== 'ACTIVE' ||
    record.email !== record.user.email
  )
    throw invalidToken();
  const claimed = await tx.accountToken.updateMany({
    where: { id: record.id, consumedAt: null, expiresAt: { gt: now } },
    data: { consumedAt: now },
  });
  if (claimed.count !== 1) throw invalidToken();
  await tx.accountToken.updateMany({
    where: { userId: record.userId, purpose, consumedAt: null },
    data: { consumedAt: now },
  });
  return { user: record.user, now };
}

export async function resetAccountPassword(rawToken: string, newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.$transaction(async (tx) => {
    const { user, now } = await consumeAccountToken(tx, rawToken, 'PASSWORD_RESET');
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordChangedAt: now },
    });
    await tx.userSession.deleteMany({ where: { userId: user.id } });
  });
}

export async function verifyAccountEmail(rawToken: string) {
  await db.$transaction(async (tx) => {
    const { user, now } = await consumeAccountToken(tx, rawToken, 'EMAIL_VERIFICATION');
    await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: now } });
  });
}
