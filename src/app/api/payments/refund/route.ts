import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const refundSchema = z.object({
  paymentId: z.string().min(1),
  amountCents: z.number().int().positive().optional(),
  reason: z.string().max(300).optional(),
});

/** Reembolsos: solo admin. Parcial o total. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const parsed = refundSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 422 });
  }

  const payment = await db.payment.findUnique({ where: { id: parsed.data.paymentId } });
  if (!payment || payment.status !== "PAID" && payment.status !== "PARTIALLY_REFUNDED") {
    return NextResponse.json({ error: "Pago no reembolsable" }, { status: 409 });
  }

  const maxRefundable = payment.amountCents - payment.refundedCents;
  const amount = parsed.data.amountCents ?? maxRefundable;
  if (amount > maxRefundable) {
    return NextResponse.json({ error: "Monto excede lo reembolsable" }, { status: 422 });
  }

  try {
    await getPaymentProvider().refund({
      providerRef: payment.providerRef ?? payment.id,
      amountCents: amount,
      reason: parsed.data.reason,
    });
  } catch (err) {
    console.error("[refund] provider error:", err);
    return NextResponse.json({ error: "El proveedor rechazó el reembolso" }, { status: 502 });
  }

  const newRefunded = payment.refundedCents + amount;
  await db.payment.update({
    where: { id: payment.id },
    data: {
      refundedCents: newRefunded,
      status: newRefunded >= payment.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED",
    },
  });

  await audit({
    actorId: session.user.id,
    action: "payment.refunded",
    entity: "Payment",
    entityId: payment.id,
    data: { amountCents: amount, reason: parsed.data.reason },
  });

  return NextResponse.json({ ok: true });
}
