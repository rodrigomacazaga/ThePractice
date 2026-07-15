import { CalendarDays } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatCredits, formatDateTimeMX, formatMXN, hourLabel } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { ActionButton, ActionForm } from "@/components/dashboard/action-form";
import { adminCancelBooking, createBlockAction } from "../actions";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "sage" | "amber" | "rust" | "default" | "ink"> = {
  CONFIRMED: "sage",
  PENDING_PAYMENT: "amber",
  CHECKED_IN: "ink",
  NO_SHOW: "rust",
  LATE_CANCELLED: "rust",
  ADMIN_BLOCKED: "default",
};

export default async function AdminBookingsPage() {
  await requireAdmin();

  const [locations, upcoming] = await Promise.all([
    db.location.findMany({
      orderBy: { sort: "asc" },
      include: { rooms: { where: { active: true }, orderBy: { name: "asc" } } },
    }),
    db.booking.findMany({
      where: { endsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 200,
      include: {
        room: true,
        location: true,
        practitioner: { include: { user: { select: { name: true } } } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Reservas"
        description="Reservas próximas y bloqueos administrativos por establecimiento."
      />

      <Tabs
        tabs={locations.map((loc) => ({
          id: loc.id,
          label: `${loc.shortName} · ${upcoming.filter((b) => b.locationId === loc.id).length}`,
        }))}
        panels={locations.map((loc) => {
          const bookings = upcoming.filter((b) => b.locationId === loc.id);
          const hourRange = Array.from(
            { length: Math.max(loc.closingHour - loc.openingHour, 1) },
            (_, i) => i + loc.openingHour
          );
          return (
            <div key={loc.id} className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
              <div>
                {bookings.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title="Sin reservas próximas"
                    description="Las reservas de practitioners y los bloqueos de esta sede aparecen aquí."
                  />
                ) : (
                  <div className="space-y-3">
                    {bookings.map((b) => {
                      const cancel = adminCancelBooking.bind(null, b.id);
                      const cancellable = [
                        "CONFIRMED",
                        "PENDING_PAYMENT",
                        "ADMIN_BLOCKED",
                      ].includes(b.status);
                      return (
                        <div
                          key={b.id}
                          className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-(--shadow-card)"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-display text-sm font-bold">
                                {b.room?.name ?? "—"} ·{" "}
                                {b.kind === "ADMIN_BLOCK"
                                  ? (b.notes ?? "Bloqueo")
                                  : (b.practitioner?.user.name ?? "—")}
                              </p>
                              <Badge variant={STATUS_VARIANT[b.status] ?? "default"}>
                                {b.status}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-stone-deep">
                              {formatDateTimeMX(b.startsAt, b.location.timezone)} ·{" "}
                              <span className="font-mono">{b.code}</span>
                              {b.creditsUsed != null &&
                                ` · ${formatCredits(b.creditsUsed)} cr`}
                              {b.priceCents != null && ` · ${formatMXN(b.priceCents)}`}
                            </p>
                          </div>
                          {cancellable && (
                            <ActionButton
                              action={cancel}
                              label="Cancelar"
                              variant="outline"
                              confirmText="¿Cancelar esta reserva? El practitioner recibe reembolso completo de créditos."
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CREAR BLOQUEO — horario real de la sede */}
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle>Bloquear horario</CardTitle>
                  <CardDescription>
                    Mantenimiento, eventos o salas fuera de servicio en {loc.shortName} (
                    {loc.openingHour}:00–{loc.closingHour}:00).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loc.rooms.length === 0 ? (
                    <p className="text-sm text-stone">
                      Esta sede aún no tiene salas activas.
                    </p>
                  ) : (
                    <ActionForm action={createBlockAction} submitLabel="Crear bloqueo">
                      <div className="space-y-4">
                        <Field label="Sala" htmlFor={`blk-room-${loc.id}`}>
                          <Select
                            id={`blk-room-${loc.id}`}
                            name="roomId"
                            required
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Selecciona sala
                            </option>
                            {loc.rooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                {room.name}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Fecha" htmlFor={`blk-date-${loc.id}`}>
                          <Input id={`blk-date-${loc.id}`} name="date" type="date" required />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Desde" htmlFor={`blk-start-${loc.id}`}>
                            <Select
                              id={`blk-start-${loc.id}`}
                              name="startHour"
                              defaultValue={String(loc.openingHour)}
                            >
                              {hourRange.map((h) => (
                                <option key={h} value={h}>
                                  {hourLabel(h)}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label="Horas" htmlFor={`blk-hours-${loc.id}`}>
                            <Input
                              id={`blk-hours-${loc.id}`}
                              name="hours"
                              type="number"
                              min={1}
                              max={loc.closingHour - loc.openingHour}
                              defaultValue={1}
                            />
                          </Field>
                        </div>
                        <Field label="Motivo" htmlFor={`blk-reason-${loc.id}`}>
                          <Input
                            id={`blk-reason-${loc.id}`}
                            name="reason"
                            placeholder="Mantenimiento"
                          />
                        </Field>
                      </div>
                    </ActionForm>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      />
    </>
  );
}
