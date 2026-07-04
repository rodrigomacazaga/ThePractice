"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CreditCard, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/form";
import { cn, formatCredits, formatMXN, hourLabel } from "@/lib/utils";

export interface BookingDay {
  dateStr: string;
  label: string;
  monthLabel: string;
}

export interface BookingRoom {
  id: string;
  name: string;
  typeName: string;
  typeCode: string;
  creditsPerHour: number;
  hourlyPriceCents: number;
  takenHours: number[];
}

export function BookingClient({
  locations,
  currentLocation,
  days,
  currentDate,
  rooms,
  openingHour,
  closingHour,
  pastCutoffHour,
  walletBalance,
  isApproved,
}: {
  locations: { slug: string; name: string }[];
  currentLocation: string;
  days: BookingDay[];
  currentDate: string;
  rooms: BookingRoom[];
  openingHour: number;
  closingHour: number;
  pastCutoffHour: number;
  walletBalance: number;
  isApproved: boolean;
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<{ roomId: string; startHour: number } | null>(null);
  const [hours, setHours] = useState(1);
  const [payWith, setPayWith] = useState<"credits" | "card">("credits");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hourCols = useMemo(() => {
    const cols: number[] = [];
    for (let h = openingHour; h < closingHour; h++) cols.push(h);
    return cols;
  }, [openingHour, closingHour]);

  const selectedRoom = rooms.find((r) => r.id === selection?.roomId);

  function isFree(room: BookingRoom, hour: number) {
    return hour > pastCutoffHour && !room.takenHours.includes(hour);
  }

  function canStartAt(room: BookingRoom, startHour: number, duration: number) {
    if (startHour + duration > closingHour) return false;
    for (let h = startHour; h < startHour + duration; h++) {
      if (!isFree(room, h)) return false;
    }
    return true;
  }

  const creditsNeeded = selectedRoom ? selectedRoom.creditsPerHour * hours : 0;
  const priceCents = selectedRoom ? selectedRoom.hourlyPriceCents * hours : 0;
  const insufficientCredits = payWith === "credits" && creditsNeeded > walletBalance;

  async function confirm() {
    if (!selection || !selectedRoom) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selection.roomId,
          date: currentDate,
          startHour: selection.startHour,
          hours,
          payWith,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la reserva.");
        setSubmitting(false);
        if (data.code === "SLOT_TAKEN") router.refresh();
        return;
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      router.push("/practitioner/calendar?status=confirmed");
      router.refresh();
    } catch {
      setError("Error de red. Intenta de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {!isApproved && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-warm/25 bg-amber-soft p-4 text-sm text-amber-warm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          Tu perfil está en verificación: podrás confirmar reservas cuando sea
          aprobado. Mientras tanto puedes explorar la disponibilidad.
        </div>
      )}

      {/* CONTROLES */}
      <div className="flex flex-wrap items-center gap-3">
        {locations.length > 1 && (
          <Select
            className="w-auto"
            value={currentLocation}
            onChange={(e) =>
              router.push(`/practitioner/book?location=${e.target.value}&date=${currentDate}`)
            }
            aria-label="Ubicación"
          >
            {locations.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name}
              </option>
            ))}
          </Select>
        )}

        <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1">
          {days.map((day) => (
            <button
              key={day.dateStr}
              onClick={() => {
                setSelection(null);
                router.push(`/practitioner/book?location=${currentLocation}&date=${day.dateStr}`);
              }}
              className={cn(
                "flex shrink-0 flex-col items-center rounded-xl border px-3.5 py-2 font-display text-xs font-semibold transition-colors",
                day.dateStr === currentDate
                  ? "border-ink bg-ink text-paper"
                  : "border-line-strong bg-surface text-ink-mute hover:border-ink"
              )}
            >
              <span className="capitalize">{day.label}</span>
              <span
                className={cn(
                  "text-[10px] font-medium capitalize",
                  day.dateStr === currentDate ? "text-paper/60" : "text-stone"
                )}
              >
                {day.monthLabel}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* GRID DE DISPONIBILIDAD */}
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-(--shadow-card)">
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-line">
              <th className="sticky left-0 z-10 bg-surface px-4 py-3 text-left font-display text-[11px] font-semibold tracking-wider text-stone-deep uppercase">
                Sala
              </th>
              {hourCols.map((h) => (
                <th key={h} className="px-1 py-3 text-center font-mono text-[10px] font-medium text-stone">
                  {hourLabel(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rooms.map((room) => (
              <tr key={room.id}>
                <td className="sticky left-0 z-10 bg-surface px-4 py-2.5">
                  <p className="font-display text-xs font-bold whitespace-nowrap">{room.name}</p>
                  <p className="text-[10px] whitespace-nowrap text-stone">
                    {room.typeName} · {formatCredits(room.creditsPerHour)} cr/h ·{" "}
                    {formatMXN(room.hourlyPriceCents)}/h
                  </p>
                </td>
                {hourCols.map((h) => {
                  const free = isFree(room, h);
                  const isSelected =
                    selection?.roomId === room.id &&
                    h >= selection.startHour &&
                    h < selection.startHour + hours;
                  const selectable = free && canStartAt(room, h, hours);
                  return (
                    <td key={h} className="p-0.5">
                      <button
                        disabled={!free}
                        onClick={() =>
                          selectable
                            ? setSelection({ roomId: room.id, startHour: h })
                            : setSelection(null)
                        }
                        aria-label={`${room.name} ${hourLabel(h)}`}
                        className={cn(
                          "h-9 w-full min-w-8 rounded-md transition-colors",
                          !free && "cursor-not-allowed bg-paper-deep",
                          free && !isSelected && "bg-sage-soft hover:bg-sage/30",
                          isSelected && "bg-ink"
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-stone-deep">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-sage-soft" /> Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-paper-deep" /> Ocupado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-ink" /> Tu selección
        </span>
      </div>

      {/* RESUMEN Y CONFIRMACIÓN */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-(--shadow-card)">
        <div className="flex flex-wrap items-end gap-6">
          <div className="min-w-40">
            <p className="font-display text-[11px] font-semibold tracking-wider text-stone-deep uppercase">
              Duración
            </p>
            <Select
              className="mt-2"
              value={String(hours)}
              onChange={(e) => {
                setHours(Number(e.target.value));
                setSelection(null);
              }}
            >
              {[1, 2, 3, 4].map((h) => (
                <option key={h} value={h}>
                  {h} {h === 1 ? "hora" : "horas"}
                </option>
              ))}
            </Select>
          </div>

          <div className="min-w-52">
            <p className="font-display text-[11px] font-semibold tracking-wider text-stone-deep uppercase">
              Pagar con
            </p>
            <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-xl bg-paper p-1.5">
              <button
                onClick={() => setPayWith("credits")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg py-2 font-display text-xs font-semibold transition-colors",
                  payWith === "credits" ? "bg-ink text-paper" : "text-ink-mute hover:text-ink"
                )}
              >
                <Wallet className="h-3.5 w-3.5" />
                Créditos
              </button>
              <button
                onClick={() => setPayWith("card")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg py-2 font-display text-xs font-semibold transition-colors",
                  payWith === "card" ? "bg-ink text-paper" : "text-ink-mute hover:text-ink"
                )}
              >
                <CreditCard className="h-3.5 w-3.5" />
                Tarjeta
              </button>
            </div>
          </div>

          <div className="flex-1">
            {selection && selectedRoom ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-display text-sm font-bold">
                    {selectedRoom.name} · {hourLabel(selection.startHour)}–
                    {hourLabel(selection.startHour + hours)}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-deep">
                    {payWith === "credits" ? (
                      <>
                        {formatCredits(creditsNeeded)} créditos · tienes{" "}
                        {formatCredits(walletBalance)}
                      </>
                    ) : (
                      <>Total: {formatMXN(priceCents)}</>
                    )}
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={confirm}
                  disabled={submitting || !isApproved || insufficientCredits}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {payWith === "credits" ? "Confirmar reserva" : "Continuar al pago"}
                </Button>
              </div>
            ) : (
              <p className="pb-2 text-sm text-stone">
                Selecciona un horario disponible en el grid.
              </p>
            )}
            {insufficientCredits && selection && (
              <p className="mt-2 text-xs font-medium text-rust">
                Créditos insuficientes.{" "}
                <a href="/practitioner/credits" className="underline">
                  Compra un paquete
                </a>{" "}
                o paga con tarjeta.
              </p>
            )}
            {error && (
              <p className="mt-2 rounded-xl bg-rust-soft px-4 py-2.5 text-xs font-medium text-rust">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" size="md">
          Cancelación gratuita hasta 24 h antes
        </Badge>
        <Badge variant="outline" size="md">
          Código de acceso al confirmar
        </Badge>
      </div>
    </div>
  );
}
