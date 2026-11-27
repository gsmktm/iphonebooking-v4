import { AppError } from '../core.js';

type GoTrueUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: { full_name?: unknown; name?: unknown };
};
type GoTrueToken = { access_token?: string };

function settings() {
  if (process.env.SUPABASE_AUTH_ENABLED !== 'true') return null;
  const url = process.env.SUPABASE_URL?.trim() ?? '';
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !key.startsWith('sb_publishable_')) {
    return null;
  }
  return { url, key };
}
export function supabaseAuthAvailable() {
  return Boolean(settings());
}

async function requestGoTrue(
  path: string,
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
  bearer?: string,
) {
  const provider = settings();
  if (!provider)
    throw new AppError(
      503,
      'SUPABASE_AUTH_UNAVAILABLE',
      'Supabase sign-in is not available on this environment.',
    );
  let response: Response;
  try {
    response = await fetch(`${provider.url}/auth/v1${path}`, {
      method,
      headers: {
        apikey: provider.key,
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(9000),
    });
  } catch {
    throw new AppError(
      503,
      'AUTH_PROVIDER_UNAVAILABLE',
      'Sign-in service is temporarily unavailable.',
    );
  }
  if (!response.ok) {
    if ([400, 401, 403, 422].includes(response.status))
      throw new AppError(
        401,
        'SUPABASE_SIGN_IN_FAILED',
        'Sign-in failed. Verify your email and password.',
      );
    throw new AppError(
      503,
      'AUTH_PROVIDER_UNAVAILABLE',
      'Sign-in service is temporarily unavailable.',
    );
  }
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    throw new AppError(
      503,
      'AUTH_PROVIDER_UNAVAILABLE',
      'Sign-in service returned an invalid response.',
    );
  }
}

export async function registerSupabaseAccount(email: string, password: string, name: string) {
  // A signup must never mint an iPhoneBooking session before email verification.
  await requestGoTrue('/signup', 'POST', {
    email,
    password,
    data: { full_name: name },
  });
}
export async function verifySupabaseCredentials(email: string, password: string) {
  const auth = (await requestGoTrue('/token?grant_type=password', 'POST', {
    email,
    password,
  })) as GoTrueToken;
  if (!auth.access_token || auth.access_token.length > 8192)
    throw new AppError(
      401,
      'SUPABASE_SIGN_IN_FAILED',
      'Sign-in failed. Verify your email and password.',
    );

  // Do not trust client-provided JWT claims or editable user_metadata as authority.
  // Fetch the authenticated identity directly from the Supabase Auth service.
  const user = (await requestGoTrue('/user', 'GET', undefined, auth.access_token)) as GoTrueUser;
  if (
    !user.id ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id) ||
    !user.email_confirmed_at ||
    user.email?.trim().toLowerCase() !== email.toLowerCase()
  ) {
    throw new AppError(401, 'EMAIL_VERIFICATION_REQUIRED', 'Confirm your email before signing in.');
  }
  const verifiedAt = new Date(user.email_confirmed_at);
  if (Number.isNaN(verifiedAt.valueOf()))
    throw new AppError(401, 'EMAIL_VERIFICATION_REQUIRED', 'Confirm your email before signing in.');
  const rawName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  const displayName =
    typeof rawName === 'string' && rawName.trim().length >= 2 && rawName.trim().length <= 100
      ? rawName.trim()
      : email.split('@')[0] || 'Customer';
  return { id: user.id, email: email.toLowerCase(), verifiedAt, displayName };
}
