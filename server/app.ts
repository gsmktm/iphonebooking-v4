import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { ZodError, z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from './db.js';
import { identity, AppError, hash, requireUser, owned } from './core.js';
import { auth } from './routes/auth.js';
import { catalog } from './routes/catalog.js';
import { commerce } from './routes/commerce.js';
import { account } from './routes/account.js';
import { services } from './routes/services.js';
import { admin } from './routes/admin.js';
import { adminCreate } from './routes/admin-create.js';
import { operations } from './routes/operations.js';
import { roles } from './routes/roles.js';
import { finance } from './routes/finance.js';
import { procurement } from './routes/procurement.js';
import { repairOperations } from './routes/repair-operations.js';
import { deviceLifecycle } from './routes/device-lifecycle.js';
import { legacyScaffolds } from './routes/legacy-scaffolds.js';
export const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY_HOPS) app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));
app.use((req, res, next) => {
  const started = performance.now();
  res.on('finish', () => {
    if (process.env.NODE_ENV !== 'test' && req.path.startsWith('/api'))
      console.log(
        JSON.stringify({
          level: 'info',
          requestId: req.requestId,
          method: req.method,
          route: req.route?.path ?? 'api',
          status: res.statusCode,
          durationMs: Math.round(performance.now() - started),
        }),
      );
  });
  next();
});
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
  }),
);
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use(
  '/api',
  rateLimit({
    windowMs: 60000,
    limit: 200,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) =>
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Wait a minute and try again.',
          requestId: req.requestId,
        },
      }),
  }),
);
app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());
app.use('/api', (req, _res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    if (req.get('X-Requested-With') !== 'iPhoneBooking')
      throw new AppError(403, 'CSRF_REJECTED', 'Reload this page before trying again.');
    const origin = req.get('origin');
    if (origin && origin !== (process.env.APP_ORIGIN ?? 'http://localhost:5173'))
      throw new AppError(403, 'ORIGIN_REJECTED', 'Request origin is not allowed.');
  }
  next();
});
app.get('/api/health', async (_req, res) => {
  await db.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', version: '2.0.0' });
});
app.use('/api/v1', identity);
app.use('/api/v1/auth', auth);
app.use('/api/v1', catalog);
app.use('/api/v1', commerce);
app.use('/api/v1/account', account);
app.use('/api/v1', services);
app.use('/api/v1', legacyScaffolds);
app.use('/api/v1', deviceLifecycle);
app.use('/api/v1/admin', adminCreate);
app.use('/api/v1/admin', operations);
app.use('/api/v1/admin', repairOperations);
app.use('/api/v1/admin', procurement);
app.use('/api/v1/admin', finance);
app.use('/api/v1/admin', roles);
app.use('/api/v1/admin', admin);
app.post('/api/v1/account/claim-order', requireUser, async (req, res) => {
  const { number, receiptKey } = z
    .object({ number: z.string().min(1).max(80), receiptKey: z.string().min(32).max(128) })
    .parse(req.body);
  const order = owned(
    await db.order.findFirst({ where: { number, trackingHash: hash(receiptKey), userId: null } }),
  );
  await db.order.update({ where: { id: order.id, userId: null }, data: { userId: req.user!.id } });
  res.json({ ok: true });
});

app.use('/api', () => {
  throw new AppError(404, 'NOT_FOUND', 'This API route does not exist.');
});

const errors: ErrorRequestHandler = (error, req, res, _next) => {
  let status = 500,
    code = 'INTERNAL_ERROR',
    message =
      'We could not complete this request. Please retry or contact support with the request ID.';
  if (error instanceof AppError) {
    status = error.status;
    code = error.code;
    message = error.message;
  } else if (error instanceof SyntaxError && 'body' in error) {
    status = 400;
    code = 'INVALID_JSON';
    message = 'The request could not be read. Reload the page and try again.';
  } else if (error instanceof ZodError) {
    status = 422;
    code = 'VALIDATION_ERROR';
    message = error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      status = 409;
      code = 'DUPLICATE_RECORD';
      message = 'This record already exists.';
    }
    if (error.code === 'P2034') {
      status = 409;
      code = 'RETRY_TRANSACTION';
      message = 'Availability changed during this request. Please try again.';
    }
  }
  if (status === 500)
    console.error(
      JSON.stringify({
        level: 'error',
        requestId: req.requestId,
        code,
        errorType: error?.constructor?.name,
      }),
    );
  res.status(status).json({ error: { code, message, requestId: req.requestId } });
};
app.use(errors);
