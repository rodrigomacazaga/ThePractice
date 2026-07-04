"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/ui/form";
import { cn } from "@/lib/utils";

/**
 * Filtros del directorio: escriben searchParams en la URL (server-side
 * filtering, URLs compartibles e indexables).
 */
export function DirectoryFilters({
  locations,
  specialties,
}: {
  locations: { slug: string; name: string }[];
  specialties: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      startTransition(() => {
        router.replace(`/directory?${next.toString()}`, { scroll: false });
      });
    },
    [params, router]
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-line bg-surface p-4 shadow-(--shadow-card) transition-opacity sm:p-5",
        isPending && "opacity-60"
      )}
    >
      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
        <div className="relative">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-stone" />
          <Input
            placeholder="Buscar por nombre o tema…"
            className="pl-10"
            defaultValue={params.get("q") ?? ""}
            onChange={(e) => {
              const value = e.target.value;
              // debounce ligero
              window.clearTimeout((window as unknown as { __dirT?: number }).__dirT);
              (window as unknown as { __dirT?: number }).__dirT = window.setTimeout(
                () => setParam("q", value),
                350
              );
            }}
          />
        </div>

        <Select
          aria-label="Especialidad"
          value={params.get("specialty") ?? ""}
          onChange={(e) => setParam("specialty", e.target.value)}
        >
          <option value="">Especialidad</option>
          {specialties.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Ubicación"
          value={params.get("location") ?? ""}
          onChange={(e) => setParam("location", e.target.value)}
        >
          <option value="">Ubicación</option>
          {locations.map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.name}
            </option>
          ))}
        </Select>

        <Select
          aria-label="Modalidad"
          value={params.get("modality") ?? ""}
          onChange={(e) => setParam("modality", e.target.value)}
        >
          <option value="">Modalidad</option>
          <option value="IN_PERSON">Presencial</option>
          <option value="ONLINE">Online</option>
          <option value="HYBRID">Híbrida</option>
        </Select>

        <label className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-line-strong px-4 text-sm text-ink-mute select-none">
          <input
            type="checkbox"
            className="h-4 w-4 accent-ink"
            checked={params.get("accepting") === "1"}
            onChange={(e) => setParam("accepting", e.target.checked ? "1" : "")}
          />
          Acepta clientes
        </label>
      </div>
    </div>
  );
}
