import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-paper/50 px-8 py-14 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface text-stone-deep shadow-(--shadow-card)">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      )}
      <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-stone-deep">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
