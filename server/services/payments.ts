import { AppError } from '../core.js';
export interface PaymentProvider {
  name: string;
  createPayment(input: {
    orderId: string;
    amount: number;
    currency: string;
  }): Promise<{ reference: string; url: string }>;
  verifyPayment(reference: string): Promise<{ paid: boolean; amount: number; currency: string }>;
  refundPayment(reference: string, amount: number): Promise<{ reference: string; status: string }>;
  handleWebhook(
    rawBody: Buffer,
    signature: string,
  ): Promise<{ eventId: string; reference: string }>;
}
export class UnconfiguredProvider implements PaymentProvider {
  name = 'unconfigured';
  private unavailable(): never {
    throw new AppError(
      503,
      'PAYMENT_NOT_CONFIGURED',
      'Online payments are not enabled. Choose pay at store or contact support. No payment has been taken.',
    );
  }
  async createPayment(): Promise<never> {
    return this.unavailable();
  }
  async verifyPayment(): Promise<never> {
    return this.unavailable();
  }
  async refundPayment(): Promise<never> {
    return this.unavailable();
  }
  async handleWebhook(): Promise<never> {
    return this.unavailable();
  }
}
export const paymentProvider: PaymentProvider = new UnconfiguredProvider();
