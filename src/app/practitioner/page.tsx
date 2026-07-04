import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Crown,
  DoorOpen,
  Inbox,
  Wallet,
} from "lucide-react";
import { requirePractitioner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatCredits, formatDateTimeMX, formatMXN } from "@/lib/utils";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const statusBadge: Record<string, { label: string; variant: "sage" | "amber" | "rust" | "default" | "ink" }> = {
  CONFIRMED: { label: "Confirmada", variant: "sage" },
  PENDING_PAYMENT: { label: "Pago pendiente", variant: "amber" },
  CHECKED_IN: { label: "En curso", variant: "ink" },
  COMPLETED: { label: "Completada", variant: "default" },
  CANCELLED: { label: "Cancelada", variant: "default" },
  LATE_CANCELLED: { label: "Cancelación tardía", variant: "rust" },
  NO_SHOW: { label: "No-show", variant: "rust" },
};

export default async function PractitionerDashboard() {
  const { session, profile } = await requirePractitioner();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [upcoming, monthBookings, newLeads, clientBookings] = await Promise.all([
    db.booking.findMany({
      where: {
        practitionerId: profile.id,
        kind: "ROOM_RENTAL",
        startsAt: { gte: now },
        status: { in: ["CONFIRMED", "PENDING_PAYMENT", "CHECKED_IN"] },
      },
      orderBy: { startsAt: "asc" },
      take: 5,
      include: { room: { include: { roomType: true } }, location: true },
    }),
    db.booking.aggregate({
      where: {
        practitionerId: profile.id,
        kind: "ROOM_RENTAL",
        startsAt: { gte: monthStart },
        status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
      },
      _sum: { creditsUsed: true },
      _count: true,
    }),
    db.lead.count({
      where: { practitionerId: profile.id, status: "NEW" },
    }),
    db.booking.count({
      where: {
        practitionerId: profile.id,
        kind: "CLIENT_SESSION",
        startsAt: { gte: monthStart },
      },
    }),
  ]);

  const firstName = (session.user.name ?? "").split(" ")[0];
  const membership = profile.membership;

  return (
    <>
      <PageHeader
        title={`Hola, ${firstName}`}
        description="Tu práctica de un vistazo."
        actions={
          <>
            <ButtonLink href="/practitioner/microsite" variant="outline" size="md">
              Editar perfil
            </ButtonLink>
            <ButtonLink href="/practitioner/book" size="md">
              <DoorOpen className="h-4 w-4" />
              Reservar sala
            </ButtonLink>
          </>
        }
      />

      {/* STATS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Créditos disponibles"
          value={formatCredits(profile.wallet?.balance ?? 0)}
          sub="1 crédito = 1 h sala estándar"
          icon={Wallet}
        />
        <Stat
          label="Horas usadas este mes"
          value={formatCredits(monthBookings._sum.creditsUsed ?? 0)}
          sub={`${monthBookings._count} reservas`}
          icon={CalendarDays}
        />
        <Stat
          label="Membresía"
          value={membership?.status === "ACTIVE" ? membership.plan.name : "Sin plan"}
          sub={
            membership?.status === "ACTIVE"
              ? `Renueva ${formatDateTimeMX(membership.currentPeriodEnd).split(",")[0]}`
              : "Activa un plan para horas incluidas"
          }
          icon={Crown}
        />
        <Stat
          label="Leads nuevos"
          value={newLeads}
          sub={`${clientBookings} reservas de clientes este mes`}
          icon={Inbox}
        />
      </div>

      {/* PRÓXIMAS RESERVAS */}
      <Card className="mt-8">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Próximas reservas</CardTitle>
          <Link
            href="/practitioner/calendar"
            className="flex items-center gap-1 font-display text-xs font-semibold text-stone-deep hover:text-ink"
          >
            Ver calendario <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={DoorOpen}
              title="Sin reservas próximas"
              description="Reserva una sala para tu siguiente sesión."
              action={
                <ButtonLink href="/practitioner/book" size="md">
                  Reservar sala
                </ButtonLink>
              }
            />
          ) : (
            <div className="divide-y divide-line">
              {upcoming.map((b) => {
                const badge = statusBadge[b.status] ?? { label: b.status, variant: "default" as const };
                return (
                  <div key={b.id} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink font-display text-xs font-bold text-paper">
                      {b.room?.name.split(" ").pop()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-semibold">
                        {b.room?.name} · {b.room?.roomType.name}
                      </p>
                      <p className="text-xs text-stone-deep">
                        {formatDateTimeMX(b.startsAt, b.location.timezone)} ·{" "}
                        {b.location.shortName}
                        {b.creditsUsed != null && ` · ${formatCredits(b.creditsUsed)} créditos`}
                        {b.priceCents != null && ` · ${formatMXN(b.priceCents)}`}
                      </p>
                    </div>
                    {b.accessCode && b.status === "CONFIRMED" && (
                      <div className="rounded-lg bg-paper px-3 py-1.5 font-mono text-xs font-bold tracking-[0.2em]">
                        {b.accessCode}
                      </div>
                    )}
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ACCIONES RÁPIDAS */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            href: "/practitioner/microsite",
            title: "Tu micrositio",
            text: profile.microsite?.published
              ? "Publicado — compártelo con tus clientes."
              : "Aún sin publicar. Complétalo para aparecer en el directorio.",
          },
          {
            href: "/practitioner/membership",
            title: membership ? "Administrar membresía" : "Activa una membresía",
            text: membership
              ? "Cambia de plan o revisa tu renovación."
              : "Horas incluidas, micrositio y precio preferente.",
          },
          {
            href: "/practitioner/credits",
            title: "Comprar horas",
            text: "Paquetes de 10 a 80 horas con descuento por volumen.",
          },
        ].map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group rounded-2xl border border-line bg-surface p-6 shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-lift)"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold">{c.title}</h3>
              <ArrowRight className="h-4 w-4 text-stone transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-stone-deep">{c.text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
