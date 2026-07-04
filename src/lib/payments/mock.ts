import type {
  CheckoutParams,
  CheckoutSession,
  PaymentProvider,
  RefundParams,
  RefundResult,
  WebhookVerification,
} from "./types";

/**
 * Proveedor simulado para desarrollo, previews y demos.
 * El "checkout" redirige a una página interna que confirma el pago
 * inmediatamente (/api/payments/confirm?paymentId=...&mock=1).
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async createCheckout(params: CheckoutParams): Promise<CheckoutSession> {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const url = new URL("/api/payments/confirm", base);
    url.searchParams.set("paymentId", params.paymentId);
    url.searchParams.set("mock", "1");
    url.searchParams.set("redirect", params.successUrl);
    return {
      redirectUrl: url.toString(),
      providerRef: `mock_${params.paymentId}`,
    };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    return {
      providerRef: `mock_refund_${params.providerRef}`,
      refundedCents: params.amountCents ?? 0,
    };
  }

  async verifyWebhook(rawBody: string): Promise<WebhookVerification> {
    try {
      const payload = JSON.parse(rawBody);
      return {
        valid: true,
        eventId: payload.id ?? `mock_${Date.now()}`,
        type: payload.type ?? "mock.event",
        payload,
      };
    } catch {
      return { valid: false, error: "Invalid JSON" };
    }
  }
}
