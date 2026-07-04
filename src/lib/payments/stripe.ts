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
 * Stripe vía REST API directa (sin SDK): menos peso en cold-start
 * serverless y cero dependencias extra. La API de Stripe es estable
 * y form-encoded.
 */
export class StripeProvider implements PaymentProvider {
  readonly name = "stripe";
  private key = process.env.STRIPE_SECRET_KEY ?? "";
  private webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  private async post(path: string, body: Record<string, string>) {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body).toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Stripe ${path} failed (${res.status}): ${err}`);
    }
    return res.json();
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutSession> {
    const body: Record<string, string> = {
      mode: "payment",
      "line_items[0][price_data][currency]": params.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(params.amountCents),
      "line_items[0][price_data][product_data][name]": params.description,
      "line_items[0][quantity]": "1",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.paymentId,
      "metadata[paymentId]": params.paymentId,
      "metadata[kind]": params.kind,
    };
    if (params.customerEmail) body.customer_email = params.customerEmail;
    for (const [k, v] of Object.entries(params.metadata ?? {})) {
      body[`metadata[${k}]`] = v;
    }
    const session = await this.post("checkout/sessions", body);
    return { redirectUrl: session.url, providerRef: session.id };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    const body: Record<string, string> = {
      payment_intent: params.providerRef,
    };
    if (params.amountCents) body.amount = String(params.amountCents);
    if (params.reason) body.reason = "requested_by_customer";
    const refund = await this.post("refunds", body);
    return { providerRef: refund.id, refundedCents: refund.amount };
  }

  /** Verificación de firma según el esquema t=...,v1=... de Stripe. */
  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookVerification> {
    const signature = headers.get("stripe-signature");
    if (!signature || !this.webhookSecret) {
      return { valid: false, error: "Missing signature or secret" };
    }
    const parts = Object.fromEntries(
      signature.split(",").map((p) => p.split("=") as [string, string])
    );
    const timestamp = parts.t;
    const expected = parts.v1;
    if (!timestamp || !expected) return { valid: false, error: "Malformed signature" };

    // Tolerancia de 5 minutos contra replay attacks
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
      return { valid: false, error: "Timestamp outside tolerance" };
    }

    const signed = createHmac("sha256", this.webhookSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    const a = Buffer.from(signed);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { valid: false, error: "Signature mismatch" };
    }

    const payload = JSON.parse(rawBody);
    return { valid: true, eventId: payload.id, type: payload.type, payload };
  }
}
