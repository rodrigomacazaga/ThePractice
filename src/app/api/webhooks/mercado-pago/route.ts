import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MercadoPagoProvider } from "@/lib/payments/mercado-pago";
import { fulfillPayment, failPayment } from "@/lib/payments/fulfill";

export const dynamic = "force-dynamic";

/**
 * Webhook de Mercado Pago. Tras verificar la firma, consulta el pago en
 * la API de MP para conocer su estado real y el external_reference
 * (nuestro paymentId interno).
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const provider = new MercadoPagoProvider();

  const verification = await provider.verifyWebhook(rawBody, req.headers);
  if (!verification.valid || !verification.eventId) {
    return NextResponse.json({ error: verification.error ?? "Invalid" }, { status: 400 });
  }

  try {
    await db.webhookEvent.create({
      data: {
        provider: "mercado_pago",
        eventId: verification.eventId,
        type: verification.type ?? "unknown",
        payload: JSON.parse(rawBody),
      },
    });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const payload = verification.payload as { data?: { id?: string }; type?: string };
    const mpPaymentId = payload.data?.id;

    if (mpPaymentId && payload.type === "payment") {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` },
      });
      if (res.ok) {
        const mpPayment = (await res.json()) as {
          status: string;
          external_reference?: string;
        };
        const internalId = mpPayment.external_reference;
        if (internalId) {
          if (mpPayment.status === "approved") {
            await fulfillPayment(internalId);
          } else if (["rejected", "cancelled"].includes(mpPayment.status)) {
            await failPayment(internalId);
          }
        }
      }
    }

    await db.webhookEvent.updateMany({
      where: { provider: "mercado_pago", eventId: verification.eventId },
      data: { processedAt: new Date() },
    });
  } catch (err) {
    console.error("[webhook:mp] processing error:", err);
    await db.webhookEvent.updateMany({
      where: { provider: "mercado_pago", eventId: verification.eventId },
      data: { error: String(err) },
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
