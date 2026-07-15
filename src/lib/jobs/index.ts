import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import {
  getAvailableCredits,
  reintegrateToLots,
  grantLot,
  parseAllocations,
} from "@/lib/credits/ledger";

/**
 * Jobs recurrentes en serverless: no hay proceso persistente, así que
 * cada job es una función idempotente invocable desde:
 *  - Netlify Scheduled Functions (o cron externo) → POST /api/jobs/run
 *  - Manualmente desde el panel admin
 *
 * MVP: implementados (release de reservas sin pago, expiración de créditos,
 * marcado de no-shows). Simulados/documentados: renovación de membresías
 * con cobro real, recordatorios por email programados, reportes.
 */

export type JobName =
  | "release-unpaid-bookings"
  | "expire-credits"
  | "mark-no-shows"
  | "renew-memberships";

export interface JobResult {
  job: JobName;
  processed: number;
  detail?: string;
}

/**
 * Reservas PENDING_PAYMENT vencidas se liberan. El umbral es configurable vía
 * `booking.pending_payment_hold_minutes` (setting global). Además de cancelar la
 * reserva marcamos su Payment PENDING vinculado como FAILED: así cerramos la
 * carrera con fulfillPayment (fulfill.ts) — si el pago llega después, no habrá un
 * PENDING que fulfill pueda transicionar a PAID sobre un slot ya liberado.
 */
export async function releaseUnpaidBookings(): Promise<JobResult> {
  const holdMinutes = await getSetting("booking.pending_payment_hold_minutes");
  const cutoff = new Date(Date.now() - holdMinutes * 60 * 1000);

  const expired = await db.booking.findMany({
    where: { status: "PENDING_PAYMENT", createdAt: { lt: cutoff } },
    select: { id: true, paymentId: true },
  });

  let processed = 0;
  for (const booking of expired) {
    await db.$transaction(async (tx) => {
      // Cancela solo si sigue PENDING_PAYMENT (evita pisar un CONFIRMED que
      // fulfillPayment pudo haber ganado justo antes de este job).
      const cancelled = await tx.booking.updateMany({
        where: { id: booking.id, status: "PENDING_PAYMENT" },
        data: { status: "CANCELLED", cancellationReason: "Pago no completado (auto)" },
      });
      if (cancelled.count === 0) return;

      // Marca el Payment vinculado como FAILED solo si sigue PENDING: si ya está
      // PAID lo dejamos intacto para que fulfill.ts resuelva el reembolso.
      if (booking.paymentId) {
        await tx.payment.updateMany({
          where: { id: booking.paymentId, status: "PENDING" },
          data: { status: "FAILED" },
        });
      }
      processed++;
    });
  }
  return { job: "release-unpaid-bookings", processed };
}

/**
 * Expira lotes vencidos: vacía su `remaining` (que ES el remanente real, sin
 * heurística) y registra la baja. Idempotente por construcción: un lote ya
 * vaciado tiene remaining 0 y no vuelve a entrar.
 */
export async function expireCredits(): Promise<JobResult> {
  const now = new Date();
  const expired = await db.creditLot.findMany({
    where: { expiresAt: { lt: now }, remaining: { gt: 0 } },
  });

  let processed = 0;
  for (const lot of expired) {
    await db.$transaction(async (tx) => {
      const fresh = await tx.creditLot.findUnique({ where: { id: lot.id } });
      if (!fresh || fresh.remaining <= 0) return;
      await tx.creditLot.update({ where: { id: lot.id }, data: { remaining: 0 } });
      const balance = await getAvailableCredits(tx, lot.walletId, now);
      await tx.creditWallet.update({ where: { id: lot.walletId }, data: { balance } });
      await tx.creditTransaction.create({
        data: {
          walletId: lot.walletId,
          type: "EXPIRATION",
          amount: -fresh.remaining,
          balanceAfter: balance,
          note: `Vencimiento de lote (${lot.source})`,
        },
      });
    });
    processed++;
  }
  return { job: "expire-credits", processed };
}

