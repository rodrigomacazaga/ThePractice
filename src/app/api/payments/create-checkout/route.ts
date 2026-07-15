import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { isFounderEligible } from "@/lib/founder";

export const dynamic = "force-dynamic";

const checkoutSchema = z.object({
  kind: z.enum(["MEMBERSHIP", "PACKAGE"]),
  code: z.string().min(1), // planCode o packageCode
  founder: z.boolean().optional(),
});

/**
 * Crea un Payment PENDING + checkout del proveedor para membresías y
 * paquetes. (Las reservas con tarjeta crean su checkout en /api/bookings.)
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PRACTITIONER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 422 });
  }
  const { kind, code, founder } = parsed.data;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let amountCents: number;
  let description: string;
  const metadata: Record<string, string> = {};

  if (kind === "MEMBERSHIP") {
    const plan = await db.membershipPlan.findUnique({ where: { code } });
    if (!plan || !plan.active) {
      return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });
    }
    // El precio founder se valida server-side contra la elegibilidad real
    // (lead que aseguró su lugar + ventana abierta), nunca contra el body.
    const useFounder =
      founder === true &&
      plan.founderPriceCents != null &&
      (await isFounderEligible(session.user.email));
    amountCents = useFounder ? plan.founderPriceCents! : plan.monthlyPriceCents;
    description = `Membresía ${plan.name}${useFounder ? " (founder)" : ""} — The Practice`;
    metadata.planCode = plan.code;
    if (useFounder) metadata.founder = "1";
  } else {
    const pkg = await db.hourPackage.findUnique({ where: { code } });
    if (!pkg || !pkg.active) {
      return NextResponse.json({ error: "Paquete no encontrado" }, { status: 404 });
    }
    amountCents = pkg.priceCents;
    description = `Paquete ${pkg.name} — The Practice`;
    metadata.packageCode = pkg.code;
  }

  const payment = await db.payment.create({
    data: {
      userId: session.user.id,
      provider: getPaymentProvider().name,
      kind,
      status: "PENDING",
      amountCents,
      currency: "MXN",
      description,
      metadata,
    },
  });

  const successUrl = `${appUrl}/practitioner/payments?status=success`;
  const cancelUrl = `${appUrl}/practitioner/payments?status=cancelled`;

  try {
    const checkout = await getPaymentProvider().createCheckout({
      paymentId: payment.id,
      userId: session.user.id,
      kind,
      amountCents,
      currency: "MXN",
      description,
      successUrl,
      cancelUrl,
      customerEmail: session.user.email ?? undefined,
      metadata,
    });

    await db.payment.update({
      where: { id: payment.id },
      data: { providerRef: checkout.providerRef },
    });

    return NextResponse.json({ redirectUrl: checkout.redirectUrl });
  } catch (err) {
    console.error("[checkout] provider error:", err);
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return NextResponse.json({ error: "No se pudo iniciar el pago" }, { status: 502 });
  }
}
