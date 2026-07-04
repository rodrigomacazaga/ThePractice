import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  sub,
  icon: Icon,
  className,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface p-5 shadow-(--shadow-card)",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="font-display text-[11px] font-semibold tracking-wider text-stone-deep uppercase">
          {label}
        </p>
        {Icon && <Icon className="h-4 w-4 text-stone" strokeWidth={1.75} />}
      </div>
      <p className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-stone-deep">{sub}</p>}
    </div>
  );
}
