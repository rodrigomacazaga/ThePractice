import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Building,
  CalendarClock,
  Coins,
  DoorOpen,
  Receipt,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatMXN, hourLabel } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getRevenue,
  getMrrByLocation,
  getRoomPerformance,
  getRoomTypePerformance,
  getHourlyHeatmap,
  getCosts,
  computeMargin,
  getPractitionerUsage,
  getSpecialtyMix,
  recommendRoomConversions,
  recommendPeakPricing,
  recommendMembershipFit,
  recommendFromDemand,
  sortRecommendations,
} from "@/lib/metrics";
import { RoomTypesSection } from "./room-types-section";
import { RecommendationList } from "../recommendation-list";
import { monthToDate } from "@/lib/metrics/periods";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Abierta",
  PRESALE: "Preventa",
  COMING_SOON: "Próximamente",
  CLOSED: "Cerrada",
};

export default async function LocationDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;

  const location = await db.location.findUnique({
    where: { slug },
    include: {
      roomTypes: { orderBy: { sort: "asc" } },
      _count: { select: { rooms: true, practitioners: true } },
    },
  });
  if (!location) notFound();

  const { from, to } = monthToDate();

  const [
    revenue,
    mrr,
    rooms,
    roomTypes,
    heatmap,
    costs,
    usage,
    rateWindows,
    employees,
    demandRecs,
  ] = await Promise.all([
    getRevenue(from, to),
    getMrrByLocation(),
    getRoomPerformance(location.id, from, to),
    getRoomTypePerformance(from, to, location.id),
    getHourlyHeatmap(location.id, from, to),
    getCosts(from, to, location.id),
    getPractitionerUsage(location.id, from, to),
    db.rateWindow.findMany({ where: { locationId: location.id, active: true } }),
    db.employee.findMany({
      where: { locationId: location.id, status: { not: "TERMINATED" } },
      include: { documents: { orderBy: { expiresAt: "asc" } } },
      orderBy: { name: "asc" },
    }),
    recommendFromDemand(location.id),
  ]);

  const ingresoUbicacion = revenue.porUbicacion.get(location.id);
  const ingresoCents = ingresoUbicacion?.totalCents ?? 0;
  const mrrCents = mrr.porUbicacion.get(location.id) ?? 0;

  // Horas ocupadas e ingreso del inventario físico de esta sede.
  const horasReservadas = rooms.reduce((s, r) => s + r.horasReservadas, 0);
  const horasDisponibles = rooms.reduce((s, r) => s + r.horasDisponibles, 0);
  const ocupacionPct = horasDisponibles > 0 ? Math.round((horasReservadas / horasDisponibles) * 100) : 0;
  const revpah = horasDisponibles > 0 ? Math.round(ingresoCents / horasDisponibles) : 0;
  const precioHoraPromedio =
    location.roomTypes.length > 0
      ? Math.round(
          location.roomTypes.reduce((s, rt) => s + rt.baseHourlyPriceCents, 0) /
            location.roomTypes.length
        )
      : 0;
  const margin = computeMargin(ingresoCents, costs.totalCents, precioHoraPromedio);

  const specialtyMix = getSpecialtyMix(usage);
  const recomendaciones = sortRecommendations([
    ...recommendRoomConversions(roomTypes, location.shortName),
    ...recommendPeakPricing(heatmap, location.shortName, rateWindows.length > 0),
    ...recommendMembershipFit(usage),
    ...demandRecs,
  ]);

  const docsPorVencer = employees.flatMap((e) =>
    e.documents.filter(
      (d) => d.expiresAt != null && d.expiresAt <= new Date(Date.now() + 60 * 86_400_000)
    ).map((d) => ({ empleado: e.name, doc: d.name, expiresAt: d.expiresAt! }))
  );

  const maxHeat = heatmap.reduce((m, c) => Math.max(m, c.horas), 0);
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const horas = Array.from(
    { length: Math.max(0, location.closingHour - location.openingHour) },
    (_, i) => location.openingHour + i
  );

  return (
    <>
      <Link
        href="/admin/locations"
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-stone-deep hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Todas las ubicaciones
      </Link>

      <PageHeader
        title={location.name}
        description={`${location.address ?? location.city} · ${location.city}, ${location.state} · ${hourLabel(location.openingHour)}–${hourLabel(location.closingHour)}`}
      />

      {location.photos[0] && (
        <div className="relative mb-6 aspect-[21/9] overflow-hidden rounded-2xl">
          <Image
            src={location.photos[0]}
            alt={`Fachada de ${location.name}`}
            fill
            sizes="(max-width: 1024px) 100vw, 900px"
            className="object-cover"
          />
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Badge variant={location.status === "OPEN" ? "sage" : "amber"}>
          {STATUS_LABEL[location.status] ?? location.status}
        </Badge>
        <Badge variant="outline">{location._count.rooms} salas</Badge>
        <Badge variant="outline">{location.roomTypes.length} tipos de sala</Badge>
        <Badge variant="outline">{location._count.practitioners} practitioners asignados</Badge>
      </div>

      {/* FINANZAS DEL MES */}
      <h2 className="eyebrow">Finanzas del mes en curso</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Ingreso atribuido" value={formatMXN(ingresoCents)} icon={Coins} />
        <Stat label="MRR de membresías" value={formatMXN(mrrCents)} icon={TrendingUp} />
        <Stat
          label="Costos del periodo"
          value={formatMXN(costs.totalCents)}
          sub={costs.totalCents === 0 ? "Sin gastos capturados" : `Nómina: ${formatMXN(costs.nominaCents)}`}
          icon={Receipt}
        />
        <Stat
          label="Margen"
          value={costs.totalCents === 0 ? "—" : formatMXN(margin.margenCents)}
          sub={
            costs.totalCents === 0
              ? "Captura gastos para calcularlo"
              : `${margin.margenPct}% · equilibrio ≈ ${margin.equilibrioHoras ?? "—"} h-sala`
          }
          icon={margin.margenCents >= 0 ? TrendingUp : TrendingDown}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat label="Ocupación" value={`${ocupacionPct}%`} sub={`${horasReservadas} de ${horasDisponibles} h-sala`} icon={CalendarClock} />
        <Stat label="Ingreso por hora-sala" value={formatMXN(revpah)} sub="RevPAH: comparable entre sedes" icon={DoorOpen} />
        <Stat label="Practitioners activos" value={usage.length} sub="con reservas este mes" icon={Users} />
      </div>

      {ingresoUbicacion && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Ingreso por línea</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {(
              [
                ["reservas", "Reservas"],
                ["membresias", "Membresías"],
                ["paquetes", "Paquetes"],
                ["addons", "Add-ons"],
                ["depositos", "Depósitos"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="rounded-xl bg-paper p-4">
                <p className="text-[11px] font-semibold tracking-wider text-stone-deep uppercase">
                  {label}
                </p>
                <p className="mt-1 font-display text-lg font-bold">
                  {formatMXN(ingresoUbicacion.porLinea[key])}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* RECOMENDACIONES */}
      {recomendaciones.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow">Qué conviene revisar en esta sede</h2>
          <RecommendationList items={recomendaciones} className="mt-4" />
        </section>
      )}

      {/* RENDIMIENTO POR SALA */}
      <section className="mt-10">
        <h2 className="eyebrow">Rendimiento por sala</h2>
        {rooms.length === 0 ? (
          <EmptyState icon={DoorOpen} title="Sin salas activas" description="Da de alta salas para medir su rendimiento." />
        ) : (
          <Card className="mt-4 overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Sala</TH>
                  <TH>Tipo</TH>
                  <TH>Horas</TH>
                  <TH>Ocupación</TH>
                  <TH>Ingreso</TH>
                  <TH>Por hora-sala</TH>
                  <TH>Incidencias</TH>
                </TR>
              </THead>
              <TBody>
                {[...rooms]
                  .sort((a, b) => b.revpahCents - a.revpahCents)
                  .map((r) => (
                    <TR key={r.roomId}>
                      <TD className="font-display font-semibold">{r.roomName}</TD>
                      <TD className="text-stone-deep">{r.roomTypeName}</TD>
                      <TD>{r.horasReservadas}</TD>
                      <TD>
                        <Badge
                          variant={
                            r.ocupacionPct >= 70 ? "sage" : r.ocupacionPct <= 25 ? "rust" : "amber"
                          }
                        >
                          {r.ocupacionPct}%
                        </Badge>
                      </TD>
                      <TD>{formatMXN(r.ingresoCents)}</TD>
                      <TD className="font-display font-semibold">{formatMXN(r.revpahCents)}</TD>
                      <TD>{r.incidencias > 0 ? r.incidencias : "—"}</TD>
                    </TR>
                  ))}
              </TBody>
            </Table>
          </Card>
        )}
      </section>

      {/* HEATMAP HORARIO */}
      {heatmap.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow">Ocupación por día y hora</h2>
          <p className="mt-1 text-sm text-stone-deep">
            Base para decidir tarifas por franja y conversiones de sala. Cuanto más oscuro, más
            horas-sala reservadas.
          </p>
          <Card className="mt-4 overflow-x-auto">
            <CardContent>
              <table className="w-full min-w-[520px] border-separate border-spacing-1">
                <thead>
                  <tr>
                    <th className="w-10" />
                    {horas.map((h) => (
                      <th key={h} className="text-[10px] font-semibold text-stone">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dias.map((d, weekday) => (
                    <tr key={d}>
                      <th className="text-[10px] font-semibold text-stone-deep">{d}</th>
                      {horas.map((h) => {
                        const cell = heatmap.find((c) => c.weekday === weekday && c.hour === h);
                        const intensity = maxHeat > 0 && cell ? cell.horas / maxHeat : 0;
                        return (
                          <td
                            key={h}
                            title={`${d} ${h}:00 · ${cell?.horas ?? 0} h-sala`}
                            className="h-6 rounded"
                            style={{
                              backgroundColor:
                                intensity === 0
                                  ? "var(--color-paper-deep)"
                                  : `color-mix(in oklab, var(--color-ink) ${Math.round(intensity * 100)}%, var(--color-paper-deep))`,
                            }}
                          />
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      )}

      {/* PRACTITIONERS */}
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="eyebrow">Quién usa más esta sede</h2>
          {usage.length === 0 ? (
            <EmptyState icon={Users} title="Sin uso este mes" description="Aún no hay reservas en el periodo." />
          ) : (
            <Card className="mt-4">
              <CardContent className="divide-y divide-line">
                {usage.slice(0, 8).map((u) => (
                  <div key={u.practitionerId} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-semibold">{u.name}</p>
                      <p className="truncate text-xs text-stone-deep">
                        {[u.planName, u.isFounder ? "Founder" : null, u.especialidades[0]]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-sm font-bold">{u.horas} h</p>
                      {u.usoDelPlanPct != null && (
                        <p className="text-[11px] text-stone">{u.usoDelPlanPct}% del plan</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <h2 className="eyebrow">Mix de especialidades</h2>
          {specialtyMix.length === 0 ? (
            <EmptyState icon={Users} title="Sin datos" description="Se calcula con las horas reservadas del periodo." />
          ) : (
            <Card className="mt-4">
              <CardContent className="space-y-3">
                {specialtyMix.slice(0, 8).map((s) => {
                  const max = specialtyMix[0].horas || 1;
                  return (
                    <div key={s.especialidad}>
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="text-ink-mute">{s.especialidad}</span>
                        <span className="font-display font-semibold">{s.horas} h</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper-deep">
                        <div
                          className="h-full rounded-full bg-clay"
                          style={{ width: `${Math.round((s.horas / max) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* EQUIPO */}
      <section className="mt-10">
        <h2 className="eyebrow">Equipo de la sede</h2>
        {docsPorVencer.length > 0 && (
          <div className="mt-3 rounded-2xl bg-amber-soft px-4 py-3 text-sm font-medium text-amber-warm">
            {docsPorVencer.length} documento{docsPorVencer.length === 1 ? "" : "s"} por vencer en los
            próximos 60 días: {docsPorVencer.slice(0, 3).map((d) => `${d.doc} (${d.empleado})`).join(", ")}
            {docsPorVencer.length > 3 ? "…" : ""}
          </div>
        )}
        {employees.length === 0 ? (
          <EmptyState
            icon={Building}
            title="Sin empleados dados de alta"
            description="Registra al equipo de esta sede para llevar su nómina y documentación."
          />
        ) : (
          <Card className="mt-4 overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Nombre</TH>
                  <TH>Puesto</TH>
                  <TH>Contrato</TH>
                  <TH>Sueldo mensual</TH>
                  <TH>Documentos</TH>
                </TR>
              </THead>
              <TBody>
                {employees.map((e) => (
                  <TR key={e.id}>
                    <TD className="font-display font-semibold">{e.name}</TD>
                    <TD className="text-stone-deep">{e.position}</TD>
                    <TD>
                      <Badge variant="outline">{e.employmentType}</Badge>
                    </TD>
                    <TD>{e.monthlySalaryCents != null ? formatMXN(e.monthlySalaryCents) : "—"}</TD>
                    <TD>{e.documents.length}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        )}
      </section>

      {/* TIPOS DE SALA — inventario físico de esta sede */}
      <section className="mt-4">
        <RoomTypesSection loc={location} />
      </section>
    </>
  );
}
