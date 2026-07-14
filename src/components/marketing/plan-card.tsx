import { Check } from "lucide-react";
import type { MembershipPlan } from "@prisma/client";
import { cn, formatMXN, formatCredits } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

export function PlanCard({
  plan,
  showFounderPrice = false,
  ctaHref = "/apply",
  className,
}: {
  plan: MembershipPlan;
  showFounderPrice?: boolean;
  ctaHref?: string;
  className?: string;
}) {
  const founder = showFounderPrice && plan.founderPriceCents != null;
  const price = founder ? plan.founderPriceCents! : plan.monthlyPriceCents;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border p-7 transition-shadow",
        plan.highlighted
          ? "border-ink bg-ink text-paper shadow-(--shadow-lift)"
          : "border-line bg-surface shadow-(--shadow-card) hover:shadow-(--shadow-lift)",
        className
      )}
    >
      {plan.highlighted && (
        <Badge variant="clay" className="absolute -top-3 left-7">
          Más elegido
        </Badge>
      )}

      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-display text-lg font-bold tracking-tight">{plan.name}</h3>
        {founder && (
          <Badge variant={plan.highlighted ? "clay" : "amber"}>Founder</Badge>
        )}
      </div>
      {plan.tagline && (
        <p className={cn("mt-1 text-sm", plan.highlighted ? "text-paper/60" : "text-stone-deep")}>
          {plan.tagline}
        </p>
      )}

      <div className="mt-6 flex items-end gap-2">
        <span className="font-display text-4xl font-bold tracking-tight">
          {formatMXN(price)}
        </span>
        <span className={cn("pb-1 text-sm", plan.highlighted ? "text-paper/60" : "text-stone")}>
          /mes
        </span>
      </div>
      {founder && (
        <p className={cn("mt-1 text-xs", plan.highlighted ? "text-paper/50" : "text-stone")}>
          Precio regular: <s>{formatMXN(plan.monthlyPriceCents)}</s> · tarifa founder
          mientras tu membresía siga activa
        </p>
      )}

      {plan.includedCredits > 0 && (
        <p
          className={cn(
            "mt-4 rounded-xl px-4 py-3 font-display text-sm font-semibold",
            plan.highlighted ? "bg-paper/10 text-paper" : "bg-paper text-ink"
          )}
        >
          {formatCredits(plan.includedCredits)} créditos al mes
          <span
            className={cn(
              "block font-sans text-[11px] font-normal",
              plan.highlighted ? "text-paper/50" : "text-stone"
            )}
          >
            = {formatCredits(plan.includedCredits)} h de sala estándar
          </span>
        </p>
      )}

      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm">
            <Check
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                plan.highlighted ? "text-clay" : "text-sage"
              )}
              strokeWidth={2.5}
            />
            <span className={plan.highlighted ? "text-paper/85" : "text-ink-mute"}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <ButtonLink
        href={ctaHref}
        variant={plan.highlighted ? "light" : "outline"}
        size="lg"
        className="mt-8 w-full"
      >
        {founder ? "Aplicar como founder" : "Aplicar"}
      </ButtonLink>
    </div>
  );
}
