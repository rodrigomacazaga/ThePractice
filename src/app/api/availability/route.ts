import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDayGrid } from "@/lib/bookings/engine";

export const dynamic = "force-dynamic";

/** GET /api/availability?locationId=...&date=YYYY-MM-DD */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const locationId = req.nextUrl.searchParams.get("locationId");
  const date = req.nextUrl.searchParams.get("date");
  if (!locationId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Parámetros inválidos" }, { status: 422 });
  }

  const location = await db.location.findUnique({
    where: { id: locationId },
    include: {
      rooms: { where: { active: true }, include: { roomType: true }, orderBy: { name: "asc" } },
    },
  });
  if (!location) {
    return NextResponse.json({ error: "Ubicación no encontrada" }, { status: 404 });
  }

  const grid = await getDayGrid({
    roomIds: location.rooms.map((r) => r.id),
    dateStr: date,
    timezone: location.timezone,
    openingHour: location.openingHour,
    closingHour: location.closingHour,
  });

  return NextResponse.json({
    openingHour: location.openingHour,
    closingHour: location.closingHour,
    rooms: location.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      roomType: room.roomType.name,
      creditsPerHour: room.roomType.creditsPerHour,
      baseHourlyPriceCents:
        room.hourlyPriceCentsOverride ?? room.roomType.baseHourlyPriceCents,
      memberHourlyPriceCents: room.roomType.memberHourlyPriceCents,
      takenHours: grid.find((g) => g.roomId === room.id)?.takenHours ?? [],
    })),
  });
}
