import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkInBooking, BookingError } from "@/lib/bookings/engine";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: { practitioner: true },
  });
  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });
  }

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(session.user.role);
  const isOwner = booking.practitioner?.userId === session.user.id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  try {
    const updated = await checkInBooking(id, session.user.id);
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (err) {
    if (err instanceof BookingError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 422 });
    }
    console.error("[bookings:checkin] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
