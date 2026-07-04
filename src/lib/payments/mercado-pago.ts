import { createHmac, timingSafeEqual } from "crypto";
import type {
  CheckoutParams,
  CheckoutSession,
  PaymentProvider,
  RefundParams,
  RefundResult,
  WebhookVerification,
} from "./types";

/**
 * Mercado Pago vía Checkout Pro (preferences API), REST directa.
 * Relevante para México: soporta tarjetas locales, OXXO y SPEI
 * según configuración de la cuenta.
 */
export class MercadoPagoProvider implements PaymentProvider {
  readonly name = "mercado_pago";
  private token = process.env.MERCADO_PAGO_ACCESS_TOKEN ?? "";
  private webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET ?? "";

  async createCheckout(params: CheckoutParams): Promise<CheckoutSession> {
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": params.paymentId,
      },
      body: JSON.stringify({
        items: [
          {
            title: params.description,
            quantity: 1,
            currency_id: params.currency,
            unit_price: params.amountCents / 100,
          },
        ],
        external_reference: params.paymentId,
        back_urls: {
          success: params.successUrl,
          failure: params.cancelUrl,
          pending: params.successUrl,
        },
        auto_return: "approved",
        metadata: { payment_id: params.paymentId, kind: params.kind },
        payer: params.customerEmail ? { email: params.customerEmail } : undefined,
      }),
    });
    if (!res.ok) {
      throw new Error(`Mercado Pago preference failed (${res.status}): ${await res.text()}`);
    }
    const pref = await res.json();
    return { redirectUrl: pref.init_point, providerRef: pref.id };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    const body =
      params.amountCents != null ? JSON.stringify({ amount: params.amountCents / 100 }) : undefined;
    const res = await fetch(
      `https://api.mercadopago.com/v1/payments/${params.providerRef}/refunds`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body,
      }
    );
    if (!res.ok) {
      throw new Error(`Mercado Pago refund failed (${res.status}): ${await res.text()}`);
    }
    const refund = await res.json();
    return {
      providerRef: String(refund.id),
      refundedCents: Math.round((refund.amount ?? 0) * 100),
    };
  }

  /**
   * Verificación de firma x-signature (ts=...,v1=...) según docs de MP.
   * manifest: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
   */
  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookVerification> {
    const signature = headers.get("x-signature");
    const requestId = headers.get("x-request-id") ?? "";
    if (!signature || !this.webhookSecret) {
      return { valid: false, error: "Missing signature or secret" };
    }
    const parts = Object.fromEntries(
      signature.split(",").map((p) => p.trim().split("=") as [string, string])
    );
    const ts = parts.ts;
    const v1 = parts.v1;
    if (!ts || !v1) return { valid: false, error: "Malformed signature" };

    let payload: { data?: { id?: string }; id?: string; type?: string; action?: string };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return { valid: false, error: "Invalid JSON" };
    }

    const dataId = payload.data?.id ?? "";
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const signed = createHmac("sha256", this.webhookSecret).update(manifest).digest("hex");

    const a = Buffer.from(signed);
    const b = Buffer.from(v1);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { valid: false, error: "Signature mismatch" };
    }

    return {
      valid: true,
      eventId: `${payload.type ?? "payment"}_${dataId}`,
      type: payload.action ?? payload.type ?? "payment.updated",
      payload,
    };
  }
}
