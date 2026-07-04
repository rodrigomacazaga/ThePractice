import { redirect } from "next/navigation";
import { TZDate } from "@date-fns/tz";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { requirePractitioner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { getDayGrid } from "@/lib/bookings/engine";
import { PageHeader } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { DoorClosed } from "lucide-react";
import { BookingClient, type BookingDay, type BookingRoom } from "./booking-client";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ location?: string; date?: string }>;
}

export default async function BookRoomPage({ searchParams }: Props) {
  const { profile } = await requirePractitioner();
  const sp = await searchParams;

  const locations = await db.location.findMany({
    where: { status: "OPEN" },
    orderBy: { sort: "asc" },
  });

  if (locations.length === 0) {
    return (
      <>
        <PageHeader title="Reservar sala" />
        <EmptyState
          icon={DoorClosed}
          title="Aún no hay ubicaciones abiertas"
          description="Muy pronto: The Practice La Ceiba."
        />
      </>
    );
  }

  const location =
    locations.find((l) => l.slug === sp.location) ?? locations[0]!;

  // Días disponibles: hoy + 13 (en TZ de la ubicación)
  const todayTz = new TZDate(new Date(), location.timezone);
  const days: BookingDay[] = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(todayTz, i);
    return {
      dateStr: format(d, "yyyy-MM-dd"),
      label: format(d, "EEE d", { locale: es }),
      monthLabel: format(d, "MMM", { locale: es }),
    };
  });

  const dateStr = days.some((d) => d.dateStr === sp.date) ? sp.date! : days[0]!.dateStr;
  if (sp.date && !days.some((d) => d.dateStr === sp.date)) {
    redirect(`/practitioner/book?location=${location.slug}&date=${dateStr}`);
  }

  const rooms = await db.room.findMany({
    where: { locationId: location.id, active: true },
    include: { roomType: true },
    orderBy: [{ roomType: { sort: "asc" } }, { name: "asc" }],
  });

  const grid = await getDayGrid({
    roomIds: rooms.map((r) => r.id),
    dateStr,
    timezone: location.timezone,
    openingHour: location.openingHour,
    closingHour: location.closingHour,
  });

  const hasMembership = profile.membership?.status === "ACTIVE";
  const bookingRooms: BookingRoom[] = rooms.map((room) => ({
    id: room.id,
    name: room.name,
    typeName: room.roomType.name,
    typeCode: room.roomType.code,
    creditsPerHour: room.roomType.creditsPerHour,
    hourlyPriceCents:
      room.hourlyPriceCentsOverride ??
      (hasMembership && room.roomType.memberHourlyPriceCents != null
        ? room.roomType.memberHourlyPriceCents
        : room.roomType.baseHourlyPriceCents),
    takenHours: grid.find((g) => g.roomId === room.id)?.takenHours ?? [],
  }));

  // Horas ya pasadas del día actual no se pueden reservar
  const nowHourTz =
    dateStr === days[0]!.dateStr ? new TZDate(new Date(), location.timezone).getHours() : -1;

  return (
    <>
      <PageHeader
        title="Reservar sala"
        description={`${location.name} · ${location.openingHour}:00–${location.closingHour}:00`}
      />
      <BookingClient
        locations={locations.map((l) => ({ slug: l.slug, name: l.shortName }))}
        currentLocation={location.slug}
        days={days}
        currentDate={dateStr}
        rooms={bookingRooms}
        openingHour={location.openingHour}
        closingHour={location.closingHour}
        pastCutoffHour={nowHourTz}
        walletBalance={profile.wallet?.balance ?? 0}
        isApproved={profile.verificationStatus === "APPROVED"}
      />
    </>
  );
}
