export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public requestId?: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'iPhoneBooking',
      ...options.headers,
    },
  });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      'The server is temporarily unavailable. Your bag is safe. Please try again.',
      'INVALID_RESPONSE',
      response.headers.get('X-Request-ID') ?? undefined,
    );
  }
  if (!response.ok) {
    const detail =
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof body.error === 'object' &&
      body.error !== null
        ? (body.error as Record<string, unknown>)
        : {};
    throw new ApiError(
      typeof detail.message === 'string'
        ? detail.message
        : 'Connection interrupted. Please try again.',
      typeof detail.code === 'string' ? detail.code : 'REQUEST_FAILED',
      typeof detail.requestId === 'string' ? detail.requestId : undefined,
    );
  }
  return body as T;
}
export const post = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data) });
export const money = (value: number) =>
  `NPR ${new Intl.NumberFormat('en-NP', { minimumFractionDigits: value % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(value / 100)}`;
export const human = (value: string) =>
  value
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/^./, (s) => s.toUpperCase());
export const date = (value: string) =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export const track = (name: string, entityId?: string) => {
  void post('/events', { name, entityId }).catch(() => undefined);
};