/**
 * Reservas CONFIRMED cuyo horario terminó sin check-in → NO_SHOW.
 *
 * Reservas pagadas con créditos: aplica `booking.no_show_penalty_pct` — reembolsa
 * al wallet la fracción no penalizada (CreditTransaction REFUND) y registra la
 * parte penalizada (CreditTransaction NO_SHOW_PENALTY). Sigue el patrón del
 * late_cancel_penalty en engine.ts (cancelRoomBooking). Reservas pagadas con
 * dinero (creditsUsed nulo/0): solo se marcan NO_SHOW, sin efecto en créditos.
 */
export async function markNoShows(): Promise<JobResult> {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  const pending = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      kind: "ROOM_RENTAL",
      endsAt: { lt: cutoff },
      checkedInAt: null,
    },
    include: { practitioner: { include: { wallet: true } } },
  });

  let processed = 0;
  for (const booking of pending) {
    const creditsUsed = booking.creditsUsed ?? 0;
    const wallet = booking.practitioner?.wallet;

    // Sin créditos consumidos (pagó con dinero) → solo marcar NO_SHOW.
    if (creditsUsed <= 0 || !wallet) {
      await db.booking.updateMany({
        where: { id: booking.id, status: "CONFIRMED" },
        data: { status: "NO_SHOW" },
      });
      processed++;
      continue;
    }

    // Dedupe para reruns del job: si ya existe la penalización de este booking,
    // el efecto de créditos ya se aplicó; solo aseguramos el estado NO_SHOW.
    const alreadyPenalized = await db.creditTransaction.findFirst({
      where: { bookingId: booking.id, type: "NO_SHOW_PENALTY" },
      select: { id: true },
    });
    if (alreadyPenalized) {
      await db.booking.updateMany({
        where: { id: booking.id, status: "CONFIRMED" },
        data: { status: "NO_SHOW" },
      });
      processed++;
      continue;
    }

    const penaltyPct = await getSetting("booking.no_show_penalty_pct", booking.locationId);
    const refund = creditsUsed * (1 - penaltyPct / 100);
    const penalized = creditsUsed - refund;

    const now = new Date();
    await db.$transaction(async (tx) => {
      // Solo transiciona si sigue CONFIRMED (evita doble efecto por concurrencia).
      const updated = await tx.booking.updateMany({
        where: { id: booking.id, status: "CONFIRMED" },
        data: { status: "NO_SHOW" },
      });
      if (updated.count === 0) return;

      let balanceAfter = wallet.balance;
      if (refund > 0) {
        // Reintegra al lote de origen (fracción no penalizada); fallback a lote nuevo.
        const consumption = await tx.creditTransaction.findFirst({
          where: { bookingId: booking.id, type: "BOOKING_CONSUMPTION" },
          orderBy: { createdAt: "desc" },
        });
        const allocations = parseAllocations(consumption?.lotAllocations);
        const fraction = 1 - penaltyPct / 100;
        let restored = 0;
        if (allocations.length > 0) {
          restored = await reintegrateToLots(tx, wallet.id, allocations, fraction, now);
        }
        if (restored + 1e-9 < refund) {
          await grantLot(tx, {
            walletId: wallet.id,
            source: "REFUND",
            amount: refund - restored,
            now,
            note: "Reintegro por no-show",
          });
        }
        balanceAfter = await getAvailableCredits(tx, wallet.id, now);
        await tx.creditTransaction.create({
          data: {
            walletId: wallet.id,
            type: "REFUND",
            amount: refund,
            balanceAfter,
            bookingId: booking.id,
            note: `No-show: reembolso parcial (${100 - penaltyPct}%)`,
          },
        });
      }

      // Registra la parte penalizada (no altera balance: ya estaba descontada
      // al consumir los créditos en la reserva).
      await tx.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: "NO_SHOW_PENALTY",
          amount: -penalized,
          balanceAfter,
          bookingId: booking.id,
          note: `No-show: penalización ${penaltyPct}%`,
        },
      });
    });
    processed++;
  }
  return { job: "mark-no-shows", processed };
}

