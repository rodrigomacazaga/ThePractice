import { Clock, MapPin } from "lucide-react";
import type { MembershipPlan, RateWindow, RoomType } from "@prisma/client";
import { formatMXN } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionForm, ActionButton } from "@/components/dashboard/action-form";
import {
  upsertRateWindow,
  deleteRateWindow,
  upsertPlanLocationPrice,
  deletePlanLocationPrice,
} from "@/app/admin/actions";

const DIAS = [
  [1, "Lun"],
  [2, "Mar"],
  [3, "Mié"],
  [4, "Jue"],
  [5, "Vie"],
  [6, "Sáb"],
  [0, "Dom"],
] as const;

type LocationLite = { id: string; shortName: string; roomTypes: RoomType[] };

function RateWindowFields({
  locations,
  window,
}: {
  locations: LocationLite[];
  window?: RateWindow;
}) {
  const uid = window?.id ?? "new";
  return (
    <>
      {window && <input type="hidden" name="rateWindowId" value={window.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre de la franja" htmlFor={`rw-label-${uid}`}>
          <Input
            id={`rw-label-${uid}`}
            name="label"
            defaultValue={window?.label}
            placeholder="Tardes prime"
            required
          />
        </Field>
        <Field label="Tipo" htmlFor={`rw-kind-${uid}`}>
          <Select id={`rw-kind-${uid}`} name="kind" defaultValue={window?.kind ?? "PRIME"}>
            <option value="PRIME">Prime (sobreprecio)</option>
            <option value="OFF_PEAK">Valle (descuento)</option>
          </Select>
        </Field>
        <Field label="Ubicación" htmlFor={`rw-loc-${uid}`}>
          <Select id={`rw-loc-${uid}`} name="locationId" defaultValue={window?.locationId ?? ""} required>
            <option value="" disabled>
              Elige una sede
            </option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.shortName}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Tipo de sala"
          htmlFor={`rw-rt-${uid}`}
          hint="Vacío = todos los tipos de la sede"
        >
          <Select id={`rw-rt-${uid}`} name="roomTypeId" defaultValue={window?.roomTypeId ?? ""}>
            <option value="">Todos</option>
            {locations.flatMap((l) =>
              l.roomTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {l.shortName} · {rt.name}
                </option>
              ))
            )}
          </Select>
        </Field>
        <Field label="Desde (hora)" htmlFor={`rw-start-${uid}`}>
          <Input
            id={`rw-start-${uid}`}
            name="startHour"
            type="number"
            min={0}
            max={23}
            defaultValue={window?.startHour ?? 16}
            required
          />
        </Field>
        <Field label="Hasta (hora)" htmlFor={`rw-end-${uid}`}>
          <Input
            id={`rw-end-${uid}`}
            name="endHour"
            type="number"
            min={1}
            max={24}
            defaultValue={window?.endHour ?? 20}
            required
          />
        </Field>
        <Field
          label="Ajuste (%)"
          htmlFor={`rw-adj-${uid}`}
          hint="+20 sube 20%; −15 baja 15%"
        >
          <Input
            id={`rw-adj-${uid}`}
            name="adjustPct"
            type="number"
            step="1"
            defaultValue={
              window?.multiplierBps != null ? window.multiplierBps / 100 - 100 : ""
            }
          />
        </Field>
        <Field label="O precio fijo por hora (MXN)" htmlFor={`rw-fixed-${uid}`}>
          <Input
            id={`rw-fixed-${uid}`}
            name="fixedPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={window?.fixedPriceCents != null ? window.fixedPriceCents / 100 : ""}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Días de la semana">
          <div className="flex flex-wrap gap-3">
            {DIAS.map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  name="weekdays"
                  value={value}
                  defaultChecked={window ? window.weekdays.includes(value) : value >= 1 && value <= 5}
                  className="h-4 w-4 accent-ink"
                />
                {label}
              </label>
            ))}
          </div>
        </Field>
      </div>
    </>
  );
}

/**
 * Tarifas por franja horaria. La palanca de ingreso más directa del modelo por
 * hora: las horas pico se pagan más y las valle se llenan con descuento.
 */
