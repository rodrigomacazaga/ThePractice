import { Building2, Plus } from "lucide-react";
import type { Location } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, Input, Textarea, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionForm } from "@/components/dashboard/action-form";
import { upsertLocation } from "../actions";

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
        <Field label="Amenidades (separadas por coma)" htmlFor={`amenities-${uid}`}>
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
        <Field label="Abre (hora)" htmlFor={`openingHour-${uid}`}>
          <Input
            id={`openingHour-${uid}`}
            name="openingHour"
            type="number"
            min={0}
            max={23}
            defaultValue={loc?.openingHour ?? 7}
          />
        </Field>
        <Field label="Cierra (hora)" htmlFor={`closingHour-${uid}`}>
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

  const locations = await db.location.findMany({
    orderBy: { sort: "asc" },
    include: {
      _count: { select: { rooms: true, practitioners: true, bookings: true } },
      lockers: true,
    },
  });

  return (
    <>
      <PageHeader
        title="Ubicaciones"
        description="La red de The Practice. Cada ubicación tiene sus salas, lockers y configuración."
      />

      <div className="grid gap-5 md:grid-cols-2">
        {locations.map((loc) => {
          const lockersFree = loc.lockers.filter((l) => l.status === "AVAILABLE").length;
          return (
            <Card key={loc.id}>
              <CardContent className="p-7">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <Building2 className="h-4.5 w-4.5 text-clay" />
                      <h3 className="font-display text-lg font-bold">{loc.name}</h3>
                    </div>
                    <p className="mt-1 text-sm text-stone-deep">
                      {loc.city}, {loc.state} · {loc.timezone} · {loc.openingHour}:00–
                      {loc.closingHour}:00
                    </p>
                  </div>
                  <Badge
                    variant={
                      loc.status === "OPEN" ? "sage" : loc.status === "PRESALE" ? "clay" : "amber"
                    }
                  >
                    {STATUS_LABEL[loc.status]}
                  </Badge>
                </div>

                {/* 2×2 fijo: con 4 columnas los labels largos ("Practitioners")
                     no caben y cualquier salida (wrap, break, truncate) se ve mal. */}
                <div className="mt-6 grid grid-cols-2 gap-3 text-center">
                  {[
                    { label: "Salas", value: loc._count.rooms },
                    { label: "Practitioners", value: loc._count.practitioners },
                    { label: "Reservas", value: loc._count.bookings },
                    {
                      label: "Lockers libres",
                      value: `${lockersFree}/${loc.lockers.length}`,
                    },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-paper px-2 py-3">
                      <p className="font-display text-lg font-bold">{s.value}</p>
                      <p className="text-[10px] font-semibold tracking-wider whitespace-nowrap text-stone uppercase">
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs text-stone">
                  slug: <span className="font-mono">/locations/{loc.slug}</span> (fijo — es URL
                  pública)
                </p>

                <div className="mt-4 border-t border-line pt-4">
                  <Modal trigger="Editar ubicación" title={`Editar ${loc.shortName}`}>
                    <ActionForm action={upsertLocation} submitLabel="Guardar cambios">
                      <LocationFields loc={loc} />
                    </ActionForm>
                  </Modal>
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
