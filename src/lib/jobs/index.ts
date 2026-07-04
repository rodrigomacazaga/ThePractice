import { db } from "@/lib/db";

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

/** Reservas PENDING_PAYMENT con más de 30 min se liberan. */
export async function releaseUnpaidBookings(): Promise<JobResult> {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const result = await db.booking.updateMany({
    where: { status: "PENDING_PAYMENT", createdAt: { lt: cutoff } },
    data: { status: "CANCELLED", cancellationReason: "Pago no completado (auto)" },
  });
  return { job: "release-unpaid-bookings", processed: result.count };
}

/** Expira lotes de créditos vencidos y ajusta wallets. */
export async function expireCredits(): Promise<JobResult> {
  const now = new Date();
  const expirable = await db.creditTransaction.findMany({
    where: {
      expiresAt: { lt: now },
      amount: { gt: 0 },
      type: { in: ["PACKAGE_PURCHASE", "MEMBERSHIP_GRANT"] },
    },
    include: { wallet: true },
  });

  let processed = 0;
  for (const txn of expirable) {
    // ¿Ya se registró la expiración de este lote?
    const already = await db.creditTransaction.findFirst({
      where: { type: "EXPIRATION", note: `expira:${txn.id}` },
    });
    if (already) continue;

    // Expira como máximo lo que quede en el wallet (no dejar balance negativo)
    const toExpire = Math.min(txn.amount, Math.max(txn.wallet.balance, 0));
    if (toExpire <= 0) continue;

    await db.$transaction(async (tx) => {
      const wallet = await tx.creditWallet.update({
        where: { id: txn.walletId },
        data: { balance: { decrement: toExpire } },
      });
      await tx.creditTransaction.create({
        data: {
          walletId: txn.walletId,
          type: "EXPIRATION",
          amount: -toExpire,
          balanceAfter: wallet.balance,
          note: `expira:${txn.id}`,
        },
      });
    });
    processed++;
  }
  return { job: "expire-credits", processed };
}

/** Reservas CONFIRMED cuyo horario terminó sin check-in → NO_SHOW. */
export async function markNoShows(): Promise<JobResult> {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  const result = await db.booking.updateMany({
    where: {
      status: "CONFIRMED",
      kind: "ROOM_RENTAL",
      endsAt: { lt: cutoff },
      checkedInAt: null,
    },
    data: { status: "NO_SHOW" },
  });
  return { job: "mark-no-shows", processed: result.count };
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
      if (wallet && m.plan.includedCredits > 0) {
        // Rollover limitado: lo que exceda el límite se pierde
        const rolled = Math.min(wallet.balance, m.plan.rolloverLimit);
        const newBalance = rolled + m.plan.includedCredits;
        await tx.creditWallet.update({
          where: { id: wallet.id },
          data: { balance: newBalance },
        });
        if (wallet.balance > rolled) {
          await tx.creditTransaction.create({
            data: {
              walletId: wallet.id,
              type: "EXPIRATION",
              amount: -(wallet.balance - rolled),
              balanceAfter: rolled,
              note: "Créditos no usados fuera del límite de rollover",
            },
          });
        }
        await tx.creditTransaction.create({
          data: {
            walletId: wallet.id,
            type: "MEMBERSHIP_GRANT",
            amount: m.plan.includedCredits,
            balanceAfter: newBalance,
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
