import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { StripeProvider } from "@/lib/payments/stripe";
import { fulfillPayment, failPayment } from "@/lib/payments/fulfill";

export const dynamic = "force-dynamic";

/**
 * Webhook de Stripe. Idempotente: cada evento se registra en WebhookEvent
 * con unique(provider, eventId); los reintentos de Stripe no duplican
 * efectos (y fulfillPayment es idempotente por sí mismo).
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const provider = new StripeProvider();

  const verification = await provider.verifyWebhook(rawBody, req.headers);
  if (!verification.valid || !verification.eventId) {
    return NextResponse.json({ error: verification.error ?? "Invalid" }, { status: 400 });
  }

  // Registro idempotente del evento
  try {
    await db.webhookEvent.create({
      data: {
        provider: "stripe",
        eventId: verification.eventId,
        type: verification.type ?? "unknown",
        payload: JSON.parse(rawBody),
      },
    });
  } catch {
    // unique violation → evento ya recibido
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const event = verification.payload as {
      type: string;
      data: { object: { metadata?: Record<string, string>; client_reference_id?: string } };
    };
    const obj = event.data.object;
    const paymentId = obj.metadata?.paymentId ?? obj.client_reference_id;

    if (paymentId) {
      switch (event.type) {
        case "checkout.session.completed":
          await fulfillPayment(paymentId);
          break;
        case "checkout.session.expired":
        case "payment_intent.payment_failed":
          await failPayment(paymentId);
          break;
      }
    }

    await db.webhookEvent.updateMany({
      where: { provider: "stripe", eventId: verification.eventId },
      data: { processedAt: new Date() },
    });
  } catch (err) {
    console.error("[webhook:stripe] processing error:", err);
    await db.webhookEvent.updateMany({
      where: { provider: "stripe", eventId: verification.eventId },
      data: { error: String(err) },
    });
    // 500 → Stripe reintenta
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
