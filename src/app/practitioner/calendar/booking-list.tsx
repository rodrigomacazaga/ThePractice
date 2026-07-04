"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCredits, formatDateTimeMX, formatMXN } from "@/lib/utils";

export interface SerializedBooking {
  id: string;
  code: string;
  status: string;
  kind: string;
  roomName: string;
  roomType: string;
  locationName: string;
  timezone: string;
  startsAt: string;
  endsAt: string;
  creditsUsed: number | null;
  priceCents: number | null;
  accessCode: string | null;
  checkedInAt: string | null;
}

const STATUS_META: Record<string, { label: string; variant: "sage" | "amber" | "rust" | "default" | "ink" }> = {
  CONFIRMED: { label: "Confirmada", variant: "sage" },
  PENDING_PAYMENT: { label: "Pago pendiente", variant: "amber" },
  CHECKED_IN: { label: "En curso", variant: "ink" },
  COMPLETED: { label: "Completada", variant: "default" },
  CANCELLED: { label: "Cancelada", variant: "default" },
  LATE_CANCELLED: { label: "Canc. tardía", variant: "rust" },
  NO_SHOW: { label: "No-show", variant: "rust" },
  REFUNDED: { label: "Reembolsada", variant: "default" },
  ADMIN_BLOCKED: { label: "Bloqueo", variant: "default" },
};

export function BookingList({
  upcoming,
  past,
}: {
  upcoming: SerializedBooking[];
  past: SerializedBooking[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(id: string, action: "cancel" | "checkin") {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "cancel" ? JSON.stringify({ reason: "Cancelada por el practitioner" }) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo completar la acción.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Error de red.");
    } finally {
      setBusy(null);
    }
  }

  function Row({ b, isPast }: { b: SerializedBooking; isPast: boolean }) {
    const meta = STATUS_META[b.status] ?? { label: b.status, variant: "default" as const };
    const canCancel = !isPast && ["CONFIRMED", "PENDING_PAYMENT"].includes(b.status);
    const withinCheckIn =
      b.status === "CONFIRMED" &&
      Date.now() >= new Date(b.startsAt).getTime() - 15 * 60_000 &&
      Date.now() <= new Date(b.endsAt).getTime();

    return (
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-(--shadow-card)">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-sm font-bold">
              {b.roomName}
              {b.roomType && <span className="font-normal text-stone-deep"> · {b.roomType}</span>}
            </p>
            <Badge variant={meta.variant}>{meta.label}</Badge>
          </div>
          <p className="mt-1 text-xs text-stone-deep">
            {formatDateTimeMX(new Date(b.startsAt), b.timezone)} —{" "}
            {formatDateTimeMX(new Date(b.endsAt), b.timezone).split(", ")[1]} · {b.locationName} ·{" "}
            <span className="font-mono">{b.code}</span>
            {b.creditsUsed != null && ` · ${formatCredits(b.creditsUsed)} créditos`}
            {b.priceCents != null && ` · ${formatMXN(b.priceCents)}`}
          </p>
        </div>

        {b.accessCode && b.status === "CONFIRMED" && (
          <div className="rounded-lg bg-paper px-3 py-2 text-center">
            <p className="text-[9px] font-semibold tracking-widest text-stone uppercase">Acceso</p>
            <p className="font-mono text-sm font-bold tracking-[0.2em]">{b.accessCode}</p>
          </div>
        )}

        {withinCheckIn && (
          <Button size="sm" onClick={() => act(b.id, "checkin")} disabled={busy === b.id}>
            {busy === b.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Check-in
          </Button>
        )}
        {canCancel && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => act(b.id, "cancel")}
            disabled={busy === b.id}
          >
            {busy === b.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Cancelar
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {error && (
        <p className="rounded-xl bg-rust-soft px-4 py-3 text-sm font-medium text-rust">{error}</p>
      )}

      <div>
        <h2 className="eyebrow">Próximas</h2>
        <div className="mt-4 space-y-3">
          {upcoming.length === 0 ? (
            <p className="text-sm text-stone">Sin reservas próximas.</p>
          ) : (
            upcoming.map((b) => <Row key={b.id} b={b} isPast={false} />)
          )}
        </div>
      </div>

      {past.length > 0 && (
        <div>
          <h2 className="eyebrow">Historial</h2>
          <div className="mt-4 space-y-3 opacity-80">
            {past.map((b) => (
              <Row key={b.id} b={b} isPast />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
