import { Plus } from "lucide-react";
import type { AddOn, HourPackage, MembershipPlan, RoomType } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatCredits, formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionForm, ActionButton } from "@/components/dashboard/action-form";
import {
  deletePlan,
  updatePlanPricing,
  updateRoomTypePricing,
  upsertPlan,
  upsertRoomType,
  upsertHourPackage,
  upsertAddOn,
} from "../actions";

const ADDON_BILLINGS = [
  ["MONTHLY", "Mensual"],
  ["ONE_TIME", "Único"],
] as const;

const MICROSITE_TIERS = ["BASIC", "PRO", "PREMIUM", "FEATURED"] as const;

/** Atributos de un plan (precios y horas incluidas van en su form dedicado). */
function PlanAttributeFields({ plan, uid: uidProp }: { plan?: MembershipPlan; uid?: string }) {
  const uid = uidProp ?? plan?.id ?? "new";
  return (
    <>
      {plan && <input type="hidden" name="planId" value={plan.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre" htmlFor={`pl-name-${uid}`}>
          <Input id={`pl-name-${uid}`} name="name" required defaultValue={plan?.name} />
        </Field>
        <Field label="Tagline" htmlFor={`pl-tag-${uid}`}>
          <Input id={`pl-tag-${uid}`} name="tagline" defaultValue={plan?.tagline ?? ""} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Features (separadas por coma)" htmlFor={`pl-feat-${uid}`}>
          <Textarea
            id={`pl-feat-${uid}`}
            name="features"
            rows={2}
            defaultValue={plan?.features.join(", ")}
          />
        </Field>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Rollover máx (h)" htmlFor={`pl-roll-${uid}`}>
          <Input
            id={`pl-roll-${uid}`}
            name="rolloverLimit"
            type="number"
            min={0}
            step="0.5"
            defaultValue={plan?.rolloverLimit ?? 0}
          />
        </Field>
        <Field label="Horas de Studio" htmlFor={`pl-studio-${uid}`}>
          <Input
            id={`pl-studio-${uid}`}
            name="studioHoursIncluded"
            type="number"
            min={0}
            step="0.5"
            defaultValue={plan?.studioHoursIncluded ?? 0}
          />
        </Field>
        <Field label="Micrositio" htmlFor={`pl-tier-${uid}`}>
          <Select id={`pl-tier-${uid}`} name="micrositeTier" defaultValue={plan?.micrositeTier ?? "BASIC"}>
            {MICROSITE_TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Orden" htmlFor={`pl-sort-${uid}`}>
          <Input
            id={`pl-sort-${uid}`}
            name="sort"
            type="number"
            min={0}
            defaultValue={plan?.sort ?? 0}
          />
        </Field>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-medium sm:grid-cols-3">
        {(
          [
            ["highlighted", "Destacado (Popular)", plan?.highlighted ?? false],
            ["primeAccess", "Horarios prime", plan?.primeAccess ?? false],
            ["premiumRoomAccess", "Acceso a Premium", plan?.premiumRoomAccess ?? false],
            ["includesLocker", "Locker incluido", plan?.includesLocker ?? false],
            ["active", "Activo (visible)", plan?.active ?? true],
          ] as const
        ).map(([name, label, checked]) => (
          <label key={name} className="flex items-center gap-2">
            <input
              type="checkbox"
              name={name}
              defaultChecked={checked}
              className="h-4 w-4 accent-clay"
            />
            {label}
          </label>
        ))}
      </div>
    </>
  );
}

/** Atributos de un tipo de sala (los precios van en su formulario dedicado). */
function RoomTypeAttributeFields({ rt, uid: uidProp }: { rt?: RoomType; uid?: string }) {
  const uid = uidProp ?? rt?.id ?? "new";
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

/**
 * Campos de un paquete de horas. Sin locationId (llega en una fase posterior):
 * la estructura queda lista para extenderse con un selector de ubicación.
 */
function HourPackageFields({ pkg, uid: uidProp }: { pkg?: HourPackage; uid?: string }) {
  const uid = uidProp ?? pkg?.id ?? "new";
  return (
    <>
      {pkg && <input type="hidden" name="packageId" value={pkg.id} />}
      {!pkg && (
        <div className="mb-3">
          <Field label="Código (fijo tras crear)" htmlFor={`pk-code-${uid}`} hint="minúsculas y guiones, ej. pack-10">
            <Input id={`pk-code-${uid}`} name="code" required placeholder="pack-10" />
          </Field>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre" htmlFor={`pk-name-${uid}`}>
          <Input id={`pk-name-${uid}`} name="name" required placeholder="10 horas" defaultValue={pkg?.name} />
        </Field>
        <Field label="Horas" htmlFor={`pk-hours-${uid}`}>
          <Input
            id={`pk-hours-${uid}`}
            name="hours"
            type="number"
            min={0.5}
            step="0.5"
            required
            defaultValue={pkg?.hours}
          />
        </Field>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <Field label="Precio (MXN)" htmlFor={`pk-price-${uid}`}>
          <Input
            id={`pk-price-${uid}`}
            name="price"
            type="number"
            min={0}
            required
            defaultValue={pkg ? pkg.priceCents / 100 : undefined}
          />
        </Field>
        <Field label="Vigencia (días)" htmlFor={`pk-val-${uid}`}>
          <Input
            id={`pk-val-${uid}`}
            name="validityDays"
            type="number"
            min={1}
            max={365}
            required
            defaultValue={pkg?.validityDays ?? 90}
          />
        </Field>
        <Field label="Orden" htmlFor={`pk-sort-${uid}`}>
          <Input id={`pk-sort-${uid}`} name="sort" type="number" min={0} defaultValue={pkg?.sort ?? 0} />
        </Field>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="active" defaultChecked={pkg?.active ?? true} className="h-4 w-4 accent-clay" />
        Activo (a la venta)
      </label>
    </>
  );
}

/**
 * Campos de un add-on. Sin locationId (llega en una fase posterior): la
 * estructura queda lista para extenderse con un selector de ubicación.
 */
function AddOnFields({ addon, uid: uidProp }: { addon?: AddOn; uid?: string }) {
  const uid = uidProp ?? addon?.id ?? "new";
  return (
    <>
      {addon && <input type="hidden" name="addOnId" value={addon.id} />}
      {!addon && (
        <div className="mb-3">
          <Field label="Código (fijo tras crear)" htmlFor={`ad-code-${uid}`} hint="minúsculas y guiones, ej. locker">
            <Input id={`ad-code-${uid}`} name="code" required placeholder="locker" />
          </Field>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre" htmlFor={`ad-name-${uid}`}>
          <Input id={`ad-name-${uid}`} name="name" required placeholder="Locker mensual" defaultValue={addon?.name} />
        </Field>
        <Field label="Facturación" htmlFor={`ad-bill-${uid}`}>
          <Select id={`ad-bill-${uid}`} name="billing" defaultValue={addon?.billing ?? "MONTHLY"}>
            {ADDON_BILLINGS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Descripción" htmlFor={`ad-desc-${uid}`}>
          <Textarea id={`ad-desc-${uid}`} name="description" rows={2} defaultValue={addon?.description ?? ""} />
        </Field>
      </div>
      <div className="mt-3 flex items-end gap-4">
        <Field label="Precio (MXN)" htmlFor={`ad-price-${uid}`} className="max-w-40">
          <Input
            id={`ad-price-${uid}`}
            name="price"
            type="number"
            min={0}
            required
            defaultValue={addon ? addon.priceCents / 100 : undefined}
          />
        </Field>
        <Field label="Orden" htmlFor={`ad-sort-${uid}`} className="max-w-24">
          <Input id={`ad-sort-${uid}`} name="sort" type="number" min={0} defaultValue={addon?.sort ?? 0} />
        </Field>
        <label className="flex items-center gap-2 pb-2.5 text-sm font-medium">
          <input type="checkbox" name="active" defaultChecked={addon?.active ?? true} className="h-4 w-4 accent-clay" />
          Activo
        </label>
      </div>
    </>
  );
}

export const dynamic = "force-dynamic";

export default async function AdminCatalogPage() {
  await requireAdmin();

  const [plans, locations, packages, addOns] = await Promise.all([
    db.membershipPlan.findMany({ orderBy: { sort: "asc" } }),
    db.location.findMany({
      orderBy: { sort: "asc" },
      include: { roomTypes: { orderBy: { sort: "asc" } } },
    }),
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
                {!plan.active && (
                  <Badge variant="default" className="ml-2">
                    Inactivo
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

              <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                <Modal trigger="Editar plan" title={`Editar ${plan.name}`}>
                  <ActionForm action={upsertPlan} submitLabel="Guardar cambios">
                    <PlanAttributeFields plan={plan} />
                  </ActionForm>
                </Modal>
                <ActionButton
                  action={deletePlan.bind(null, plan.id)}
                  label="Eliminar"
                  variant="danger"
                  confirmText={`¿Eliminar el plan "${plan.name}"? Si nadie lo ha contratado se borra definitivamente; si tiene membresías solo se desactiva.`}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Nuevo plan */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4.5 w-4.5 text-clay" /> Nuevo plan
            </CardTitle>
            <CardDescription>
              El código es la llave interna (minúsculas y guiones, ej.{" "}
              <span className="font-mono">starter</span>) y no se puede cambiar después.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={upsertPlan} submitLabel="Crear plan">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Código" htmlFor="pl-code-new">
                  <Input id="pl-code-new" name="code" required placeholder="starter" />
                </Field>
                <Field label="Precio/mes (MXN)" htmlFor="pl-mp-new">
                  <Input id="pl-mp-new" name="monthlyPrice" type="number" min={0} required />
                </Field>
                <Field label="Precio founder" htmlFor="pl-fp-new">
                  <Input id="pl-fp-new" name="founderPrice" type="number" min={0} />
                </Field>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <Field label="Horas incluidas" htmlFor="pl-cr-new">
                  <Input
                    id="pl-cr-new"
                    name="includedCredits"
                    type="number"
                    min={0}
                    step="0.5"
                    required
                  />
                </Field>
              </div>
              <div className="mt-3">
                <PlanAttributeFields uid="new-plan" />
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      </div>

      {/* TIPOS DE SALA — viven dentro de cada establecimiento */}
      {locations.map((loc) => (
        <section key={loc.id}>
          <h2 className="mt-12 eyebrow">Tipos de sala · {loc.shortName}</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {loc.roomTypes.map((rt) => (
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

              <div className="mt-5 border-t border-line pt-4">
                <Modal trigger="Editar atributos" title={`Editar ${rt.name}`}>
                  <ActionForm action={upsertRoomType} submitLabel="Guardar atributos">
                    <RoomTypeAttributeFields rt={rt} />
                  </ActionForm>
                </Modal>
              </div>
            </CardContent>
          </Card>
            ))}

            {/* Nuevo tipo en esta ubicación */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-4.5 w-4.5 text-clay" /> Nuevo tipo en {loc.shortName}
                </CardTitle>
                <CardDescription>
                  El código es la llave interna del tipo (minúsculas y guiones, ej.{" "}
                  <span className="font-mono">focus</span>), único por ubicación y fijo tras
                  crear. Las salas de este tipo se dan de alta en la sección Salas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActionForm action={upsertRoomType} submitLabel="Crear tipo de sala">
                  <input type="hidden" name="locationId" value={loc.id} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Código" htmlFor={`rt-code-new-${loc.id}`}>
                      <Input id={`rt-code-new-${loc.id}`} name="code" required placeholder="focus" />
                    </Field>
                    <Field label="Precio/hora (MXN)" htmlFor={`rt-bp-new-${loc.id}`}>
                      <Input
                        id={`rt-bp-new-${loc.id}`}
                        name="basePrice"
                        type="number"
                        min={0}
                        required
                      />
                    </Field>
                    <Field label="Con membresía (MXN)" htmlFor={`rt-mp-new-${loc.id}`}>
                      <Input id={`rt-mp-new-${loc.id}`} name="memberPrice" type="number" min={0} />
                    </Field>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Field label="Créditos/hora" htmlFor={`rt-cph-new-${loc.id}`}>
                      <Input
                        id={`rt-cph-new-${loc.id}`}
                        name="creditsPerHour"
                        type="number"
                        min={0.5}
                        step="0.5"
                        defaultValue={1}
                      />
                    </Field>
                  </div>
                  <div className="mt-3">
                    <RoomTypeAttributeFields uid={`new-${loc.id}`} />
                  </div>
                </ActionForm>
              </CardContent>
            </Card>
          </div>
        </section>
      ))}

      {/* PAQUETES Y ADD-ONS */}
      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Paquetes de horas</CardTitle>
            <CardDescription>Bolsas de horas prepagadas con vigencia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-paper px-4 py-3 text-sm"
              >
                <span className="flex items-center gap-2 font-display font-semibold">
                  {pkg.name}
                  {!pkg.active && (
                    <Badge variant="default">Inactivo</Badge>
                  )}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-stone-deep">
                    {formatMXN(pkg.priceCents)} · {formatCredits(pkg.hours)} h · {pkg.validityDays} días
                  </span>
                  <Modal trigger="Editar" title={`Editar ${pkg.name}`}>
                    <ActionForm action={upsertHourPackage} submitLabel="Guardar cambios">
                      <HourPackageFields pkg={pkg} />
                    </ActionForm>
                  </Modal>
                </span>
              </div>
            ))}
            <div className="border-t border-line pt-3">
              <Modal trigger="Nuevo paquete" title="Nuevo paquete de horas">
                <ActionForm action={upsertHourPackage} submitLabel="Crear paquete">
                  <HourPackageFields uid="new-pkg" />
                </ActionForm>
              </Modal>
            </div>
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
                className="flex items-center justify-between gap-3 rounded-xl bg-paper px-4 py-3 text-sm"
              >
                <span className="flex items-center gap-2 font-display font-semibold">
                  {addon.name}
                  {!addon.active && (
                    <Badge variant="default">Inactivo</Badge>
                  )}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-stone-deep">
                    {formatMXN(addon.priceCents)}
                    {addon.billing === "MONTHLY" ? "/mes" : " único"}
                  </span>
                  <Modal trigger="Editar" title={`Editar ${addon.name}`}>
                    <ActionForm action={upsertAddOn} submitLabel="Guardar cambios">
                      <AddOnFields addon={addon} />
                    </ActionForm>
                  </Modal>
                </span>
              </div>
            ))}
            <div className="border-t border-line pt-3">
              <Modal trigger="Nuevo add-on" title="Nuevo add-on">
                <ActionForm action={upsertAddOn} submitLabel="Crear add-on">
                  <AddOnFields uid="new-addon" />
                </ActionForm>
              </Modal>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
