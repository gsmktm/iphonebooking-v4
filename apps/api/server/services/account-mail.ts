import { z } from 'zod';
import { AppError } from '../core.js';

export function accountMailConfig() {
  const provider = process.env.MAIL_PROVIDER;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  const secret = process.env.AUTH_EMAIL_SECRET;
  if (provider !== 'resend' || !apiKey || !from || !secret || secret.length < 32) return null;
  const sender = from.match(/<([^<>]+)>$/)?.[1] ?? from;
  if (/[\r\n]/.test(from) || !z.string().email().safeParse(sender).success) return null;
  try {
    const origin = new URL(process.env.APP_ORIGIN ?? '');
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
    if (
      origin.username ||
      origin.password ||
      origin.pathname !== '/' ||
      origin.search ||
      origin.hash ||
      (origin.protocol !== 'https:' &&
        !(origin.protocol === 'http:' && local && process.env.NODE_ENV !== 'production'))
    )
      return null;
    return { apiKey, from, secret, origin: origin.origin };
  } catch {
    return null;
  }
}

export function requireAccountMail() {
  const config = accountMailConfig();
  if (!config)
    throw new AppError(
      503,
      'MAIL_NOT_CONFIGURED',
      'Account email is currently unavailable. Please contact support for help.',
    );
  return config;
}

type AccountMail = {
  recipient: string;
  purpose: 'PASSWORD_RESET' | 'EMAIL_VERIFICATION';
  rawToken: string;
  requestKey: string;
};

/** Provider acceptance is recorded separately from request acceptance; never log this payload. */
export async function sendAccountMail(input: AccountMail) {
  const config = requireAccountMail();
  const resetting = input.purpose === 'PASSWORD_RESET';
  const link = new URL(
    resetting ? '/account/reset-password' : '/account/verify-email',
    config.origin,
  );
  // Fragments stay out of HTTP request URLs, access logs, and Referer headers.
  link.hash = new URLSearchParams({ token: input.rawToken }).toString();
  const subject = resetting
    ? 'Reset your iPhoneBooking password'
    : 'Verify your iPhoneBooking email';
  const text = [
    resetting
      ? 'A password reset was requested for your iPhoneBooking account.'
      : 'Confirm your email address for your iPhoneBooking account.',
    '',
    link.toString(),
    '',
    resetting
      ? 'This link expires 30 minutes after the request. You can use it only once.'
      : 'This link expires 24 hours after the request. You can use it only once.',
    resetting
      ? 'Resetting your password will sign out every browser.'
      : 'Open the link and choose Verify email to confirm.',
    'If you did not request this email, you can ignore it. Your account stays unchanged.',
    '',
    'iPhoneBooking',
  ].join('\n');
  let response: Response;
  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `account-email/${input.requestKey}`,
      },
      body: JSON.stringify({ from: config.from, to: [input.recipient], subject, text }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new AppError(
      503,
      'MAIL_DELIVERY_FAILED',
      'Account email delivery is temporarily unavailable.',
    );
  }
  // Do not include provider error bodies: they may contain addresses or credentials.
  if (!response.ok)
    throw new AppError(
      503,
      'MAIL_DELIVERY_FAILED',
      'Account email delivery is temporarily unavailable.',
    );
  const result: unknown = await response.json().catch(() => null);
  if (!result || typeof result !== 'object' || !('id' in result) || typeof result.id !== 'string')
    throw new AppError(
      503,
      'MAIL_DELIVERY_FAILED',
      'The email provider did not acknowledge this request.',
    );
}
