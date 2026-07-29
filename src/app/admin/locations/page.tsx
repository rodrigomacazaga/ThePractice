import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Building2, DoorOpen, MapPin, Plus } from "lucide-react";
import type { Location } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatMXN, hourLabel } from "@/lib/utils";
import { getRevenue, getOccupancyByLocation, monthToDate } from "@/lib/metrics";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, Input, Textarea, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionForm, ActionButton } from "@/components/dashboard/action-form";
import { deleteLocation, upsertLocation } from "../actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<Location["status"], string> = {
  OPEN: "Abierta",
  PRESALE: "Preventa",
  COMING_SOON: "Próximamente",
  CLOSED: "Cerrada",
};

/** Campos compartidos entre alta y edición. Sin `loc` es formulario de alta. */
function LocationFields({ loc }: { loc?: Location }) {
  const uid = loc?.id ?? "new";
  return (
    <>
      {loc && <input type="hidden" name="locationId" value={loc.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre completo" htmlFor={`name-${uid}`}>
          <Input
            id={`name-${uid}`}
            name="name"
            required
            placeholder="The Practice Juriquilla"
            defaultValue={loc?.name}
          />
        </Field>
        <Field label="Nombre corto" htmlFor={`shortName-${uid}`}>
          <Input
            id={`shortName-${uid}`}
            name="shortName"
            required
            placeholder="Juriquilla"
            defaultValue={loc?.shortName}
          />
        </Field>
        <Field label="Ciudad" htmlFor={`city-${uid}`}>
          <Input id={`city-${uid}`} name="city" required defaultValue={loc?.city} />
        </Field>
        <Field label="Estado" htmlFor={`state-${uid}`}>
          <Input id={`state-${uid}`} name="state" required defaultValue={loc?.state} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Dirección" htmlFor={`address-${uid}`}>
          <Input
            id={`address-${uid}`}
            name="address"
            placeholder="Av. ... , local ..."
            defaultValue={loc?.address ?? ""}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Descripción" htmlFor={`description-${uid}`}>
          <Textarea
            id={`description-${uid}`}
            name="description"
            rows={2}
            defaultValue={loc?.description ?? ""}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field
          label="Amenidades"
          htmlFor={`amenities-${uid}`}
          hint="Sepáralas con comas: Recepción compartida, WiFi, Coffee station"
        >
          <Input
            id={`amenities-${uid}`}
            name="amenities"
            placeholder="Recepción compartida, WiFi, Coffee station"
            defaultValue={loc?.amenities.join(", ")}
          />
        </Field>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Estatus" htmlFor={`status-${uid}`}>
          <Select id={`status-${uid}`} name="status" defaultValue={loc?.status ?? "COMING_SOON"}>
            {(Object.keys(STATUS_LABEL) as Location["status"][]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Abre (hora)" htmlFor={`openingHour-${uid}`} hint="0–23">
          <Input
            id={`openingHour-${uid}`}
            name="openingHour"
            type="number"
            min={0}
            max={23}
            defaultValue={loc?.openingHour ?? 7}
          />
        </Field>
        <Field label="Cierra (hora)" htmlFor={`closingHour-${uid}`} hint="1–24">
          <Input
            id={`closingHour-${uid}`}
            name="closingHour"
            type="number"
            min={1}
            max={24}
            defaultValue={loc?.closingHour ?? 22}
          />
        </Field>
        <Field label="Orden" htmlFor={`sort-${uid}`}>
          <Input
            id={`sort-${uid}`}
            name="sort"
            type="number"
            min={0}
            defaultValue={loc?.sort ?? 0}
          />
        </Field>
      </div>
    </>
  );
}

export default async function AdminLocationsPage() {
  await requireAdmin();
  const { from, to } = monthToDate();

  const [locations, revenue, occupancy] = await Promise.all([
    db.location.findMany({
      orderBy: { sort: "asc" },
      include: {
        _count: { select: { rooms: true, practitioners: true, bookings: true } },
        lockers: true,
        roomTypes: { where: { active: true }, select: { name: true }, orderBy: { sort: "asc" } },
      },
    }),
    getRevenue(from, to),
    getOccupancyByLocation(from, to),
  ]);

  const occupancyById = new Map(occupancy.map((o) => [o.locationId, o]));

  return (
    <>
      <PageHeader
        title="Ubicaciones"
        description="Cada sede con su inventario y su rendimiento del mes. Entra a una para ver sus finanzas, salas, equipo y recomendaciones."
      />

      <div className="grid gap-6 md:grid-cols-2">
        {locations.map((loc) => {
          const lockersFree = loc.lockers.filter((l) => l.status === "AVAILABLE").length;
          const occ = occupancyById.get(loc.id);
          const ingreso = revenue.porUbicacion.get(loc.id)?.totalCents ?? 0;
          return (
            <Card key={loc.id} className="overflow-hidden p-0">
              {/* Fachada: puerta de entrada al dashboard de la sede */}
              <Link href={`/admin/locations/${loc.slug}`} className="block">
                <div className="relative aspect-[16/9] bg-paper-deep">
                  {loc.photos[0] ? (
                    <Image
                      src={loc.photos[0]}
                      alt={`Fachada de ${loc.name}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 45vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1.5">
                      <Building2 className="h-7 w-7 text-stone" strokeWidth={1.5} />
                      <span className="text-[10px] font-semibold tracking-wider text-stone uppercase">
                        Sin fachada cargada
                      </span>
                    </div>
                  )}
                  <Badge
                    variant={loc.status === "OPEN" ? "sage" : loc.status === "PRESALE" ? "clay" : "amber"}
                    className="absolute top-3 right-3"
                  >
                    {STATUS_LABEL[loc.status]}
                  </Badge>
                </div>
              </Link>

              <CardContent className="p-6">
                <Link
                  href={`/admin/locations/${loc.slug}`}
                  className="font-display text-lg font-bold tracking-tight hover:underline"
                >
                  {loc.name}
                </Link>
                <p className="mt-1 flex items-start gap-1.5 text-xs text-stone-deep">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    {loc.address ? `${loc.address} · ` : ""}
                    {loc.city}, {loc.state} · {hourLabel(loc.openingHour)}–{hourLabel(loc.closingHour)}
                  </span>
                </p>

                {/* Las salas que la componen */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Badge variant="outline">
                    <DoorOpen className="h-3 w-3" />
                    {loc._count.rooms} salas
                  </Badge>
                  {loc.roomTypes.slice(0, 4).map((rt) => (
                    <Badge key={rt.name} variant="default">
                      {rt.name}
                    </Badge>
                  ))}
                  {loc.roomTypes.length > 4 && (
                    <Badge variant="outline">+{loc.roomTypes.length - 4}</Badge>
                  )}
                </div>

                {/* Rendimiento del mes: comparable entre sedes */}
                <div className="mt-5 grid grid-cols-4 gap-2 border-t border-line pt-4 text-center">
                  {[
                    { label: "Ingreso", value: formatMXN(ingreso) },
                    { label: "Ocupación", value: `${occ?.ocupacionPct ?? 0}%` },
                    { label: "Practitioners", value: loc._count.practitioners },
                    { label: "Lockers", value: `${lockersFree}/${loc.lockers.length}` },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-paper px-1.5 py-2.5">
                      <p className="font-display text-sm font-bold">{s.value}</p>
                      <p className="text-[9px] font-semibold tracking-wider whitespace-nowrap text-stone-deep uppercase">
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                  <Link
                    href={`/admin/locations/${loc.slug}`}
                    className="inline-flex items-center gap-1.5 font-display text-xs font-semibold text-ink hover:underline"
                  >
                    Ver dashboard de la sede
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Modal trigger="Editar" title={`Editar ${loc.shortName}`}>
                    <ActionForm action={upsertLocation} submitLabel="Guardar cambios">
                      <LocationFields loc={loc} />
                    </ActionForm>
                  </Modal>
                  <ActionButton
                    action={deleteLocation.bind(null, loc.id)}
                    label="Eliminar"
                    variant="danger"
                    confirmText={`¿Eliminar ${loc.shortName}? Si no tiene salas, reservas ni leads se borra; si tiene, se cierra (status CLOSED).`}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4.5 w-4.5 text-clay" /> Nueva ubicación
          </CardTitle>
          <CardDescription>
            El slug público se genera del nombre corto (ej. “Centro Sur” →{" "}
            <span className="font-mono">centro-sur</span>). Las fotos se cargan en una fase
            posterior (requieren el proveedor de storage en producción).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={upsertLocation} submitLabel="Crear ubicación">
            <LocationFields />
          </ActionForm>
        </CardContent>
      </Card>
    </>
  );
}
