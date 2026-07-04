import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatCredits, formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { ActionForm } from "@/components/dashboard/action-form";
import { updatePlanPricing, updateRoomTypePricing } from "../actions";

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
              <CardTitle>{rt.name}</CardTitle>
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
            </CardContent>
          </Card>
        ))}
      </div>

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
