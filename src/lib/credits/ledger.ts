import type { Prisma, CreditLotSource } from "@prisma/client";

/**
 * Ledger de créditos por lotes. Fuente de verdad = CreditLot; el saldo
 * (CreditWallet.balance) es un caché derivado = suma de `remaining` de lotes
 * NO vencidos, que estas funciones mantienen sincronizado en la misma
 * transacción que la mutación.
 *
 * Todas reciben un `tx` (cliente de transacción de Prisma) para que el efecto
 * sobre lotes, saldo e historial sea atómico.
 */

type Tx = Prisma.TransactionClient;

/** Atribución de un consumo a un lote concreto (se guarda en la txn). */
export interface LotAllocation {
  lotId: string;
  amount: number;
}

const EPS = 1e-9;

/** Créditos utilizables ahora: `remaining` de lotes sin vencer. */
export async function getAvailableCredits(tx: Tx, walletId: string, now: Date): Promise<number> {
  const lots = await tx.creditLot.findMany({
    where: {
      walletId,
      remaining: { gt: 0 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { remaining: true },
  });
  return lots.reduce((sum, l) => sum + l.remaining, 0);
}

/** Recalcula y persiste el saldo-caché = créditos utilizables. Devuelve el valor. */
export async function syncWalletBalance(tx: Tx, walletId: string, now: Date): Promise<number> {
  const balance = await getAvailableCredits(tx, walletId, now);
  await tx.creditWallet.update({ where: { id: walletId }, data: { balance } });
  return balance;
}

/** Crea un lote de abono y sincroniza el saldo. Devuelve el saldo nuevo. */
export async function grantLot(
  tx: Tx,
  params: {
    walletId: string;
    source: CreditLotSource;
    amount: number;
    now: Date;
    expiresAt?: Date | null;
    membershipId?: string;
    purchaseId?: string;
    note?: string;
  }
): Promise<number> {
  if (params.amount > EPS) {
    await tx.creditLot.create({
      data: {
        walletId: params.walletId,
        source: params.source,
        grantedAmount: params.amount,
        remaining: params.amount,
        expiresAt: params.expiresAt ?? null,
        membershipId: params.membershipId,
        purchaseId: params.purchaseId,
        note: params.note,
      },
    });
  }
  return syncWalletBalance(tx, params.walletId, params.now);
}

/**
 * Consume `amount` créditos FIFO: primero los lotes que expiran antes
 * (vencimiento asc, nulls al final; empates por antigüedad). Decrementa
 * `remaining`, sincroniza el saldo y devuelve la atribución por lote.
 * Lanza si no hay suficiente disponible.
 */
export async function consumeCredits(
  tx: Tx,
  walletId: string,
  amount: number,
  now: Date
): Promise<LotAllocation[]> {
  if (amount <= EPS) return [];
  const lots = await tx.creditLot.findMany({
    where: {
      walletId,
      remaining: { gt: 0 },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ expiresAt: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });

  const available = lots.reduce((sum, l) => sum + l.remaining, 0);
  if (available + EPS < amount) {
    throw new Error(`Créditos insuficientes: se requieren ${amount}, disponibles ${available}`);
  }

  const allocations: LotAllocation[] = [];
  let left = amount;
  for (const lot of lots) {
    if (left <= EPS) break;
    const take = Math.min(lot.remaining, left);
    await tx.creditLot.update({
      where: { id: lot.id },
      data: { remaining: { decrement: take } },
    });
    allocations.push({ lotId: lot.id, amount: take });
    left -= take;
  }
  await syncWalletBalance(tx, walletId, now);
  return allocations;
}

/**
 * Reintegra al lote de origen una fracción de lo consumido (1 = total,
 * 0.5 = 50%). Solo restituye a lotes que aún no vencieron (un lote vencido
 * ya no aporta saldo). Devuelve el total efectivamente reintegrado.
 */
export async function reintegrateToLots(
  tx: Tx,
  walletId: string,
  allocations: LotAllocation[],
  fraction: number,
  now: Date
): Promise<number> {
  let restored = 0;
  for (const alloc of allocations) {
    const back = alloc.amount * fraction;
    if (back <= EPS) continue;
    const lot = await tx.creditLot.findUnique({ where: { id: alloc.lotId } });
    if (!lot) continue;
    if (lot.expiresAt && lot.expiresAt <= now) continue; // vencido: no aporta
    await tx.creditLot.update({
      where: { id: lot.id },
      data: { remaining: { increment: back } },
    });
    restored += back;
  }
  if (restored > EPS) await syncWalletBalance(tx, walletId, now);
  return restored;
}

/** Lee la atribución de consumo guardada en la txn BOOKING_CONSUMPTION. */
export function parseAllocations(value: unknown): LotAllocation[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (v): v is LotAllocation =>
      typeof v === "object" &&
      v !== null &&
      typeof (v as LotAllocation).lotId === "string" &&
      typeof (v as LotAllocation).amount === "number"
  );
}
