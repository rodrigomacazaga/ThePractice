import { Plus } from "lucide-react";
import type { Location, Room, RoomType } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatCredits, formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, Input, Textarea, Select } from "@/components/ui/form";
import { ActionForm, ActionButton } from "@/components/dashboard/action-form";
import { toggleRoomActive, upsertRoom } from "../actions";

export const dynamic = "force-dynamic";

/** Campos compartidos entre alta y edición. Sin `room` es formulario de alta. */
function RoomFields({
  room,
  locations,
  roomTypes,
}: {
  room?: Room;
  locations: Location[];
  roomTypes: RoomType[];
}) {
  const uid = room?.id ?? "new";
  return (
    <>
      {room && <input type="hidden" name="roomId" value={room.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        {room ? (
          // La ubicación es fija al editar: una sala física no cambia de edificio.
          <input type="hidden" name="locationId" value={room.locationId} />
        ) : (
          <Field label="Establecimiento" htmlFor={`locationId-${uid}`}>
            <Select id={`locationId-${uid}`} name="locationId" required defaultValue="">
              <option value="" disabled>
                Selecciona…
              </option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.shortName}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Tipo de sala" htmlFor={`roomTypeId-${uid}`}>
          <Select
            id={`roomTypeId-${uid}`}
            name="roomTypeId"
            required
            defaultValue={room?.roomTypeId ?? ""}
          >
            <option value="" disabled>
              Selecciona…
            </option>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name} ({rt.code}){rt.active ? "" : " — inactivo"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Nombre" htmlFor={`name-${uid}`}>
          <Input
            id={`name-${uid}`}
            name="name"
            required
            placeholder="Online 02"
            defaultValue={room?.name}
          />
        </Field>
        <Field label="Precio/hora override (MXN, vacío = precio del tipo)" htmlFor={`po-${uid}`}>
          <Input
            id={`po-${uid}`}
            name="priceOverride"
            type="number"
            min={0}
            defaultValue={
              room?.hourlyPriceCentsOverride != null ? room.hourlyPriceCentsOverride / 100 : ""
            }
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Descripción" htmlFor={`description-${uid}`}>
          <Textarea
            id={`description-${uid}`}
            name="description"
            rows={2}
            defaultValue={room?.description ?? ""}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Amenidades (separadas por coma)" htmlFor={`amenities-${uid}`}>
          <Input
            id={`amenities-${uid}`}
            name="amenities"
            placeholder="Micrófono, Luz de video, Fondo profesional"
            defaultValue={room?.amenities.join(", ")}
          />
        </Field>
      </div>
    </>
  );
}

export default async function AdminRoomsPage() {
  await requireAdmin();

  const [rooms, locations, roomTypes] = await Promise.all([
    db.room.findMany({
      include: { location: true, roomType: true, _count: { select: { bookings: true } } },
      orderBy: [{ location: { sort: "asc" } }, { roomType: { sort: "asc" } }, { name: "asc" }],
    }),
    db.location.findMany({ orderBy: { sort: "asc" } }),
    db.roomType.findMany({ orderBy: { sort: "asc" } }),
  ]);

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

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4.5 w-4.5 text-clay" /> Nueva sala
            </CardTitle>
            <CardDescription>
              Se asigna a un establecimiento y hereda precio y créditos de su tipo, salvo
              override. El identificador se genera del nombre (ej. “Online 02” →{" "}
              <span className="font-mono">online-02</span>).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={upsertRoom} submitLabel="Crear sala">
              <RoomFields locations={locations} roomTypes={roomTypes} />
            </ActionForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Editar salas</CardTitle>
            <CardDescription>
              Atributos por sala: tipo, descripción, amenidades y override de precio. Para
              mover una sala de ubicación, desactívala y créala en la nueva.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {rooms.map((room) => (
              <details key={room.id} className="rounded-xl bg-paper px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold">
                  {room.name}{" "}
                  <span className="font-normal text-stone">
                    · {room.location.shortName} · {room.roomType.name}
                  </span>
                </summary>
                <ActionForm action={upsertRoom} submitLabel="Guardar cambios" className="mt-4">
                  <RoomFields room={room} locations={locations} roomTypes={roomTypes} />
                </ActionForm>
              </details>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
