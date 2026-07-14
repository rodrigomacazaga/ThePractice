import { Plus } from "lucide-react";
import type { RoomType } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatCredits, formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { ActionForm } from "@/components/dashboard/action-form";
import { updatePlanPricing, updateRoomTypePricing, upsertRoomType } from "../actions";

/** Atributos de un tipo de sala (los precios van en su formulario dedicado). */
function RoomTypeAttributeFields({ rt }: { rt?: RoomType }) {
  const uid = rt?.id ?? "new";
  return (
    <>
      {rt && <input type="hidden" name="roomTypeId" value={rt.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre" htmlFor={`rt-name-${uid}`}>
          <Input
            id={`rt-name-${uid}`}
            name="name"
            required
            placeholder="Focus Room"
            defaultValue={rt?.name}
          />
        </Field>
        <Field label="Capacidad (personas)" htmlFor={`rt-cap-${uid}`}>
          <Input
            id={`rt-cap-${uid}`}
            name="capacity"
            type="number"
            min={1}
            max={30}
            defaultValue={rt?.capacity ?? 2}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Descripción" htmlFor={`rt-desc-${uid}`}>
          <Textarea
            id={`rt-desc-${uid}`}
            name="description"
            rows={2}
            defaultValue={rt?.description ?? ""}
          />
        </Field>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Ideal para (separado por coma)" htmlFor={`rt-ideal-${uid}`}>
          <Input
            id={`rt-ideal-${uid}`}
            name="idealFor"
            placeholder="Psicología, Coaching"
            defaultValue={rt?.idealFor.join(", ")}
          />
        </Field>
        <Field label="Features (separadas por coma)" htmlFor={`rt-feat-${uid}`}>
          <Input
            id={`rt-feat-${uid}`}
            name="features"
            placeholder="2 sillones, Luz cálida"
            defaultValue={rt?.features.join(", ")}
          />
        </Field>
      </div>
      <div className="mt-3 flex items-end gap-4">
        <Field label="Orden" htmlFor={`rt-sort-${uid}`}>
          <Input
            id={`rt-sort-${uid}`}
            name="sort"
            type="number"
            min={0}
            defaultValue={rt?.sort ?? 0}
            className="w-24"
          />
        </Field>
        <label className="flex items-center gap-2 pb-2.5 text-sm font-medium">
          <input
            type="checkbox"
            name="active"
            defaultChecked={rt?.active ?? true}
            className="h-4 w-4 accent-clay"
          />
          Activo (visible y reservable)
        </label>
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";

export default async function AdminCatalogPage() {
  await requireAdmin();

  const [plans, roomTypes, packages, addOns] = await Promise.all([
    db.membershipPlan.findMany({ orderBy: { sort: "asc" } }),
    db.roomType.findMany({ orderBy: { sort: "asc" } }),
    db.hourPackage.findMany({ orderBy: { sort: "asc" } }),
    db.addOn.findMany({ orderBy: { sort: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Planes y precios"
        description="Nada está hardcodeado: precios, créditos y tasas se editan aquí y aplican en todo el sitio."
      />

      {/* MEMBRESÍAS */}
      <h2 className="eyebrow">Membresías</h2>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>
                {plan.name}
                {plan.highlighted && (
                  <Badge variant="clay" className="ml-2">
                    Popular
                  </Badge>
                )}
              </CardTitle>
              <span className="text-xs text-stone">
                {formatMXN(plan.monthlyPriceCents)}/mes ·{" "}
                {formatCredits(plan.includedCredits)} h
              </span>
            </CardHeader>
            <CardContent>
              <ActionForm action={updatePlanPricing} submitLabel="Guardar precios">
                <input type="hidden" name="planId" value={plan.id} />
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Precio/mes (MXN)" htmlFor={`mp-${plan.id}`}>
                    <Input
                      id={`mp-${plan.id}`}
                      name="monthlyPrice"
                      type="number"
                      min={0}
                      defaultValue={plan.monthlyPriceCents / 100}
                    />
                  </Field>
                  <Field label="Precio founder" htmlFor={`fp-${plan.id}`}>
                    <Input
                      id={`fp-${plan.id}`}
                      name="founderPrice"
                      type="number"
                      min={0}
                      defaultValue={
                        plan.founderPriceCents != null ? plan.founderPriceCents / 100 : ""
                      }
                    />
                  </Field>
                  <Field label="Horas incluidas" htmlFor={`cr-${plan.id}`}>
                    <Input
                      id={`cr-${plan.id}`}
                      name="includedCredits"
                      type="number"
                      min={0}
                      step="0.5"
                      defaultValue={plan.includedCredits}
                    />
                  </Field>
                </div>
              </ActionForm>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* TIPOS DE SALA */}
      <h2 className="mt-12 eyebrow">Tipos de sala</h2>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {roomTypes.map((rt) => (
          <Card key={rt.id}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>
                {rt.name}
                <span className="ml-2 font-mono text-xs font-normal text-stone">{rt.code}</span>
                {!rt.active && (
                  <Badge variant="default" className="ml-2">
                    Inactivo
                  </Badge>
                )}
              </CardTitle>
              <span className="text-xs text-stone">
                {formatMXN(rt.baseHourlyPriceCents)}/h · {formatCredits(rt.creditsPerHour)} cr/h
              </span>
            </CardHeader>
            <CardContent>
              <ActionForm action={updateRoomTypePricing} submitLabel="Guardar precios">
                <input type="hidden" name="roomTypeId" value={rt.id} />
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Precio/hora (MXN)" htmlFor={`bp-${rt.id}`}>
                    <Input
                      id={`bp-${rt.id}`}
                      name="basePrice"
                      type="number"
                      min={0}
                      defaultValue={rt.baseHourlyPriceCents / 100}
                    />
                  </Field>
                  <Field label="Con membresía" htmlFor={`mpx-${rt.id}`}>
                    <Input
                      id={`mpx-${rt.id}`}
                      name="memberPrice"
                      type="number"
                      min={0}
                      defaultValue={
                        rt.memberHourlyPriceCents != null ? rt.memberHourlyPriceCents / 100 : ""
                      }
                    />
                  </Field>
                  <Field label="Créditos/hora" htmlFor={`cph-${rt.id}`}>
                    <Input
                      id={`cph-${rt.id}`}
                      name="creditsPerHour"
                      type="number"
                      min={0.5}
                      step="0.5"
                      defaultValue={rt.creditsPerHour}
                    />
                  </Field>
                </div>
              </ActionForm>

              <details className="mt-5 border-t border-line pt-4">
                <summary className="cursor-pointer text-sm font-semibold text-clay">
                  Editar atributos
                </summary>
                <ActionForm action={upsertRoomType} submitLabel="Guardar atributos" className="mt-4">
                  <RoomTypeAttributeFields rt={rt} />
                </ActionForm>
              </details>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* NUEVO TIPO DE SALA */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4.5 w-4.5 text-clay" /> Nuevo tipo de sala
          </CardTitle>
          <CardDescription>
            El código es la llave interna del tipo (minúsculas y guiones, ej.{" "}
            <span className="font-mono">focus</span>) y no se puede cambiar después. Las salas
            de este tipo se dan de alta en la sección Salas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActionForm action={upsertRoomType} submitLabel="Crear tipo de sala">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Código" htmlFor="rt-code-new">
                <Input id="rt-code-new" name="code" required placeholder="focus" />
              </Field>
              <Field label="Precio/hora (MXN)" htmlFor="rt-bp-new">
                <Input id="rt-bp-new" name="basePrice" type="number" min={0} required />
              </Field>
              <Field label="Con membresía (MXN)" htmlFor="rt-mp-new">
                <Input id="rt-mp-new" name="memberPrice" type="number" min={0} />
              </Field>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Field label="Créditos/hora" htmlFor="rt-cph-new">
                <Input
                  id="rt-cph-new"
                  name="creditsPerHour"
                  type="number"
                  min={0.5}
                  step="0.5"
                  defaultValue={1}
                />
              </Field>
            </div>
            <div className="mt-3">
              <RoomTypeAttributeFields />
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      {/* PAQUETES Y ADD-ONS (lectura) */}
      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Paquetes de horas</CardTitle>
            <CardDescription>Edición completa en la siguiente iteración.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="flex items-center justify-between rounded-xl bg-paper px-4 py-3 text-sm"
              >
                <span className="font-display font-semibold">{pkg.name}</span>
                <span className="text-stone-deep">
                  {formatMXN(pkg.priceCents)} · {pkg.validityDays} días
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Add-ons</CardTitle>
            <CardDescription>Lockers, equipo y visibilidad.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {addOns.map((addon) => (
              <div
                key={addon.id}
                className="flex items-center justify-between rounded-xl bg-paper px-4 py-3 text-sm"
              >
                <span className="font-display font-semibold">{addon.name}</span>
                <span className="text-stone-deep">
                  {formatMXN(addon.priceCents)}
                  {addon.billing === "MONTHLY" ? "/mes" : " único"}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
