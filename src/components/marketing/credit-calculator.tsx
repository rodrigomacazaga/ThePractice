"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowRight, Calculator, Minus, Plus } from "lucide-react";
import { cn, formatCredits } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface CalcPlan {
  code: string;
  name: string;
  credits: number;
  highlighted: boolean;
}

export interface CalcRoomType {
  code: string;
  name: string;
  creditsPerHour: number;
}

const ROOM_THUMBS: Record<string, string> = {
  talk: "/images/room-talk.jpg",
  consult: "/images/room-consult.jpg",
  premium: "/images/room-premium.jpg",
  studio: "/images/room-studio.jpg",
  restore: "/images/room-restore.jpg",
  movement: "/images/room-movement.jpg",
};

/**
 * Calculadora de créditos ↔ horas.
 * Modo 1: elige membresía → horas equivalentes por tipo de sala.
 * Modo 2 (inverso): arma tu semana → créditos necesarios → plan recomendado.
 */
export function CreditCalculator({
  plans,
  roomTypes,
}: {
  plans: CalcPlan[];
  roomTypes: CalcRoomType[];
}) {
  const defaultPlan = plans.find((p) => p.highlighted) ?? plans[0];
  const [selectedCode, setSelectedCode] = useState(defaultPlan?.code ?? "");
  const [weeklyHours, setWeeklyHours] = useState<Record<string, number>>({});

  const selected = plans.find((p) => p.code === selectedCode) ?? defaultPlan;

  // --- Modo inverso: semana → plan recomendado ---
  const WEEKS_PER_MONTH = 4;
  const monthlyCreditsNeeded = useMemo(
    () =>
      roomTypes.reduce(
        (sum, rt) => sum + (weeklyHours[rt.code] ?? 0) * rt.creditsPerHour * WEEKS_PER_MONTH,
        0
      ),
    [weeklyHours, roomTypes]
  );
  const hasSimulation = monthlyCreditsNeeded > 0;
  const recommended = useMemo(() => {
    const sorted = [...plans].sort((a, b) => a.credits - b.credits);
    return sorted.find((p) => p.credits >= monthlyCreditsNeeded) ?? sorted[sorted.length - 1];
  }, [plans, monthlyCreditsNeeded]);
  const recommendedCovers = (recommended?.credits ?? 0) >= monthlyCreditsNeeded;

  function adjustHours(code: string, delta: number) {
    setWeeklyHours((prev) => ({
      ...prev,
      [code]: Math.max(0, Math.min(40, (prev[code] ?? 0) + delta)),
    }));
  }

  if (!selected || plans.length === 0 || roomTypes.length === 0) return null;

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-(--shadow-card) sm:p-8">
      {/* ============ MODO 1: PLAN → HORAS ============ */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-paper">
            <Calculator className="h-4.5 w-4.5" strokeWidth={1.75} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold">Elige una membresía</h3>
            <p className="text-xs text-stone-deep">
              Y mira a cuántas horas equivale en cada espacio.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-xl bg-paper p-1.5">
          {plans.map((plan) => (
            <button
              key={plan.code}
              onClick={() => setSelectedCode(plan.code)}
              className={cn(
                "rounded-lg px-4 py-2 font-display text-xs font-semibold transition-colors",
                plan.code === selected.code
                  ? "bg-ink text-paper shadow-(--shadow-card)"
                  : "text-ink-mute hover:text-ink"
              )}
            >
              {plan.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-ink px-6 py-4 text-paper">
        <p className="font-display text-sm">
          <span className="text-2xl font-bold">{formatCredits(selected.credits)} créditos</span>
          <span className="ml-2 text-paper/60">al mes con {selected.name}</span>
        </p>
        <p className="mt-0.5 text-xs text-paper/50">
          1 crédito = 1 hora de sala estándar. Las reservas son en bloques de 1 hora.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {roomTypes.map((rt) => {
          const hours = Math.floor(selected.credits / rt.creditsPerHour);
          const thumb = ROOM_THUMBS[rt.code];
          return (
            <div
              key={rt.code}
              className="flex items-center gap-3.5 rounded-xl border border-line bg-paper p-3.5"
            >
              {thumb && (
                <Image
                  src={thumb}
                  alt={rt.name}
                  width={52}
                  height={52}
                  className="h-13 w-13 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-xs font-bold">{rt.name}</p>
                <p className="text-[11px] text-stone">
                  {formatCredits(rt.creditsPerHour)} cr/hora
                </p>
              </div>
              <p className="font-display text-lg font-bold whitespace-nowrap">
                {hours} <span className="text-xs font-semibold text-stone">h</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* ============ MODO 2: SEMANA → PLAN ============ */}
      <div className="mt-8 border-t border-line pt-7">
        <h3 className="font-display text-base font-bold">¿No sabes qué plan necesitas?</h3>
        <p className="mt-1 text-xs text-stone-deep">
          Arma tu semana típica y te decimos cuántos créditos necesitas al mes (×4 semanas).
        </p>

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {roomTypes.map((rt) => {
            const hours = weeklyHours[rt.code] ?? 0;
            return (
              <div
                key={rt.code}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-xl border px-4 py-3 transition-colors",
                  hours > 0 ? "border-ink bg-surface" : "border-line bg-paper"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-display text-xs font-bold">{rt.name}</p>
                  <p className="text-[11px] text-stone">horas / semana</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adjustHours(rt.code, -1)}
                    aria-label={`Menos horas en ${rt.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-line-strong text-ink-mute hover:border-ink hover:text-ink disabled:opacity-30"
                    disabled={hours === 0}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center font-display text-sm font-bold">{hours}</span>
                  <button
                    onClick={() => adjustHours(rt.code, 1)}
                    aria-label={`Más horas en ${rt.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-line-strong text-ink-mute hover:border-ink hover:text-ink"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {hasSimulation && recommended && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-clay-soft px-6 py-4">
            <div>
              <p className="font-display text-sm font-bold text-clay-deep">
                Necesitas ~{formatCredits(monthlyCreditsNeeded)} créditos al mes
              </p>
              <p className="mt-0.5 text-xs text-clay-deep/80">
                {recommendedCovers ? (
                  <>
                    Tu plan ideal: <strong>{recommended.name}</strong> (
                    {formatCredits(recommended.credits)} créditos
                    {recommended.credits > monthlyCreditsNeeded &&
                      ` — te sobran ${formatCredits(recommended.credits - monthlyCreditsNeeded)}`}
                    )
                  </>
                ) : (
                  <>
                    <strong>{recommended.name}</strong> ({formatCredits(recommended.credits)}{" "}
                    créditos) + horas adicionales con precio preferente
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="clay">{recommended.name}</Badge>
              <ButtonLink href="/apply" size="sm" variant="clay">
                Aplicar
                <ArrowRight className="h-3.5 w-3.5" />
              </ButtonLink>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
