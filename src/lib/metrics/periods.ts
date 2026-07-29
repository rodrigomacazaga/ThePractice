/** Periodos de análisis. Un solo lugar para que todos los dashboards midan igual. */

export interface Period {
  from: Date;
  to: Date;
  label: string;
}

/** Del día 1 del mes en curso hasta ahora. */
export function monthToDate(now: Date = new Date()): Period {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from, to: now, label: "Mes en curso" };
}

/** Mes calendario completo anterior. */
export function previousMonth(now: Date = new Date()): Period {
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from, to, label: "Mes anterior" };
}

/** Últimos N días. */
export function lastDays(days: number, now: Date = new Date()): Period {
  return { from: new Date(now.getTime() - days * 86_400_000), to: now, label: `Últimos ${days} días` };
}
