import { db } from "@/lib/db";
import type { PaymentKind } from "@prisma/client";

/**
 * Ingresos y su atribución por ubicación.
 *
 * `Payment` no siempre trae `locationId` (los cobros históricos no lo tenían),
 * así que la atribución sigue esta cascada, de más precisa a menos:
 *   1. `payment.locationId` — se llena en los cobros nuevos.
 *   2. La ubicación de la reserva ligada al pago.
 *   3. La sede principal del practitioner que pagó (membresías, paquetes).
 * Lo que no se puede atribuir queda en `sinAtribuir`: se reporta aparte en vez
 * de repartirlo con supuestos, para no inventar números.
 */

/** Líneas de negocio que reportamos por separado. */
export type RevenueLine = "reservas" | "membresias" | "paquetes" | "addons" | "depositos" | "otros";

const KIND_TO_LINE: Record<PaymentKind, RevenueLine> = {
  BOOKING: "reservas",
  MEMBERSHIP: "membresias",
  PACKAGE: "paquetes",
  ADDON: "addons",
  DEPOSIT: "depositos",
};

export interface RevenueBreakdown {
  totalCents: number;
  porLinea: Record<RevenueLine, number>;
}

export interface RevenueByLocation {
  /** locationId → ingreso en centavos */
  porUbicacion: Map<string, RevenueBreakdown>;
  sinAtribuir: RevenueBreakdown;
  total: RevenueBreakdown;
}

function emptyBreakdown(): RevenueBreakdown {
  return {
    totalCents: 0,
    porLinea: { reservas: 0, membresias: 0, paquetes: 0, addons: 0, depositos: 0, otros: 0 },
  };
}

function add(target: RevenueBreakdown, line: RevenueLine, cents: number) {
  target.totalCents += cents;
  target.porLinea[line] += cents;
}

/**
 * Ingreso cobrado (status PAID) en un rango, atribuido por ubicación.
 * Descuenta lo reembolsado: reporta dinero que realmente se quedó.
 */
export async function getRevenue(from: Date, to: Date): Promise<RevenueByLocation> {
  const payments = await db.payment.findMany({
    where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] }, paidAt: { gte: from, lt: to } },
    select: {
      amountCents: true,
      refundedCents: true,
      kind: true,
      locationId: true,
      bookings: { select: { locationId: true }, take: 1 },
      user: {
        select: {
          practitionerProfile: {
            select: { locations: { where: { isPrimary: true }, select: { locationId: true }, take: 1 } },
          },
        },
      },
    },
  });

  const porUbicacion = new Map<string, RevenueBreakdown>();
  const sinAtribuir = emptyBreakdown();
  const total = emptyBreakdown();

  for (const p of payments) {
    const neto = p.amountCents - p.refundedCents;
    if (neto <= 0) continue;
    const line = KIND_TO_LINE[p.kind] ?? "otros";

    const locationId =
      p.locationId ??
      p.bookings[0]?.locationId ??
      p.user.practitionerProfile?.locations[0]?.locationId ??
      null;

    add(total, line, neto);
    if (locationId) {
      const bucket = porUbicacion.get(locationId) ?? emptyBreakdown();
      add(bucket, line, neto);
      porUbicacion.set(locationId, bucket);
    } else {
      add(sinAtribuir, line, neto);
    }
  }

  return { porUbicacion, sinAtribuir, total };
}

/**
 * MRR de membresías activas, atribuido a la sede principal de cada
 * practitioner. Usa el precio de la ubicación si existe un override, si no el
 * del plan (founder cuando aplique) — nunca un importe hardcodeado.
 */
export async function getMrrByLocation(): Promise<{ porUbicacion: Map<string, number>; total: number }> {
  const memberships = await db.practitionerMembership.findMany({
    where: { status: "ACTIVE" },
    select: {
      isFounder: true,
      plan: {
        select: {
          id: true,
          monthlyPriceCents: true,
          founderPriceCents: true,
          locationPrices: {
            where: { active: true },
            select: { locationId: true, monthlyPriceCents: true, founderPriceCents: true },
          },
        },
      },
      practitioner: {
        select: { locations: { where: { isPrimary: true }, select: { locationId: true }, take: 1 } },
      },
    },
  });

  const porUbicacion = new Map<string, number>();
  let total = 0;

  for (const m of memberships) {
    const locationId = m.practitioner.locations[0]?.locationId ?? null;
    const override = locationId
      ? m.plan.locationPrices.find((lp) => lp.locationId === locationId)
      : undefined;

    const price = override
      ? m.isFounder
        ? override.founderPriceCents ?? override.monthlyPriceCents
        : override.monthlyPriceCents
      : m.isFounder
        ? m.plan.founderPriceCents ?? m.plan.monthlyPriceCents
        : m.plan.monthlyPriceCents;

    total += price;
    if (locationId) porUbicacion.set(locationId, (porUbicacion.get(locationId) ?? 0) + price);
  }

  return { porUbicacion, total };
}