export function RateWindowsSection({
  locations,
  windows,
}: {
  locations: LocationLite[];
  windows: (RateWindow & { location: { shortName: string }; roomType: { name: string } | null })[];
}) {
  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="eyebrow">Tarifas por franja horaria</h2>
        <Modal trigger="Nueva franja" title="Nueva franja de tarifa">
          <ActionForm action={upsertRateWindow} submitLabel="Guardar franja">
            <RateWindowFields locations={locations} />
          </ActionForm>
        </Modal>
      </div>

      {windows.length === 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Sin franjas definidas</CardTitle>
            <CardDescription>
              Hoy todas las horas cuestan lo mismo. Cuando el heatmap de una sede muestre horas
              saturadas, defínelas aquí como prime; las horas muertas conviene abaratarlas para
              llenarlas.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {windows.map((w) => (
            <Card key={w.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-clay" />
                      <p className="font-display text-sm font-bold">{w.label}</p>
                    </div>
                    <p className="mt-1 text-xs text-stone-deep">
                      {w.location.shortName} · {w.roomType?.name ?? "Todos los tipos"} ·{" "}
                      {w.startHour}:00–{w.endHour}:00
                    </p>
                  </div>
                  <Badge variant={w.kind === "PRIME" ? "clay" : "sage"}>
                    {w.kind === "PRIME" ? "Prime" : "Valle"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {w.weekdays.map((d) => (
                    <Badge key={d} variant="outline">
                      {DIAS.find(([v]) => v === d)?.[1] ?? d}
                    </Badge>
                  ))}
                </div>
                <p className="mt-3 font-display text-sm font-semibold">
                  {w.fixedPriceCents != null
                    ? `${formatMXN(w.fixedPriceCents)} por hora (fijo)`
                    : w.multiplierBps != null
                      ? `${w.multiplierBps >= 10000 ? "+" : ""}${w.multiplierBps / 100 - 100}% sobre la tarifa base`
                      : "Sin ajuste definido"}
                </p>
                <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
                  <Modal trigger="Editar" title={`Editar ${w.label}`}>
                    <ActionForm action={upsertRateWindow} submitLabel="Guardar">
                      <RateWindowFields locations={locations} window={w} />
                    </ActionForm>
                  </Modal>
                  <ActionButton
                    action={deleteRateWindow.bind(null, w.id)}
                    label="Eliminar"
                    variant="danger"
                    confirmText={`¿Eliminar la franja "${w.label}"?`}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

/** Precio de un plan en una sede concreta, sin duplicar el catálogo. */
export function PlanOverridesSection({
  plans,
  locations,
  overrides,
}: {
  plans: MembershipPlan[];
  locations: LocationLite[];
  overrides: {
    id: string;
    planId: string;
    locationId: string;
    monthlyPriceCents: number;
    founderPriceCents: number | null;
    plan: { name: string };
    location: { shortName: string };
  }[];
}) {
  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="eyebrow">Precio de plan por ubicación</h2>
        <Modal trigger="Nuevo override" title="Precio de un plan en una sede">
          <ActionForm action={upsertPlanLocationPrice} submitLabel="Guardar precio">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Plan" htmlFor="ov-plan-new">
                <Select id="ov-plan-new" name="planId" required defaultValue="">
                  <option value="" disabled>
                    Elige un plan
                  </option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Ubicación" htmlFor="ov-loc-new">
                <Select id="ov-loc-new" name="locationId" required defaultValue="">
                  <option value="" disabled>
                    Elige una sede
                  </option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.shortName}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Precio mensual (MXN)" htmlFor="ov-price-new">
                <Input id="ov-price-new" name="monthlyPrice" type="number" min={0} step="0.01" required />
              </Field>
              <Field label="Precio founder (MXN)" htmlFor="ov-founder-new">
                <Input id="ov-founder-new" name="founderPrice" type="number" min={0} step="0.01" />
              </Field>
              <Field label="Créditos incluidos" htmlFor="ov-credits-new" hint="Vacío = los del plan">
                <Input id="ov-credits-new" name="includedCredits" type="number" min={0} step="0.5" />
              </Field>
            </div>
          </ActionForm>
        </Modal>
      </div>

      {overrides.length === 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Todas las sedes usan el precio del plan</CardTitle>
            <CardDescription>
              Los planes son globales. Define un override solo cuando una sede deba cobrar distinto
              (por costo de renta o posicionamiento), sin duplicar el catálogo.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {overrides.map((o) => (
            <Card key={o.id}>
              <CardContent className="flex items-center justify-between gap-3 p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-clay" />
                    <p className="font-display text-sm font-bold">
                      {o.plan.name} · {o.location.shortName}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-stone-deep">
                    {formatMXN(o.monthlyPriceCents)}/mes
                    {o.founderPriceCents != null
                      ? ` · founder ${formatMXN(o.founderPriceCents)}`
                      : ""}
                  </p>
                </div>
                <ActionButton
                  action={deletePlanLocationPrice.bind(null, o.id)}
                  label="Quitar"
                  variant="danger"
                  confirmText={`¿Quitar el precio especial de ${o.plan.name} en ${o.location.shortName}? Volverá al precio global.`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
