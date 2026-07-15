import type { CreditTxnType } from "@prisma/client";

/**
 * Reconstrucción FIFO de lotes de crédito a partir del historial de
 * transacciones. Mitigación previa al ledger CreditLot: permite saber cuánto
 * queda realmente de cada abono (paquete o membresía) sin tabla nueva.
 *
 * Reglas de simulación, en orden cronológico de transacción:
 * - Abono (amount > 0) crea un lote con su vencimiento.
 * - Cargo (amount < 0) consume lotes FIFO: primero el que expira antes
 *   (sin vencimiento al final), empates por antigüedad.
 * - EXPIRATION con nota "expira:<txnId>" vacía ese lote específico.
 * - EXPIRATION sin nota de lote (recorte de rollover) consume solo lotes
 *   MEMBERSHIP_GRANT, FIFO.
 */
export interface LedgerTxn {
  id: string;
  type: CreditTxnType;
  amount: number;
  createdAt: Date;
  expiresAt: Date | null;
  note: string | null;
}

interface Lot {
  txnId: string;
  type: CreditTxnType;
  remaining: number;
  expiresAt: Date | null;
  createdAt: Date;
}

const EXPIRA_RE = /^expira:(.+)$/;

function fifoOrder(a: Lot, b: Lot) {
  if (a.expiresAt && b.expiresAt) return a.expiresAt.getTime() - b.expiresAt.getTime();
  if (a.expiresAt) return -1;
  if (b.expiresAt) return 1;
  return a.createdAt.getTime() - b.createdAt.getTime();
}

function consumeFifo(lots: Lot[], amount: number, filter?: (l: Lot) => boolean) {
  let left = amount;
  for (const lot of [...lots].sort(fifoOrder)) {
    if (left <= 0) break;
    if (lot.remaining <= 0) continue;
    if (filter && !filter(lot)) continue;
    const take = Math.min(lot.remaining, left);
    lot.remaining -= take;
    left -= take;
  }
  return left; // lo que no alcanzó a cubrirse con lotes
}

/** Remanente real por lote (txnId de abono → créditos que quedan de él). */
export function computeLotRemainders(txns: LedgerTxn[]): Map<string, number> {
  const lots: Lot[] = [];
  const ordered = [...txns].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  for (const t of ordered) {
    const expiraDe = t.note?.match(EXPIRA_RE)?.[1];
    if (t.type === "EXPIRATION" && expiraDe) {
      const lot = lots.find((l) => l.txnId === expiraDe);
      if (lot) lot.remaining = 0;
      continue;
    }
    if (t.type === "EXPIRATION" && t.amount < 0) {
      // Recorte de rollover: solo toca créditos de membresía.
      consumeFifo(lots, -t.amount, (l) => l.type === "MEMBERSHIP_GRANT");
      continue;
    }
    if (t.amount > 0) {
      lots.push({
        txnId: t.id,
        type: t.type,
        remaining: t.amount,
        expiresAt: t.expiresAt,
        createdAt: t.createdAt,
      });
      continue;
    }
    if (t.amount < 0) consumeFifo(lots, -t.amount);
  }

  return new Map(lots.map((l) => [l.txnId, l.remaining]));
}

/** Suma de remanentes de lotes PACKAGE_PURCHASE aún no vencidos: dinero
 *  pagado que el rollover de membresía NUNCA debe recortar. */
export function protectedPackageCredits(txns: LedgerTxn[], now: Date): number {
  const remainders = computeLotRemainders(txns);
  return txns
    .filter(
      (t) =>
        t.type === "PACKAGE_PURCHASE" &&
        t.amount > 0 &&
        (t.expiresAt == null || t.expiresAt > now)
    )
    .reduce((sum, t) => sum + (remainders.get(t.id) ?? 0), 0);
}
