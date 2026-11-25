import type { Request, Response, NextFunction } from 'express';
import type { User, Role } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { db } from './db.js';
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('hex');
export type Identity = User & { role: Role | null };
declare global {
  namespace Express {
    interface Request {
      user?: Identity;
      requestId: string;
    }
  }
}
export async function identity(req: Request, _res: Response, next: NextFunction) {
  const cookie = req.cookies?.session;
  if (typeof cookie === 'string') {
    const session = await db.userSession.findUnique({
      where: { tokenHash: hash(cookie) },
      include: { user: { include: { role: true } } },
    });
    if (
      session &&
      session.expiresAt > new Date() &&
      session.user.status === 'ACTIVE' &&
      (!session.user.passwordChangedAt || session.createdAt >= session.user.passwordChangedAt)
    )
      req.user = session.user;
  }
  next();
}
export function requireUser(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw new AppError(401, 'SIGN_IN_REQUIRED', 'Sign in to continue.');
  next();
}
export const permit =
  (permission: string) => (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError(401, 'SIGN_IN_REQUIRED', 'Sign in to continue.');
    if (!req.user.role?.permissions.some((p) => p === '*' || p === permission))
      throw new AppError(
        403,
        'ACCESS_DENIED',
        'Your account does not have permission for this action.',
      );
    next();
  };
export function safeUser(user: Identity) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt,
    role: user.role?.name,
    permissions: user.role?.permissions ?? [],
  };
}
export function owned<T>(value: T | null): T {
  if (!value) throw new AppError(404, 'NOT_FOUND', 'This record was not found in your account.');
  return value;
}
