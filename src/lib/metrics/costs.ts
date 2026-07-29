import { db } from "@/lib/db";
import type { ExpenseCategory } from "@prisma/client";

/**
 * Costos, margen y punto de equilibrio.
 *
 * Los gastos recurrentes se prorratean al periodo consultado (un gasto anual
 * cuenta 1/12 al mes); los únicos entran solo si cayeron dentro del periodo.
 * La nómina se suma desde `Employee` cuando el sueldo está capturado, y NO se
 * duplica con gastos de categoría PAYROLL: si registras la nómina como gasto,
 * evita capturar también el sueldo en el empleado.
 */

export interface CostBreakdown {
  totalCents: number;
  porCategoria: Partial<Record<ExpenseCategory, number>>;
  nominaCents: number;
}

function monthsInPeriod(from: Date, to: Date): number {
  const dias = Math.max(1, (to.getTime() - from.getTime()) / 86_400_000);
  return dias / 30.44; // promedio de días por mes
}

/** Costos de una ubicación (o corporativos si locationId es null). */
export async function getCosts(
  from: Date,
  to: Date,
  locationId?: string | null
): Promise<CostBreakdown> {
  const meses = monthsInPeriod(from, to);

  const [expenses, employees] = await Promise.all([
    db.expense.findMany({
      where: {
        active: true,
        ...(locationId === undefined ? {} : { locationId }),
        OR: [
          // Recurrentes vigentes durante el periodo
          {
            recurrence: { in: ["MONTHLY", "YEARLY"] },
            effectiveFrom: { lt: to },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }],
          },
          // Únicos ocurridos dentro del periodo
          { recurrence: "ONE_TIME", incurredAt: { gte: from, lt: to } },
        ],
      },
      select: { category: true, amountCents: true, recurrence: true },
    }),
    db.employee.findMany({
      where: {
        status: "ACTIVE",
        monthlySalaryCents: { not: null },
        ...(locationId ? { locationId } : {}),
      },
      select: { monthlySalaryCents: true },
    }),
  ]);

  const porCategoria: Partial<Record<ExpenseCategory, number>> = {};
  let totalCents = 0;

  for (const e of expenses) {
    const cents =
      e.recurrence === "MONTHLY"
        ? Math.round(e.amountCents * meses)
        : e.recurrence === "YEARLY"
          ? Math.round((e.amountCents / 12) * meses)
          : e.amountCents;
    porCategoria[e.category] = (porCategoria[e.category] ?? 0) + cents;
    totalCents += cents;
  }

  const nominaCents = Math.round(
    employees.reduce((s, e) => s + (e.monthlySalaryCents ?? 0), 0) * meses
  );
  if (nominaCents > 0) {
    porCategoria.PAYROLL = (porCategoria.PAYROLL ?? 0) + nominaCents;
    totalCents += nominaCents;
  }

  return { totalCents, porCategoria, nominaCents };
}

export interface Margin {
  ingresoCents: number;
  costoCents: number;
  margenCents: number;
  margenPct: number;
  /** Horas-sala que hay que vender al precio promedio para cubrir los costos. */
  equilibrioHoras: number | null;
}

/** Margen a partir de ingreso y costo ya calculados. */
export function computeMargin(
  ingresoCents: number,
  costoCents: number,
  precioHoraPromedioCents?: number
): Margin {
  const margenCents = ingresoCents - costoCents;
  return {
    ingresoCents,
    costoCents,
    margenCents,
    margenPct: ingresoCents > 0 ? Math.round((margenCents / ingresoCents) * 100) : 0,
    equilibrioHoras:
      precioHoraPromedioCents && precioHoraPromedioCents > 0
        ? Math.ceil(costoCents / precioHoraPromedioCents)
        : null,
  };
}

export interface CreditLiability {
  creditosVigentes: number;
  creditosPorVencer30d: number;
  /** Valor en dinero de los créditos vigentes, al precio de sala estándar. */
  valorEstimadoCents: number;
}

/**
 * Pasivo por créditos: horas ya cobradas que los practitioners aún pueden
 * consumir. Es dinero comprometido, no ganado — conviene verlo explícito.
 */
export async function getCreditLiability(): Promise<CreditLiability> {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86_400_000);

  const lots = await db.creditLot.findMany({
    where: { remaining: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    select: { remaining: true, expiresAt: true },
  });

  const creditosVigentes = lots.reduce((s, l) => s + l.remaining, 0);
  const creditosPorVencer30d = lots
    .filter((l) => l.expiresAt != null && l.expiresAt <= in30)
    .reduce((s, l) => s + l.remaining, 0);

  // Valor de referencia: precio de sala más barato (1 crédito = 1 hora estándar).
  const cheapest = await db.roomType.findFirst({
    where: { active: true, creditsPerHour: 1 },
    orderBy: { baseHourlyPriceCents: "asc" },
    select: { baseHourlyPriceCents: true },
  });

  return {
    creditosVigentes: Math.round(creditosVigentes * 10) / 10,
    creditosPorVencer30d: Math.round(creditosPorVencer30d * 10) / 10,
    valorEstimadoCents: Math.round(creditosVigentes * (cheapest?.baseHourlyPriceCents ?? 0)),
  };
}
