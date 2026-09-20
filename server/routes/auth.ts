import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db.js';
import { AppError, hash, token, safeUser, requireUser } from '../core.js';
export const auth = Router();
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
const credentials = z.object({
  email: z
    .string()
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(12).max(128),
  name: z.string().trim().min(2).max(100).optional(),
});
for (const action of ['register', 'login'])
  auth.post(`/${action}`, async (req, res) => {
    const data = credentials.parse(req.body);
    if (action === 'register') {
      if (!data.name) throw new AppError(422, 'NAME_REQUIRED', 'Please enter your name.');
      if (await db.user.findUnique({ where: { email: data.email } }))
        throw new AppError(
          409,
          'ACCOUNT_EXISTS',
          'An account already exists. Sign in to continue.',
        );
      await db.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: await bcrypt.hash(data.password, 12),
        },
      });
    }
    const user = await db.user.findUnique({
      where: { email: data.email },
      include: { role: true },
    });
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash)))
      throw new AppError(
        401,
        'INVALID_CREDENTIALS',
        'Your email or password is incorrect. Please try again.',
      );
    const rawToken = token();
    await db.userSession.create({
      data: {
        tokenHash: hash(rawToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 86400000),
        userAgent: req.get('user-agent')?.slice(0, 250),
      },
    });
    res
      .cookie('session', rawToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 86400000,
        path: '/',
      })
      .json(safeUser(user));
  });
auth.get('/me', (req, res) => res.json(req.user ? safeUser(req.user) : null));
auth.post('/logout', async (req, res) => {
  if (req.cookies.session)
    await db.userSession.deleteMany({ where: { tokenHash: hash(req.cookies.session) } });
  res.clearCookie('session', { path: '/' }).json({ ok: true });
});
auth.get('/sessions', requireUser, async (req, res) =>
  res.json(
    await db.userSession.findMany({
      where: { userId: req.user!.id },
      select: { id: true, userAgent: true, createdAt: true, expiresAt: true },
    }),
  ),
);
auth.delete('/sessions/:id', requireUser, async (req, res) => {
  await db.userSession.deleteMany({ where: { id: String(req.params.id), userId: req.user!.id } });
  res.json({ ok: true });
});
auth.post('/password', requireUser, async (req, res) => {
  const data = z
    .object({
      currentPassword: z.string().min(1).max(128),
      newPassword: z.string().min(12).max(128),
    })
    .parse(req.body);
  if (!(await bcrypt.compare(data.currentPassword, req.user!.passwordHash)))
    throw new AppError(401, 'INVALID_PASSWORD', 'Your current password is incorrect.');
  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: req.user!.id }, data: { passwordHash } });
    await tx.userSession.deleteMany({
      where: { userId: req.user!.id, tokenHash: { not: hash(req.cookies.session) } },
    });
  });
  res.json({ ok: true });
});
