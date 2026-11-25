import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError, hash, token, safeUser, requireUser, type Identity } from '../core.js';
import { accountMailConfig } from '../services/account-mail.js';
import {
  queueAccountEmail,
  requestAccountEmail,
  resetAccountPassword,
  verifyAccountEmail,
} from '../services/account-recovery.js';

export const auth = Router();
const sessionLifetime = 7 * 86400000;
const unknownPasswordHash = bcrypt.hash('unknown-account-timing-padding', 12);
const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
const newPassword = z
  .string()
  .min(12)
  .max(128)
  .refine((value) => !bcrypt.truncates(value), {
    message:
      'Use a password of at most 72 bytes; accented characters and emoji use more than one byte.',
  });
const recoveryToken = z
  .string()
  .regex(/^[a-f0-9]{64}$/, 'This link is invalid. Request a new link.');
const acceptedRequest = {
  ok: true,
  message:
    'If an eligible account uses that email address, a link will arrive shortly. Check your spam folder too.',
};
function invalidCredentials() {
  return new AppError(
    401,
    'INVALID_CREDENTIALS',
    'Your email or password is incorrect. Please try again.',
  );
}
function signedIn(res: Response, user: Identity, rawToken: string) {
  return res
    .cookie('session', rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionLifetime,
      path: '/',
    })
    .json(safeUser(user));
}

auth.use(
  ['/register', '/login', '/password'],
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({
        error: {
          code: 'AUTH_RATE_LIMITED',
          message: 'Too many sign-in attempts. Wait 15 minutes before trying again.',
          requestId: req.requestId,
        },
      }),
  }),
);
auth.use(
  ['/forgot-password', '/reset-password', '/verification-request', '/verify-email'],
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 15,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({
        error: {
          code: 'RECOVERY_RATE_LIMITED',
          message: 'Too many account recovery attempts. Wait 15 minutes before trying again.',
          requestId: req.requestId,
        },
      }),
  }),
);

auth.get('/capabilities', (_req, res) => {
  const available = Boolean(accountMailConfig());
  res.json({ passwordReset: available, emailVerification: available });
});
auth.post('/register', async (req, res) => {
  const data = z
    .object({ email, password: newPassword, name: z.string().trim().min(2).max(100) })
    .parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 12);
  const rawToken = token();
  const user = await db.$transaction(async (tx) => {
    if (await tx.user.findUnique({ where: { email: data.email }, select: { id: true } }))
      throw new AppError(
        409,
        'ACCOUNT_EXISTS',
        'Unable to create this account. Try signing in or resetting your password.',
      );
    const created = await tx.user.create({
      data: { name: data.name, email: data.email, passwordHash },
      include: { role: true },
    });
    if (accountMailConfig()) await queueAccountEmail(tx, created.id, 'EMAIL_VERIFICATION');
    await tx.userSession.create({
      data: {
        tokenHash: hash(rawToken),
        userId: created.id,
        expiresAt: new Date(Date.now() + sessionLifetime),
        userAgent: req.get('user-agent')?.slice(0, 250),
      },
    });
    return created;
  });
  signedIn(res, user, rawToken);
});
auth.post('/login', async (req, res) => {
  const data = z.object({ email, password: z.string().min(1).max(128) }).parse(req.body);
  const user = await db.user.findUnique({ where: { email: data.email }, include: { role: true } });
  const passwordMatches = await bcrypt.compare(
    data.password,
    user?.passwordHash ?? (await unknownPasswordHash),
  );
  if (!user || !passwordMatches || user.status !== 'ACTIVE') throw invalidCredentials();
  const rawToken = token();
  const current = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
    const current = await tx.user.findUnique({ where: { id: user.id }, include: { role: true } });
    // A concurrent password reset must not leave a session signed in with the old password.
    if (!current || current.status !== 'ACTIVE' || current.passwordHash !== user.passwordHash)
      throw invalidCredentials();
    const now = new Date();
    await tx.userSession.create({
      data: {
        tokenHash: hash(rawToken),
        userId: current.id,
        createdAt: now,
        expiresAt: new Date(now.getTime() + sessionLifetime),
        userAgent: req.get('user-agent')?.slice(0, 250),
      },
    });
    return current;
  });
  signedIn(res, current, rawToken);
});

auth.post('/forgot-password', async (req, res) => {
  const data = z.object({ email }).parse(req.body);
  await requestAccountEmail(data.email, 'PASSWORD_RESET');
  res.status(202).json(acceptedRequest);
});
auth.post('/verification-request', async (req, res) => {
  const data = z.object({ email }).parse(req.body);
  await requestAccountEmail(data.email, 'EMAIL_VERIFICATION');
  res.status(202).json(acceptedRequest);
});
auth.post('/reset-password', async (req, res) => {
  const data = z.object({ token: recoveryToken, newPassword }).parse(req.body);
  await resetAccountPassword(data.token, data.newPassword);
  res.clearCookie('session', { path: '/' }).json({ ok: true });
});
auth.post('/verify-email', async (req, res) => {
  const data = z.object({ token: recoveryToken }).parse(req.body);
  await verifyAccountEmail(data.token);
  res.json({ ok: true });
});
auth.get('/me', (req, res) => res.json(req.user ? safeUser(req.user) : null));
auth.post('/logout', async (req, res) => {
  if (typeof req.cookies.session === 'string')
    await db.userSession.deleteMany({ where: { tokenHash: hash(req.cookies.session) } });
  res.clearCookie('session', { path: '/' }).json({ ok: true });
});
auth.get('/sessions', requireUser, async (req, res) =>
  res.json(
    await db.userSession.findMany({
      where: { userId: req.user!.id, expiresAt: { gt: new Date() } },
      select: { id: true, userAgent: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ),
);
auth.delete('/sessions/:id', requireUser, async (req, res) => {
  await db.userSession.deleteMany({ where: { id: String(req.params.id), userId: req.user!.id } });
  res.json({ ok: true });
});
auth.post('/password', requireUser, async (req, res) => {
  const data = z
    .object({ currentPassword: z.string().min(1).max(128), newPassword })
    .parse(req.body);
  if (!(await bcrypt.compare(data.currentPassword, req.user!.passwordHash)))
    throw new AppError(401, 'INVALID_PASSWORD', 'Your current password is incorrect.');
  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${req.user!.id} FOR UPDATE`;
    const current = await tx.user.findUnique({ where: { id: req.user!.id } });
    if (!current || current.status !== 'ACTIVE' || current.passwordHash !== req.user!.passwordHash)
      throw new AppError(401, 'SIGN_IN_REQUIRED', 'Sign in again before changing your password.');
    const now = new Date();
    const sessionHash = hash(req.cookies.session);
    const session = await tx.userSession.updateMany({
      where: { userId: current.id, tokenHash: sessionHash, expiresAt: { gt: now } },
      data: { createdAt: now },
    });
    if (!session.count) throw new AppError(401, 'SIGN_IN_REQUIRED', 'Sign in again to continue.');
    await tx.user.update({
      where: { id: current.id },
      data: { passwordHash, passwordChangedAt: now },
    });
    await tx.userSession.deleteMany({
      where: { userId: current.id, tokenHash: { not: sessionHash } },
    });
    await tx.accountToken.updateMany({
      where: { userId: current.id, purpose: 'PASSWORD_RESET', consumedAt: null },
      data: { consumedAt: now },
    });
  });
  res.json({ ok: true });
});
