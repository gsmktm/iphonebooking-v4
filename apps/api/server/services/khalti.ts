import { z } from 'zod';
import { AppError } from '../core.js';

export type PaymentInitiation = {
  reference: string;
  url: string;
  expiresAt: Date;
};
export type PaymentVerification = {
  reference: string;
  transactionId: string | null;
  amount: number;
  currency: 'NPR';
  status: 'COMPLETED' | 'PENDING' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED';
};
export interface PaymentProvider {
  name: string;
  createPayment(input: {
    orderId: string;
    paymentId: string;
    orderNumber: string;
    amount: number;
    currency: string;
  }): Promise<PaymentInitiation>;
  verifyPayment(reference: string): Promise<PaymentVerification>;
}

export class UnconfiguredProvider implements PaymentProvider {
  name = 'unconfigured';
  private unavailable(): never {
    throw new AppError(
      503,
      'PAYMENT_NOT_CONFIGURED',
      'Online payments are not enabled. Choose pay at store. No online payment has been taken.',
    );
  }
  async createPayment(): Promise<never> {
    return this.unavailable();
  }
  async verifyPayment(): Promise<never> {
    return this.unavailable();
  }
}

export type KhaltiConfig = {
  secretKey: string;
  environment: 'sandbox' | 'production';
  origin: string;
};

/** Only fixed provider endpoints are allowed; the secret is never sent to a supplied URL. */
export function khaltiConfig(env: NodeJS.ProcessEnv = process.env): KhaltiConfig | null {
  const secretKey = env.KHALTI_SECRET_KEY?.trim();
  const environment = env.KHALTI_ENVIRONMENT;
  if (!secretKey || !['sandbox', 'production'].includes(environment ?? '') || !env.APP_ORIGIN)
    return null;
  try {
    const origin = new URL(env.APP_ORIGIN);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
    if (
      origin.username ||
      origin.password ||
      origin.search ||
      origin.hash ||
      origin.pathname !== '/' ||
      (origin.protocol !== 'https:' &&
        !(environment === 'sandbox' && local && origin.protocol === 'http:'))
    )
      return null;
    return {
      secretKey,
      environment: environment as KhaltiConfig['environment'],
      origin: origin.origin,
    };
  } catch {
    return null;
  }
}

const initiationSchema = z.object({
  pidx: z.string().min(1).max(200),
  payment_url: z.string().url(),
  expires_at: z.string().datetime({ offset: true }),
});
const lookupSchema = z.object({
  pidx: z.string().min(1).max(200),
  total_amount: z.number().int().nonnegative().safe(),
  status: z.enum([
    'Completed',
    'Pending',
    'Initiated',
    'Expired',
    'User canceled',
    'Refunded',
    'Partially Refunded',
  ]),
  transaction_id: z.string().min(1).max(200).nullable(),
  refunded: z.boolean(),
});

/** KPG-2 web checkout, amounts already stored in paisa throughout this application. */
export class KhaltiProvider implements PaymentProvider {
  name = 'KHALTI';
  constructor(
    private config: KhaltiConfig,
    private fetcher: typeof fetch = fetch,
  ) {}

  private async request(path: 'initiate' | 'lookup', data: Record<string, unknown>) {
    let response: Response;
    try {
      response = await this.fetcher(
        `${this.config.environment === 'production' ? 'https://khalti.com' : 'https://dev.khalti.com'}/api/v2/epayment/${path}/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Key ${this.config.secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
          signal: AbortSignal.timeout(8_000),
          redirect: 'error',
        },
      );
    } catch {
      throw new AppError(
        503,
        'PAYMENT_PROVIDER_UNAVAILABLE',
        'Khalti could not be reached. Your payment status has not been changed. Try verification again shortly.',
      );
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new AppError(
        502,
        'PAYMENT_PROVIDER_INVALID_RESPONSE',
        'Khalti returned an unreadable response. Please try verifying your payment again.',
      );
    }
    // Khalti documents HTTP 400 for authenticated Expired / User canceled lookups.
    const terminalLookup =
      path === 'lookup' && response.status === 400 && lookupSchema.safeParse(body).success;
    if (!response.ok && !terminalLookup)
      throw new AppError(
        503,
        response.status >= 400 && response.status < 500 && path === 'initiate'
          ? 'PAYMENT_INITIATION_REJECTED'
          : 'PAYMENT_PROVIDER_UNAVAILABLE',
        'Khalti could not complete this request. Your reservation is saved. Contact the store if the issue continues.',
      );
    return body;
  }

  async createPayment(
    input: Parameters<PaymentProvider['createPayment']>[0],
  ): Promise<PaymentInitiation> {
    if (input.currency !== 'NPR' || !Number.isSafeInteger(input.amount) || input.amount < 1000)
      throw new AppError(
        422,
        'PAYMENT_AMOUNT_UNSUPPORTED',
        'Khalti requires a payment of at least NPR 10 in Nepalese rupees. Complete smaller balances at the store.',
      );
    const returnUrl = new URL('/confirmation', this.config.origin);
    returnUrl.searchParams.set('payment', input.paymentId);
    returnUrl.searchParams.set('order', input.orderId);
    const body = initiationSchema.safeParse(
      await this.request('initiate', {
        return_url: returnUrl.toString(),
        website_url: this.config.origin,
        amount: input.amount,
        purchase_order_id: input.paymentId,
        purchase_order_name: input.orderNumber,
        merchant_order_id: input.orderId,
      }),
    );
    if (!body.success)
      throw new AppError(
        502,
        'PAYMENT_PROVIDER_INVALID_RESPONSE',
        'Khalti did not return a valid payment session. Contact the store before trying again.',
      );
    const url = new URL(body.data.payment_url);
    const allowedHost =
      this.config.environment === 'production' ? 'pay.khalti.com' : 'test-pay.khalti.com';
    const expiresAt = new Date(body.data.expires_at);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== allowedHost ||
      url.port ||
      url.username ||
      url.password ||
      expiresAt <= new Date()
    )
      throw new AppError(
        502,
        'PAYMENT_PROVIDER_INVALID_RESPONSE',
        'Khalti did not return a valid payment session. Contact the store before trying again.',
      );
    return { reference: body.data.pidx, url: url.toString(), expiresAt };
  }

  async verifyPayment(reference: string): Promise<PaymentVerification> {
    const result = lookupSchema.safeParse(await this.request('lookup', { pidx: reference }));
    if (
      !result.success ||
      result.data.pidx !== reference ||
      (result.data.status === 'Completed' && (!result.data.transaction_id || result.data.refunded))
    )
      throw new AppError(
        502,
        'PAYMENT_VERIFICATION_INVALID',
        'The payment response could not be verified. Contact the store with your order number.',
      );
    const data = result.data;
    const status =
      data.status === 'Completed'
        ? 'COMPLETED'
        : data.status === 'Expired'
          ? 'EXPIRED'
          : data.status === 'User canceled'
            ? 'CANCELLED'
            : data.refunded || ['Refunded', 'Partially Refunded'].includes(data.status)
              ? 'REFUNDED'
              : 'PENDING';
    return {
      reference: data.pidx,
      transactionId: data.transaction_id,
      amount: data.total_amount,
      currency: 'NPR',
      status,
    };
  }
}

export function getPaymentProvider(): PaymentProvider {
  const config = khaltiConfig();
  return config ? new KhaltiProvider(config) : new UnconfiguredProvider();
}
