import { Users } from "lucide-react";
import { requirePractitioner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDateTimeMX, formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ClientBookingsPage() {
  const { profile } = await requirePractitioner();
  const bookings = await db.booking.findMany({
    where: { practitionerId: profile.id, kind: "CLIENT_SESSION" },
    orderBy: { startsAt: "desc" },
    take: 50,
    include: {
      client: { include: { user: { select: { name: true, email: true } } } },
      service: true,
      location: true,
    },
  });

  return (
    <>
      <PageHeader
        title="Reservas de clientes"
        description="Sesiones que tus clientes reservaron contigo."
      />

      {bookings.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin reservas de clientes"
          description="Activa “Permitir solicitudes de reserva” en tu micrositio para que tus clientes puedan reservar contigo online."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Cliente</TH>
              <TH>Servicio</TH>
              <TH>Fecha</TH>
              <TH>Monto</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {bookings.map((b) => (
              <TR key={b.id}>
                <TD>
                  <p className="font-medium">{b.client?.user.name ?? "—"}</p>
                  <p className="text-xs text-stone">{b.client?.user.email}</p>
                </TD>
                <TD>{b.service?.name ?? "Sesión"}</TD>
                <TD className="whitespace-nowrap">
                  {formatDateTimeMX(b.startsAt, b.location.timezone)}
                </TD>
                <TD>{b.priceCents != null ? formatMXN(b.priceCents) : "—"}</TD>
                <TD>
                  <Badge variant={b.status === "CONFIRMED" ? "sage" : "default"}>
                    {b.status}
                  </Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