/**
 * Renovación de membresías: en MVP renueva el periodo y otorga créditos
 * con el proveedor MOCK. Con Stripe/MP reales, esto se dispara desde el
 * webhook de suscripción — documentado en README_DEPLOY_NETLIFY.md.
 */
export async function renewMemberships(): Promise<JobResult> {
  const now = new Date();
  const due = await db.practitionerMembership.findMany({
    where: { status: "ACTIVE", currentPeriodEnd: { lt: now }, cancelAtPeriodEnd: false },
    include: { plan: true, practitioner: { include: { wallet: true } } },
  });

  let processed = 0;
  for (const m of due) {
    const nextEnd = new Date(m.currentPeriodEnd);
    nextEnd.setMonth(nextEnd.getMonth() + 1);

    await db.$transaction(async (tx) => {
      await tx.practitionerMembership.update({
        where: { id: m.id },
        data: { currentPeriodStart: m.currentPeriodEnd, currentPeriodEnd: nextEnd },
      });

      const wallet = m.practitioner.wallet;
      if (wallet && (m.plan.includedCredits > 0 || m.plan.rolloverLimit > 0)) {
        // Rollover SOLO sobre lotes de esta membresía: los paquetes comprados
        // (dinero pagado, con su propia vigencia) quedan intactos. Los lotes
        // del periodo que termina se cierran; hasta rolloverLimit se arrastra
        // al nuevo lote y el excedente se expira.
        const oldLots = await tx.creditLot.findMany({
          where: {
            walletId: wallet.id,
            source: "MEMBERSHIP_GRANT",
            membershipId: m.id,
            remaining: { gt: 0 },
          },
        });
        const totalRemaining = oldLots.reduce((s, l) => s + l.remaining, 0);
        const carried = Math.min(totalRemaining, m.plan.rolloverLimit);
        const discarded = totalRemaining - carried;

        if (oldLots.length > 0) {
          await tx.creditLot.updateMany({
            where: { id: { in: oldLots.map((l) => l.id) } },
            data: { remaining: 0 },
          });
        }

        const grantAmount = m.plan.includedCredits + carried;
        const balanceAfter = await grantLot(tx, {
          walletId: wallet.id,
          source: "MEMBERSHIP_GRANT",
          amount: grantAmount,
          now,
          expiresAt: nextEnd,
          membershipId: m.id,
          note: `Renovación ${m.plan.name}${carried > 0 ? ` (incluye ${carried} de rollover)` : ""}`,
        });

        if (discarded > 1e-9) {
          await tx.creditTransaction.create({
            data: {
              walletId: wallet.id,
              type: "EXPIRATION",
              amount: -discarded,
              balanceAfter,
              note: "Créditos no usados fuera del límite de rollover",
            },
          });
        }
        await tx.creditTransaction.create({
          data: {
            walletId: wallet.id,
            type: "MEMBERSHIP_GRANT",
            amount: m.plan.includedCredits,
            balanceAfter,
            membershipId: m.id,
            note: `Renovación ${m.plan.name}`,
            expiresAt: nextEnd,
          },
        });
      }
    });
    processed++;
  }
  return { job: "renew-memberships", processed };
}

export async function runJob(name: JobName): Promise<JobResult> {
  switch (name) {
    case "release-unpaid-bookings":
      return releaseUnpaidBookings();
    case "expire-credits":
      return expireCredits();
    case "mark-no-shows":
      return markNoShows();
    case "renew-memberships":
      return renewMemberships();
  }
}

export const ALL_JOBS: JobName[] = [
  "release-unpaid-bookings",
  "expire-credits",
  "mark-no-shows",
  "renew-memberships",
];
