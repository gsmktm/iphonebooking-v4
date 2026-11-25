import { config as dotenv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const apiRoot = fileURLToPath(new URL('../', import.meta.url));
export const workspaceRoot = path.resolve(apiRoot, '../..');
export const webDistPath = path.resolve(workspaceRoot, 'apps/web/dist');

/** The process environment wins, followed by API-local values, then root fallback values. */
export function loadEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
  paths = [path.join(apiRoot, '.env'), path.join(workspaceRoot, '.env')],
) {
  dotenv({ path: paths, override: false, quiet: true, processEnv: environment });
}

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const errors = new Set<string>();
  const nodeEnv = env.NODE_ENV || 'development';
  const production = nodeEnv === 'production';
  if (!['development', 'test', 'production'].includes(nodeEnv)) errors.add('NODE_ENV');

  function integer(name: string, fallback: number, minimum: number, maximum: number) {
    const raw = env[name];
    if (raw === undefined || raw === '') return fallback;
    if (!/^\d+$/.test(raw) || Number(raw) < minimum || Number(raw) > maximum) {
      errors.add(name);
      return fallback;
    }
    return Number(raw);
  }
  function origin(name: string, fallback?: string) {
    const raw = env[name]?.trim() || fallback;
    if (!raw) {
      errors.add(name);
      return '';
    }
    try {
      const url = new URL(raw);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        (production && url.protocol !== 'https:') ||
        url.username ||
        url.password ||
        url.pathname !== '/' ||
        url.search ||
        url.hash ||
        url.hostname.includes('*')
      )
        throw new Error();
      return url.origin;
    } catch {
      errors.add(name);
      return '';
    }
  }

  const appOrigin = origin('APP_ORIGIN', production ? undefined : 'http://localhost:5173');
  const publicOrigin = origin('PUBLIC_ORIGIN', production ? undefined : appOrigin);
  const adminOrigin = env.ADMIN_ORIGIN?.trim() ? origin('ADMIN_ORIGIN') : undefined;
  const host = env.HOST?.trim() || '127.0.0.1';
  if (!/^[a-zA-Z0-9.:[\]-]+$/.test(host)) errors.add('HOST');
  const port = integer('PORT', 4000, 1, 65535);
  const trustProxyHops = integer('TRUST_PROXY_HOPS', 0, 0, 16);
  for (const name of [
    'SEED_DEVELOPMENT',
    'REQUIRE_INDEPENDENT_REPAIR_QC',
    'REQUIRE_INDEPENDENT_RECEIVING_QC',
  ]) {
    if (env[name] && !['true', 'false'].includes(env[name]!)) errors.add(name);
  }
  if (production && env.SEED_DEVELOPMENT === 'true') errors.add('SEED_DEVELOPMENT');
  try {
    const url = new URL(env.DATABASE_URL ?? '');
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      url.pathname === '/'
    )
      throw new Error();
  } catch {
    errors.add('DATABASE_URL');
  }

  // Integrations may remain disabled; a partial production setup must not look enabled.
  const mailProvider = env.MAIL_PROVIDER?.trim() || 'unconfigured';
  if (!['unconfigured', 'resend'].includes(mailProvider)) errors.add('MAIL_PROVIDER');
  if (
    production &&
    (mailProvider === 'resend' || env.RESEND_API_KEY || env.MAIL_FROM || env.AUTH_EMAIL_SECRET)
  ) {
    if (mailProvider !== 'resend') errors.add('MAIL_PROVIDER');
    if (!env.RESEND_API_KEY?.trim()) errors.add('RESEND_API_KEY');
    const from = env.MAIL_FROM?.trim() ?? '';
    const sender = from.match(/<([^<>]+)>$/)?.[1] ?? from;
    if (/[\r\n]/.test(from) || !z.string().email().safeParse(sender).success)
      errors.add('MAIL_FROM');
    if (!env.AUTH_EMAIL_SECRET || env.AUTH_EMAIL_SECRET.length < 32)
      errors.add('AUTH_EMAIL_SECRET');
  }
  if (env.KHALTI_ENVIRONMENT && !['sandbox', 'production'].includes(env.KHALTI_ENVIRONMENT))
    errors.add('KHALTI_ENVIRONMENT');
  if (production && (env.KHALTI_SECRET_KEY || env.KHALTI_ENVIRONMENT)) {
    if (!env.KHALTI_SECRET_KEY?.trim()) errors.add('KHALTI_SECRET_KEY');
    if (!env.KHALTI_ENVIRONMENT) errors.add('KHALTI_ENVIRONMENT');
  }
  if (errors.size)
    throw new Error(
      `Invalid environment configuration: ${[...errors].sort().join(', ')}. See .env.example.`,
    );

  return {
    nodeEnv,
    production,
    host,
    port,
    trustProxyHops,
    appOrigin,
    publicOrigin,
    adminOrigin,
    allowedOrigins: new Set([appOrigin, publicOrigin, ...(adminOrigin ? [adminOrigin] : [])]),
  };
}

loadEnvironment();
export const config = readConfig();
export const allowedOrigins = config.allowedOrigins;
