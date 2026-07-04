import type { PaymentKind } from "@prisma/client";

/**
 * Abstracción de pagos. El sistema NUNCA habla con Stripe/Mercado Pago
 * directamente: siempre a través de PaymentProvider. Cambiar de proveedor
 * es cambiar PAYMENT_PROVIDER en el entorno.
 */

export interface CheckoutParams {
  /** id del Payment interno (ya creado en estado PENDING) */
  paymentId: string;
  userId: string;
  kind: PaymentKind;
  amountCents: number;
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSession {
  /** URL a la que se redirige al usuario para pagar */
  redirectUrl: string;
  /** Referencia del proveedor (checkout session id / preference id) */
  providerRef: string;
}

export interface RefundParams {
  providerRef: string;
  amountCents?: number; // undefined = reembolso total
  reason?: string;
}

export interface RefundResult {
  providerRef: string;
  refundedCents: number;
}

export interface WebhookVerification {
  valid: boolean;
  eventId?: string;
  type?: string;
  payload?: unknown;
  error?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(params: CheckoutParams): Promise<CheckoutSession>;
  refund(params: RefundParams): Promise<RefundResult>;
  /** Verifica firma del webhook y extrae el evento. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookVerification>;
}
