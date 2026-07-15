import { Check, Crown } from "lucide-react";
import { requirePractitioner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatCredits, formatDateMX, formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckoutButton } from "@/components/dashboard/checkout-button";
import { isFounderEligible } from "@/lib/founder";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MembershipPage() {
  const { session, profile } = await requirePractitioner();
  const [plans, founderEligible] = await Promise.all([
    db.membershipPlan.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    isFounderEligible(session.user.email),
  ]);

  const membership = profile.membership;
  const activePlanCode = membership?.status === "ACTIVE" ? membership.plan.code : null;

  return (
    <>
      <PageHeader
        title="Membresía"
        description="Tu plan define horas incluidas, micrositio y beneficios."
      />

      {/* PLAN ACTUAL */}
      {membership?.status === "ACTIVE" ? (
        <Card className="border-ink bg-ink text-paper">
          <CardContent className="flex flex-wrap items-center justify-between gap-6 p-7">
            <div>
              <div className="flex items-center gap-2.5">
                <Crown className="h-5 w-5 text-clay" />
                <h2 className="font-display text-xl font-bold">
                  Plan {membership.plan.name}
                </h2>
                {membership.isFounder && <Badge variant="clay">Founder</Badge>}
              </div>
              <p className="mt-1.5 text-sm text-paper/60">
                {formatCredits(membership.plan.includedCredits)} horas/mes ·
                renueva el {formatDateMX(membership.currentPeriodEnd)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold">
                {formatMXN(
                  membership.isFounder && membership.plan.founderPriceCents != null
                    ? membership.plan.founderPriceCents
                    : membership.plan.monthlyPriceCents
                )}
                <span className="text-sm font-normal text-paper/60">/mes</span>
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-7 text-center">
            <p className="font-display text-base font-bold">Sin membresía activa</p>
            <p className="mt-1 text-sm text-stone-deep">
              Activa un plan para obtener horas incluidas, micrositio y precio
              preferente en salas.
            </p>
          </CardContent>
        </Card>
      )}

      {/* PLANES DISPONIBLES */}
      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.code === activePlanCode;
          const showFounder = founderEligible && plan.founderPriceCents != null;
          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-2xl border bg-surface p-6 shadow-(--shadow-card)",
                isCurrent ? "border-ink" : "border-line"
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold">{plan.name}</h3>
                {isCurrent && <Badge variant="ink">Tu plan</Badge>}
                {plan.highlighted && !isCurrent && <Badge variant="clay">Popular</Badge>}
              </div>
              {showFounder ? (
                <>
                  <p className="mt-3 font-display text-2xl font-bold text-clay">
                    {formatMXN(plan.founderPriceCents!)}
                    <span className="text-xs font-normal text-stone">/mes</span>
                  </p>
                  <p className="mt-0.5 text-xs text-stone line-through">
                    {formatMXN(plan.monthlyPriceCents)}/mes
                  </p>
                  <Badge variant="clay" className="mt-1">
                    Precio Founder
                  </Badge>
                </>
              ) : (
                <p className="mt-3 font-display text-2xl font-bold">
                  {formatMXN(plan.monthlyPriceCents)}
                  <span className="text-xs font-normal text-stone">/mes</span>
                </p>
              )}
              {plan.includedCredits > 0 && (
                <p className="mt-1 text-xs text-stone-deep">
                  {formatCredits(plan.includedCredits)} horas incluidas
                </p>
              )}
              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.slice(0, 5).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-ink-mute">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-sage" strokeWidth={3} />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <p className="text-center font-display text-xs font-semibold text-stone">
                    Activo
                  </p>
                ) : (
                  <CheckoutButton
                    kind="MEMBERSHIP"
                    code={plan.code}
                    founder={showFounder}
                    variant={plan.highlighted ? "primary" : "outline"}
                    size="md"
                    className="w-full"
                  >
                    {activePlanCode ? "Cambiar a este plan" : "Activar plan"}
                  </CheckoutButton>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-stone">
        Los cambios de plan aplican de inmediato y otorgan las horas del nuevo
        plan. La renovación es mensual; puedes cancelar al final de cualquier
        periodo desde Soporte. Con el proveedor de pagos mock (desarrollo), el
        pago se confirma automáticamente.
      </p>
    </>
  );
}
