import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarDays,
  Crown,
  DoorOpen,
  Inbox,
  TrendingUp,
  UserRound,
  AlertTriangle,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatCredits, formatDateTimeMX, formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  await requireAdmin();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [
    revenueMonth,
    todayBookings,
    activePractitioners,
    pendingPractitioners,
    activeMemberships,
    newLeads,
    noShowsMonth,
    lateCancelsMonth,
    openIncidents,
    rooms,
    todayBookedHours,
    leadsByStatus,
    leadsByPlan,
    depositsSum,
    plans,
  ] = await Promise.all([
    db.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: monthStart } },
      _sum: { amountCents: true },
    }),
    db.booking.findMany({
      where: {
        startsAt: { gte: dayStart, lt: dayEnd },
        status: { in: ["CONFIRMED", "CHECKED_IN", "PENDING_PAYMENT"] },
      },
      orderBy: { startsAt: "asc" },
      include: {
        room: true,
        location: true,
        practitioner: { include: { user: { select: { name: true } } } },
      },
    }),
    db.practitionerProfile.count({ where: { verificationStatus: "APPROVED" } }),
    db.practitionerProfile.count({ where: { verificationStatus: "PENDING_REVIEW" } }),
    db.practitionerMembership.findMany({
      where: { status: "ACTIVE" },
      include: { plan: true },
    }),
    db.lead.count({ where: { status: "NEW" } }),
    db.booking.count({ where: { status: "NO_SHOW", startsAt: { gte: monthStart } } }),
    db.booking.count({ where: { status: "LATE_CANCELLED", startsAt: { gte: monthStart } } }),
    db.incident.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.room.count({ where: { active: true } }),
    db.booking.aggregate({
      where: {
        startsAt: { gte: dayStart, lt: dayEnd },
        status: { in: ["CONFIRMED", "CHECKED_IN", "COMPLETED"] },
        kind: "ROOM_RENTAL",
      },
      _count: true,
    }),
    db.lead.groupBy({
      by: ["status"],
      where: { type: "PRACTITIONER_APPLICATION" },
      _count: true,
    }),
    db.lead.groupBy({
      by: ["interestedPlan"],
      where: { type: "PRACTITIONER_APPLICATION", interestedPlan: { not: null } },
      _count: true,
    }),
    db.lead.aggregate({
      where: { status: { in: ["DEPOSIT_PAID", "FOUNDER_RESERVED", "CONVERTED"] } },
      _sum: { depositCents: true },
    }),
    db.membershipPlan.findMany({ where: { active: true } }),
  ]);

  // MRR actual: suma de precios de membresías activas (founder o regular)
  const mrr = activeMemberships.reduce(
    (sum, m) =>
      sum +
      (m.isFounder && m.plan.founderPriceCents != null
        ? m.plan.founderPriceCents
        : m.plan.monthlyPriceCents),
    0
  );

  // MRR potencial de preventa: leads calificados+ por plan × precio founder
  const planByCode = new Map(plans.map((p) => [p.code, p]));
  const potentialMrr = leadsByPlan.reduce((sum, row) => {
    const plan = row.interestedPlan ? planByCode.get(row.interestedPlan) : null;
    if (!plan) return sum;
    return sum + (plan.founderPriceCents ?? plan.monthlyPriceCents) * row._count;
  }, 0);

  // Ocupación de hoy (aprox): horas reservadas / (salas × 15h operativas)
  const totalHoursToday = rooms * 15;
  const occupancy =
    totalHoursToday > 0 ? Math.round((todayBookedHours._count / totalHoursToday) * 100) : 0;

  const statusLabels: Record<string, string> = {
    NEW: "Nuevos",
    CONTACTED: "Contactados",
    QUALIFIED: "Calificados",
    CALL_SCHEDULED: "Llamada agendada",
    PAYMENT_LINK_SENT: "Pendiente de pago",
    DEPOSIT_PAID: "Depósito pagado",
    FOUNDER_RESERVED: "Founder reservado",
    CONVERTED: "Convertidos",
    NOT_COMPATIBLE: "No compatibles",
    NOT_INTERESTED: "No interesados",
    LOST: "Perdidos",
  };

  return (
    <>
      <PageHeader title="Overview" description="El negocio de un vistazo." />

      {/* ALERTAS */}
      {(pendingPractitioners > 0 || openIncidents > 0 || newLeads > 0) && (
        <div className="mb-8 flex flex-wrap gap-3">
          {pendingPractitioners > 0 && (
            <Link
              href="/admin/practitioners"
              className="flex items-center gap-2 rounded-xl border border-amber-warm/25 bg-amber-soft px-4 py-2.5 text-sm font-medium text-amber-warm"
            >
              <UserRound className="h-4 w-4" />
              {pendingPractitioners} practitioners por verificar
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
          {newLeads > 0 && (
            <Link
              href="/admin/leads"
              className="flex items-center gap-2 rounded-xl border border-clay/25 bg-clay-soft px-4 py-2.5 text-sm font-medium text-clay-deep"
            >
              <Inbox className="h-4 w-4" />
              {newLeads} leads sin contactar
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
          {openIncidents > 0 && (
            <span className="flex items-center gap-2 rounded-xl border border-rust/25 bg-rust-soft px-4 py-2.5 text-sm font-medium text-rust">
              <AlertTriangle className="h-4 w-4" />
              {openIncidents} incidencias abiertas
            </span>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Ingresos del mes"
          value={formatMXN(revenueMonth._sum.amountCents ?? 0)}
          icon={BadgeDollarSign}
        />
        <Stat
          label="MRR membresías"
          value={formatMXN(mrr)}
          sub={`${activeMemberships.length} membresías activas`}
          icon={Crown}
        />
        <Stat
          label="Reservas hoy"
          value={todayBookings.length}
          sub={`Ocupación aprox. ${occupancy}%`}
          icon={CalendarDays}
        />
        <Stat
          label="Practitioners activos"
          value={activePractitioners}
          sub={`${noShowsMonth} no-shows · ${lateCancelsMonth} canc. tardías este mes`}
          icon={UserRound}
        />
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        {/* RESERVAS DE HOY */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Reservas de hoy</CardTitle>
            <Link
              href="/admin/bookings"
              className="flex items-center gap-1 font-display text-xs font-semibold text-stone-deep hover:text-ink"
            >
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {todayBookings.length === 0 ? (
              <p className="py-6 text-center text-sm text-stone">Sin reservas hoy.</p>
            ) : (
              <div className="divide-y divide-line">
                {todayBookings.slice(0, 8).map((b) => (
                  <div key={b.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <span className="w-14 shrink-0 font-mono text-xs font-bold">
                      {formatDateTimeMX(b.startsAt, b.location.timezone).split(", ")[1]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-semibold">
                        {b.room?.name ?? "—"} ·{" "}
                        {b.kind === "ADMIN_BLOCK"
                          ? "Bloqueo administrativo"
                          : (b.practitioner?.user.name ?? "—")}
                      </p>
                      <p className="text-xs text-stone">{b.location.shortName}</p>
                    </div>
                    <Badge
                      variant={
                        b.status === "CONFIRMED"
                          ? "sage"
                          : b.status === "CHECKED_IN"
                            ? "ink"
                            : "amber"
                      }
                    >
                      {b.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PREVENTA LA CEIBA */}
        <Card className="border-ink bg-ink text-paper">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-paper">Preventa · Pipeline founder</CardTitle>
            <TrendingUp className="h-4 w-4 text-clay" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-paper/5 p-4">
                <p className="text-[10px] font-semibold tracking-widest text-paper/50 uppercase">
                  MRR potencial
                </p>
                <p className="mt-1 font-display text-xl font-bold">{formatMXN(potentialMrr)}</p>
              </div>
              <div className="rounded-xl bg-paper/5 p-4">
                <p className="text-[10px] font-semibold tracking-widest text-paper/50 uppercase">
                  Depósitos
                </p>
                <p className="mt-1 font-display text-xl font-bold">
                  {formatMXN(depositsSum._sum.depositCents ?? 0)}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              {leadsByStatus.map((row) => (
                <div key={row.status} className="flex items-center justify-between text-sm">
                  <span className="text-paper/60">{statusLabels[row.status] ?? row.status}</span>
                  <span className="font-display font-bold">{row._count}</span>
                </div>
              ))}
              {leadsByStatus.length === 0 && (
                <p className="text-sm text-paper/50">Aún no hay aplicaciones.</p>
              )}
            </div>

            <Link
              href="/admin/leads"
              className="mt-6 flex h-10 items-center justify-center gap-2 rounded-xl bg-paper font-display text-xs font-semibold text-ink transition-opacity hover:opacity-90"
            >
              Gestionar pipeline
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* INTERÉS POR PLAN */}
      {leadsByPlan.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Interés por plan (aplicaciones)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {leadsByPlan.map((row) => {
                const plan = row.interestedPlan ? planByCode.get(row.interestedPlan) : null;
                return (
                  <div key={row.interestedPlan} className="rounded-xl border border-line bg-paper p-4">
                    <p className="font-display text-sm font-bold capitalize">
                      {plan?.name ?? row.interestedPlan}
                    </p>
                    <p className="mt-1 font-display text-2xl font-bold">{row._count}</p>
                    <p className="text-xs text-stone-deep">
                      {plan
                        ? `${formatMXN(plan.founderPriceCents ?? plan.monthlyPriceCents)}/mes founder · ${formatCredits(plan.includedCredits)} h`
                        : "interesados"}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ACCESOS RÁPIDOS */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { href: "/admin/practitioners", icon: UserRound, label: "Verificar practitioners" },
          { href: "/admin/catalog", icon: Crown, label: "Planes y precios" },
          { href: "/admin/bookings", icon: DoorOpen, label: "Bloquear horarios" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="group flex items-center justify-between rounded-2xl border border-line bg-surface p-5 shadow-(--shadow-card) transition-shadow hover:shadow-(--shadow-lift)"
          >
            <span className="flex items-center gap-3 font-display text-sm font-semibold">
              <l.icon className="h-4.5 w-4.5 text-clay" />
              {l.label}
            </span>
            <ArrowRight className="h-4 w-4 text-stone transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </>
  );
}
