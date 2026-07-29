import { AlertTriangle, Lightbulb, Info } from "lucide-react";
import Link from "next/link";
import type { Recommendation } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const META = {
  atencion: { icon: AlertTriangle, box: "border-rust/30 bg-rust-soft", iconColor: "text-rust" },
  oportunidad: { icon: Lightbulb, box: "border-clay/30 bg-clay-soft", iconColor: "text-clay-deep" },
  info: { icon: Info, box: "border-line bg-surface", iconColor: "text-stone" },
} as const;

/**
 * Recomendaciones del motor de reglas. Cada tarjeta muestra el dato que la
 * disparó: la idea es que se puedan discutir, no obedecer a ciegas.
 */
export function RecommendationList({
  items,
  className,
}: {
  items: Recommendation[];
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 lg:grid-cols-2", className)}>
      {items.map((r) => {
        const meta = META[r.severity];
        return (
          <div key={r.id} className={cn("rounded-2xl border p-5", meta.box)}>
            <div className="flex items-start gap-3">
              <meta.icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.iconColor)} strokeWidth={2} />
              <div className="min-w-0">
                <p className="font-display text-sm font-bold">{r.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-mute">{r.evidence}</p>
                <p className="mt-2 text-xs leading-relaxed text-stone-deep">{r.action}</p>
                {r.href && (
                  <Link href={r.href} className="mt-2 inline-block text-xs font-semibold text-ink underline">
                    Ir a configurarlo
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
