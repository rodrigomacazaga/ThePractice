import { NextRequest, NextResponse } from "next/server";
import { fulfillPayment } from "@/lib/payments/fulfill";

export const dynamic = "force-dynamic";

/**
 * Confirmación del MockPaymentProvider: simula el retorno del checkout
 * marcando el pago como PAID y aplicando fulfillment. Con proveedores
 * reales este endpoint NO confirma nada (eso lo hacen los webhooks);
 * solo redirige de vuelta a la app.
 */
export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get("paymentId");
  const isMock = req.nextUrl.searchParams.get("mock") === "1";
  const redirectTo =
    req.nextUrl.searchParams.get("redirect") ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/practitioner`;

  if (paymentId && isMock && process.env.PAYMENT_PROVIDER !== "stripe" && process.env.PAYMENT_PROVIDER !== "mercado_pago") {
    await fulfillPayment(paymentId);
  }

  return NextResponse.redirect(redirectTo);
}
