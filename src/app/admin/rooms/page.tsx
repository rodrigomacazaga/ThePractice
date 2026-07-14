import { Plus } from "lucide-react";
import type { Room, RoomType } from "@prisma/client";
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

/**
 * Campos compartidos entre alta y edición. Los tipos ofrecidos son los del
 * establecimiento: cada sala pertenece a un tipo de su propia ubicación.
 */
function RoomFields({
  room,
  locationId,
  roomTypes,
}: {
  room?: Room;
  locationId: string;
  roomTypes: RoomType[];
}) {
  const uid = room?.id ?? `new-${locationId}`;
  return (
    <>
      {room && <input type="hidden" name="roomId" value={room.id} />}
      <input type="hidden" name="locationId" value={locationId} />
      <div className="grid gap-3 sm:grid-cols-2">
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
      </div>
      <div className="mt-3">
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

  const locations = await db.location.findMany({
    orderBy: { sort: "asc" },
    include: {
      roomTypes: { orderBy: { sort: "asc" } },
      rooms: {
        include: { roomType: true, _count: { select: { bookings: true } } },
        orderBy: [{ roomType: { sort: "asc" } }, { name: "asc" }],
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Salas"
        description="Inventario por establecimiento. Cada sala pertenece a un tipo de sala de su ubicación; los precios base se configuran por tipo en Planes y precios."
      />

      {locations.map((loc) => (
        <section key={loc.id} className="mb-12">
          <h2 className="eyebrow">
            {loc.shortName} · {loc.rooms.length}{" "}
            {loc.rooms.length === 1 ? "sala" : "salas"}
          </h2>

          {loc.rooms.length > 0 && (
            <div className="mt-4">
              <Table>
                <THead>
                  <TR>
                    <TH>Sala</TH>
                    <TH>Tipo</TH>
                    <TH className="text-right">Precio/hora</TH>
                    <TH className="text-right">Créditos/h</TH>
                    <TH className="text-right">Reservas</TH>
                    <TH>Estado</TH>
                    <TH></TH>
                  </TR>
                </THead>
                <TBody>
                  {loc.rooms.map((room) => {
                    const toggle = toggleRoomActive.bind(null, room.id);
                    return (
                      <TR key={room.id}>
                        <TD className="font-display font-bold">{room.name}</TD>
                        <TD>{room.roomType.name}</TD>
                        <TD className="text-right">
                          {formatMXN(
                            room.hourlyPriceCentsOverride ?? room.roomType.baseHourlyPriceCents
                          )}
                          {room.hourlyPriceCentsOverride != null && (
                            <span className="block text-[10px] text-stone">override</span>
                          )}
                        </TD>
                        <TD className="text-right">
                          {formatCredits(room.roomType.creditsPerHour)}
                        </TD>
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
            </div>
          )}

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-4.5 w-4.5 text-clay" /> Nueva sala en {loc.shortName}
                </CardTitle>
                <CardDescription>
                  Hereda precio y créditos de su tipo, salvo override. El identificador se
                  genera del nombre (ej. “Online 02” →{" "}
                  <span className="font-mono">online-02</span>).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loc.roomTypes.length > 0 ? (
                  <ActionForm action={upsertRoom} submitLabel="Crear sala">
                    <RoomFields locationId={loc.id} roomTypes={loc.roomTypes} />
                  </ActionForm>
                ) : (
                  <p className="text-sm text-stone">
                    Este establecimiento aún no tiene tipos de sala. Créalos primero en{" "}
                    <span className="font-semibold">Planes y precios</span>.
                  </p>
                )}
              </CardContent>
            </Card>

            {loc.rooms.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Editar salas</CardTitle>
                  <CardDescription>
                    Atributos por sala: tipo, descripción, amenidades y override de precio.
                    Para mover una sala de ubicación, desactívala y créala en la nueva.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {loc.rooms.map((room) => (
                    <details key={room.id} className="rounded-xl bg-paper px-4 py-3">
                      <summary className="cursor-pointer text-sm font-semibold">
                        {room.name}{" "}
                        <span className="font-normal text-stone">· {room.roomType.name}</span>
                      </summary>
                      <ActionForm
                        action={upsertRoom}
                        submitLabel="Guardar cambios"
                        className="mt-4"
                      >
                        <RoomFields room={room} locationId={loc.id} roomTypes={loc.roomTypes} />
                      </ActionForm>
                    </details>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      ))}
    </>
  );
}
