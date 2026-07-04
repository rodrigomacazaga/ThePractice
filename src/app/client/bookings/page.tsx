import { CalendarDays } from "lucide-react";
import { requireClient } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDateTimeMX, formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function ClientBookingsPage() {
  const { profile } = await requireClient();
  const bookings = await db.booking.findMany({
    where: { clientId: profile.id },
    orderBy: { startsAt: "desc" },
    take: 50,
    include: {
      practitioner: { include: { user: { select: { name: true } } } },
      service: true,
      location: true,
    },
  });

  return (
    <>
      <PageHeader title="Mis sesiones" description="Historial y próximas sesiones." />

      {bookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Sin sesiones"
          description="Cuando reserves con un profesional, tus sesiones aparecerán aquí."
          action={<ButtonLink href="/directory">Explorar directorio</ButtonLink>}
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-(--shadow-card)"
            >
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold">
                  {b.service?.name ?? "Sesión"} · {b.practitioner?.user.name}
                </p>
                <p className="mt-1 text-xs text-stone-deep">
                  {formatDateTimeMX(b.startsAt, b.location.timezone)} · The Practice{" "}
                  {b.location.shortName}
                  {b.priceCents != null && ` · ${formatMXN(b.priceCents)}`}
                </p>
              </div>
              <Badge variant={b.status === "CONFIRMED" ? "sage" : "default"}>{b.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
