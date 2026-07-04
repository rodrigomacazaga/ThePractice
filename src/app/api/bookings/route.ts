import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createRoomBooking, BookingError } from "@/lib/bookings/engine";
import { getPaymentProvider } from "@/lib/payments";
import { sendEmailSafe, emailTemplates } from "@/lib/email";
import { formatDateTimeMX } from "@/lib/utils";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  roomId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startHour: z.number().int().min(0).max(23),
  hours: z.number().int().min(1).max(8),
  payWith: z.enum(["credits", "card"]),
  notes: z.string().max(500).optional(),
});

/** POST /api/bookings — crea reserva de sala (practitioner). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PRACTITIONER") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const profile = await db.practitionerProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return NextResponse.json({ error: "Perfil no encontrado" }, { status: 404 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 422 });
  }
  const input = parsed.data;

  try {
    const { booking, amountCents } = await createRoomBooking({
      roomId: input.roomId,
      practitionerId: profile.id,
      createdById: session.user.id,
      dateStr: input.date,
      startHour: input.startHour,
      hours: input.hours,
      payWith: input.payWith,
      notes: input.notes,
    });

    if (input.payWith === "credits") {
      // Confirmada de inmediato — enviar email con código de acceso
      const full = await db.booking.findUnique({
        where: { id: booking.id },
        include: { room: true, location: true },
      });
      if (full?.room) {
        await sendEmailSafe({
          to: session.user.email ?? "",
          ...emailTemplates.bookingConfirmed(
            session.user.name?.split(" ")[0] ?? "practitioner",
            full.room.name,
            formatDateTimeMX(full.startsAt, full.location.timezone),
            full.accessCode ?? ""
          ),
        });
      }
      return NextResponse.json({ ok: true, bookingId: booking.id, status: booking.status });
    }

    // payWith === "card": crear Payment + checkout
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const payment = await db.payment.create({
      data: {
        userId: session.user.id,
        provider: getPaymentProvider().name,
        kind: "BOOKING",
        status: "PENDING",
        amountCents: amountCents ?? 0,
        currency: "MXN",
        description: `Reserva de sala ${booking.code}`,
        metadata: { bookingId: booking.id },
      },
    });
    await db.booking.update({
      where: { id: booking.id },
      data: { paymentId: payment.id },
    });

    const checkout = await getPaymentProvider().createCheckout({
      paymentId: payment.id,
      userId: session.user.id,
      kind: "BOOKING",
      amountCents: amountCents ?? 0,
      currency: "MXN",
      description: `Reserva ${booking.code} — The Practice`,
      successUrl: `${appUrl}/practitioner/calendar?status=paid`,
      cancelUrl: `${appUrl}/practitioner/book?status=cancelled`,
      customerEmail: session.user.email ?? undefined,
      metadata: { bookingId: booking.id },
    });

    await db.payment.update({
      where: { id: payment.id },
      data: { providerRef: checkout.providerRef },
    });

    return NextResponse.json({
      ok: true,
      bookingId: booking.id,
      status: booking.status,
      redirectUrl: checkout.redirectUrl,
    });
  } catch (err) {
    if (err instanceof BookingError) {
      const status =
        err.code === "SLOT_TAKEN" ? 409 : err.code === "INSUFFICIENT_CREDITS" ? 402 : 422;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    console.error("[bookings] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
