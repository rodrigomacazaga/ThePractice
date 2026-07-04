import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatCredits, formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ActionButton } from "@/components/dashboard/action-form";
import { toggleRoomActive } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminRoomsPage() {
  await requireAdmin();

  const rooms = await db.room.findMany({
    include: { location: true, roomType: true, _count: { select: { bookings: true } } },
    orderBy: [{ location: { sort: "asc" } }, { roomType: { sort: "asc" } }, { name: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Salas"
        description="Inventario de salas por ubicación. Los precios base se configuran por tipo de sala en Planes y precios."
      />

      <Table>
        <THead>
          <TR>
            <TH>Sala</TH>
            <TH>Ubicación</TH>
            <TH>Tipo</TH>
            <TH className="text-right">Precio/hora</TH>
            <TH className="text-right">Créditos/h</TH>
            <TH className="text-right">Reservas</TH>
            <TH>Estado</TH>
            <TH></TH>
          </TR>
        </THead>
        <TBody>
          {rooms.map((room) => {
            const toggle = toggleRoomActive.bind(null, room.id);
            return (
              <TR key={room.id}>
                <TD className="font-display font-bold">{room.name}</TD>
                <TD>{room.location.shortName}</TD>
                <TD>{room.roomType.name}</TD>
                <TD className="text-right">
                  {formatMXN(room.hourlyPriceCentsOverride ?? room.roomType.baseHourlyPriceCents)}
                  {room.hourlyPriceCentsOverride != null && (
                    <span className="block text-[10px] text-stone">override</span>
                  )}
                </TD>
                <TD className="text-right">{formatCredits(room.roomType.creditsPerHour)}</TD>
                <TD className="text-right">{room._count.bookings}</TD>
                <TD>
                  <Badge variant={room.active ? "sage" : "default"}>
                    {room.active ? "Activa" : "Inactiva"}
                  </Badge>
                </TD>
                <TD>
                  <ActionButton
                    action={toggle}
                    label={room.active ? "Desactivar" : "Activar"}
                    variant="ghost"
                  />
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </>
  );
}
