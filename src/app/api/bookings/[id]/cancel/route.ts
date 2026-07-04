import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cancelRoomBooking, BookingError } from "@/lib/bookings/engine";
import { sendEmailSafe, emailTemplates } from "@/lib/email";
import { formatDateTimeMX } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      practitioner: { include: { user: true } },
      room: true,
      location: true,
    },
  });
  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  const isOwner = booking.practitioner?.userId === session.user.id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { reason?: string };

  try {
    const result = await cancelRoomBooking({
      bookingId: id,
      actorId: session.user.id,
      isAdmin,
      reason: body.reason,
    });

    if (booking.practitioner && booking.room) {
      await sendEmailSafe({
        to: booking.practitioner.user.email,
        ...emailTemplates.bookingCancelled(
          booking.practitioner.user.name.split(" ")[0] ?? "practitioner",
          booking.room.name,
          formatDateTimeMX(booking.startsAt, booking.location.timezone),
          result.wasLate
            ? "La cancelación fue tardía; se aplicó la política de créditos vigente."
            : `Se reintegraron ${result.refundedCredits} créditos a tu cuenta.`
        ),
      });
    }

    return NextResponse.json({
      ok: true,
      status: result.booking.status,
      refundedCredits: result.refundedCredits,
      wasLate: result.wasLate,
    });
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
    }
    console.error("[bookings:cancel] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
