import { CalendarDays } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatCredits, formatDateTimeMX, formatMXN, hourLabel } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
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

  const [upcoming, rooms] = await Promise.all([
    db.booking.findMany({
      where: { endsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 60,
      include: {
        room: true,
        location: true,
        practitioner: { include: { user: { select: { name: true } } } },
      },
    }),
    db.room.findMany({
      where: { active: true },
      include: { location: true },
      orderBy: [{ location: { sort: "asc" } }, { name: "asc" }],
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Reservas"
        description="Todas las reservas próximas y bloqueos administrativos."
      />

      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        <div>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Sin reservas próximas"
              description="Las reservas de practitioners y los bloqueos aparecen aquí."
            />
          ) : (
            <div className="space-y-3">
              {upcoming.map((b) => {
                const cancel = adminCancelBooking.bind(null, b.id);
                const cancellable = ["CONFIRMED", "PENDING_PAYMENT", "ADMIN_BLOCKED"].includes(
                  b.status
                );
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
                        <Badge variant={STATUS_VARIANT[b.status] ?? "default"}>{b.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-stone-deep">
                        {formatDateTimeMX(b.startsAt, b.location.timezone)} · {b.location.shortName} ·{" "}
                        <span className="font-mono">{b.code}</span>
                        {b.creditsUsed != null && ` · ${formatCredits(b.creditsUsed)} cr`}
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

        {/* CREAR BLOQUEO */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Bloquear horario</CardTitle>
            <CardDescription>
              Mantenimiento, eventos o salas fuera de servicio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={createBlockAction} submitLabel="Crear bloqueo">
              <div className="space-y-4">
                <Field label="Sala" htmlFor="blk-room">
                  <Select id="blk-room" name="roomId" required defaultValue="">
                    <option value="" disabled>
                      Selecciona sala
                    </option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.location.shortName} · {room.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Fecha" htmlFor="blk-date">
                  <Input id="blk-date" name="date" type="date" required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Desde" htmlFor="blk-start">
                    <Select id="blk-start" name="startHour" defaultValue="7">
                      {Array.from({ length: 15 }, (_, i) => i + 7).map((h) => (
                        <option key={h} value={h}>
                          {hourLabel(h)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Horas" htmlFor="blk-hours">
                    <Input
                      id="blk-hours"
                      name="hours"
                      type="number"
                      min={1}
                      max={15}
                      defaultValue={1}
                    />
                  </Field>
                </div>
                <Field label="Motivo" htmlFor="blk-reason">
                  <Input id="blk-reason" name="reason" placeholder="Mantenimiento" />
                </Field>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
