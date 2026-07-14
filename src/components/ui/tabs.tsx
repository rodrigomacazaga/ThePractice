"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Tabs con semántica ARIA completa (tablist/tab/tabpanel) y navegación por
 * flechas. Los paneles llegan server-rendereados como children; solo la
 * selección vive en el cliente, así que cambiar de pestaña es instantáneo.
 */
export function Tabs({
  tabs,
  panels,
}: {
  tabs: { id: string; label: string }[];
  panels: React.ReactNode[];
}) {
  const baseId = useId();
  const [active, setActive] = useState(tabs[0]?.id);
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.id === active)
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const delta = e.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(activeIndex + delta + tabs.length) % tabs.length];
    setActive(next.id);
    document.getElementById(`${baseId}-tab-${next.id}`)?.focus();
  }

  return (
    <>
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-line" onKeyDown={onKeyDown}>
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`${baseId}-tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={t.id === active}
            aria-controls={`${baseId}-panel-${t.id}`}
            tabIndex={t.id === active ? 0 : -1}
            onClick={() => setActive(t.id)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              t.id === active
                ? "border-clay text-ink"
                : "border-transparent text-stone hover:text-ink"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.id}
          id={`${baseId}-panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${t.id}`}
          hidden={t.id !== active}
          className="pt-6"
        >
          {panels[i]}
        </div>
      ))}
    </>
  );
}
