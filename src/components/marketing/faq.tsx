import { Plus } from "lucide-react";

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
      {items.map((item) => (
        <details key={item.q} className="group px-6 py-5 open:bg-paper/40">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {item.q}
            <Plus className="h-4 w-4 shrink-0 text-stone transition-transform group-open:rotate-45" />
          </summary>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-deep">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
