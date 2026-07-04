import { CalendarDays } from "lucide-react";
import { requirePractitioner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { BookingList } from "./booking-list";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const { profile } = await requirePractitioner();
  const now = new Date();

  const [upcoming, past] = await Promise.all([
    db.booking.findMany({
      where: { practitionerId: profile.id, endsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      include: { room: { include: { roomType: true } }, location: true },
    }),
    db.booking.findMany({
      where: { practitionerId: profile.id, endsAt: { lt: now } },
      orderBy: { startsAt: "desc" },
      take: 20,
      include: { room: { include: { roomType: true } }, location: true },
    }),
  ]);

  const serialize = (bookings: typeof upcoming) =>
    bookings.map((b) => ({
      id: b.id,
      code: b.code,
      status: b.status,
      kind: b.kind,
      roomName: b.room?.name ?? "—",
      roomType: b.room?.roomType.name ?? "",
      locationName: b.location.shortName,
      timezone: b.location.timezone,
      startsAt: b.startsAt.toISOString(),
      endsAt: b.endsAt.toISOString(),
      creditsUsed: b.creditsUsed,
      priceCents: b.priceCents,
      accessCode: b.accessCode,
      checkedInAt: b.checkedInAt?.toISOString() ?? null,
    }));

  return (
    <>
      <PageHeader
        title="Mi calendario"
        description="Tus reservas de sala y sesiones."
        actions={<ButtonLink href="/practitioner/book">Reservar sala</ButtonLink>}
      />

      {upcoming.length === 0 && past.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Sin reservas todavía"
          description="Cuando reserves una sala, aparecerá aquí con su código de acceso."
          action={<ButtonLink href="/practitioner/book">Reservar mi primera sala</ButtonLink>}
        />
      ) : (
        <BookingList upcoming={serialize(upcoming)} past={serialize(past)} />
      )}
    </>
  );
}
