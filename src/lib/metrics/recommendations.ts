import { db } from "@/lib/db";
import type { RoomTypePerformance, HourHeatCell } from "./occupancy";
import type { PractitionerUsage } from "./practitioners";
import type { CreditLiability } from "./costs";

/**
 * Motor de recomendaciones por reglas.
 *
 * Todas las recomendaciones salen de datos reales y declaran el dato que las
 * dispara, para que se puedan discutir en vez de creer a ciegas. Nunca inventa
 * cifras ni proyecta ingresos: señala una situación y sugiere una acción.
 * Cuando no hay datos suficientes, no recomienda nada — el silencio es
 * preferible a una sugerencia inventada.
 */

export type RecommendationSeverity = "info" | "oportunidad" | "atencion";

export interface Recommendation {
  id: string;
  severity: RecommendationSeverity;
  title: string;
  /** El dato concreto que la dispara. */
  evidence: string;
  action: string;
  href?: string;
}

/** Umbrales explícitos y en un solo lugar, para poder calibrarlos. */
export const THRESHOLDS = {
  saturadaPct: 70,
  subutilizadaPct: 25,
  /** Mínimo de horas-sala disponibles para que una conclusión sea significativa. */
  horasMinimasParaConcluir: 100,
  franjaSaturadaHoras: 8,
  usoPlanBajoPct: 40,
  usoPlanExcedidoPct: 120,
} as const;

/**
 * Conversión de salas: un tipo saturado convive con otro subutilizado en la
 * misma sede. Es la señal para reacondicionar, no para construir.
 */
export function recommendRoomConversions(
  roomTypes: RoomTypePerformance[],
  locationShortName: string
): Recommendation[] {
  const significativos = roomTypes.filter(
    (rt) => rt.horasDisponibles >= THRESHOLDS.horasMinimasParaConcluir
  );
  if (significativos.length < 2) return [];

  const saturados = significativos.filter((rt) => rt.ocupacionPct >= THRESHOLDS.saturadaPct);
  const subutilizados = significativos.filter((rt) => rt.ocupacionPct <= THRESHOLDS.subutilizadaPct);
  if (saturados.length === 0 || subutilizados.length === 0) return [];

  const recs: Recommendation[] = [];
  for (const sat of saturados) {
    for (const sub of subutilizados) {
      if (sub.salas < 1) continue;
      recs.push({
        id: `convertir-${sub.code}-a-${sat.code}`,
        severity: "oportunidad",
        title: `Considerar convertir una sala ${sub.name} en ${sat.name}`,
        evidence: `En ${locationShortName}, ${sat.name} está al ${sat.ocupacionPct}% de ocupación mientras ${sub.name} está al ${sub.ocupacionPct}% (${sub.salas} sala${sub.salas === 1 ? "" : "s"}).`,
        action: "Revisar el costo de reacondicionamiento contra el ingreso por hora-sala del tipo saturado.",
      });
    }
  }
  return recs;
}

/** Franjas saturadas: candidatas a tarifa prime. */
export function recommendPeakPricing(
  heatmap: HourHeatCell[],
  locationShortName: string,
  yaTieneFranjas: boolean
): Recommendation[] {
  if (yaTieneFranjas || heatmap.length === 0) return [];
  const top = [...heatmap].sort((a, b) => b.horas - a.horas)[0];
  if (!top || top.horas < THRESHOLDS.franjaSaturadaHoras) return [];

  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  return [
    {
      id: "tarifa-prime",
      severity: "oportunidad",
      title: "Definir tarifa prime en la franja de mayor demanda",
      evidence: `La franja más ocupada en ${locationShortName} es ${dias[top.weekday]} a las ${top.hour}:00, con ${top.horas} horas-sala reservadas en el periodo.`,
      action: "Crear una franja de tarifa PRIME en planes y precios para esa ventana.",
      href: "/admin/pricing",
    },
  ];
}

/** Créditos por vencer: dinero cobrado que el cliente perdería. */
export function recommendCreditActions(liability: CreditLiability): Recommendation[] {
  if (liability.creditosPorVencer30d <= 0) return [];
  return [
    {
      id: "creditos-por-vencer",
      severity: "atencion",
      title: "Hay créditos por vencer en los próximos 30 días",
      evidence: `${liability.creditosPorVencer30d} créditos vigentes vencen en menos de 30 días.`,
      action: "Avisar a los practitioners afectados: un crédito vencido es una hora que ya pagaron y no usaron.",
    },
  ];
}

/** Membresías cuyo uso no corresponde al plan: riesgo de baja o de upgrade. */
export function recommendMembershipFit(usage: PractitionerUsage[]): Recommendation[] {
  const recs: Recommendation[] = [];

  const subutilizan = usage.filter(
    (u) => u.usoDelPlanPct != null && u.usoDelPlanPct < THRESHOLDS.usoPlanBajoPct
  );
  if (subutilizan.length > 0) {
    recs.push({
      id: "membresias-en-riesgo",
      severity: "atencion",
      title: `${subutilizan.length} membresía${subutilizan.length === 1 ? "" : "s"} con uso muy por debajo del plan`,
      evidence: `${subutilizan.map((u) => `${u.name} (${u.usoDelPlanPct}%)`).slice(0, 3).join(", ")}${subutilizan.length > 3 ? "…" : ""} usaron menos del ${THRESHOLDS.usoPlanBajoPct}% de sus créditos.`,
      action: "Contactarlos: quien no usa lo que paga suele cancelar. Puede convenirles un plan menor antes de perderlos.",
    });
  }

  const exceden = usage.filter(
    (u) => u.usoDelPlanPct != null && u.usoDelPlanPct > THRESHOLDS.usoPlanExcedidoPct
  );
  if (exceden.length > 0) {
    recs.push({
      id: "candidatos-upgrade",
      severity: "oportunidad",
      title: `${exceden.length} practitioner${exceden.length === 1 ? "" : "es"} por encima de su plan`,
      evidence: `${exceden.map((u) => `${u.name} (${u.usoDelPlanPct}%)`).slice(0, 3).join(", ")}${exceden.length > 3 ? "…" : ""} superaron los créditos incluidos.`,
      action: "Ofrecer el plan siguiente: ya están pagando horas extra.",
    });
  }

  return recs;
}

/**
 * Demanda insatisfecha registrada: la señal más directa de qué falta.
 * Solo se pronuncia si hay señales; sin registro, no concluye nada.
 */
export async function recommendFromDemand(locationId?: string): Promise<Recommendation[]> {
  const signals = await db.demandSignal.groupBy({
    by: ["reason", "roomTypeId"],
    where: {
      ...(locationId ? { locationId } : {}),
      createdAt: { gte: new Date(Date.now() - 90 * 86_400_000) },
    },
    _count: true,
    orderBy: { _count: { reason: "desc" } },
    take: 5,
  });
  if (signals.length === 0) return [];

  const roomTypeIds = signals.map((s) => s.roomTypeId).filter((id): id is string => id != null);
  const roomTypes = roomTypeIds.length
    ? await db.roomType.findMany({ where: { id: { in: roomTypeIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(roomTypes.map((rt) => [rt.id, rt.name]));

  const REASON_LABEL: Record<string, string> = {
    NO_AVAILABILITY: "no había disponibilidad",
    NO_ROOM_TYPE: "no existe ese tipo de sala",
    OUTSIDE_HOURS: "el horario pedido está fuera de operación",
    PRICE: "desistieron por precio",
  };

  return signals.map((s) => {
    const tipo = s.roomTypeId ? (nameById.get(s.roomTypeId) ?? "un tipo de sala") : "sin tipo definido";
    return {
      id: `demanda-${s.reason}-${s.roomTypeId ?? "na"}`,
      severity: "oportunidad" as const,
      title: `Demanda no atendida: ${REASON_LABEL[s.reason] ?? s.reason}`,
      evidence: `${s._count} solicitudes en los últimos 90 días para ${tipo}.`,
      action:
        s.reason === "NO_AVAILABILITY"
          ? "Evaluar sumar salas de ese tipo o mover reservas a franjas valle."
          : s.reason === "NO_ROOM_TYPE"
            ? "Evaluar acondicionar una sala de ese tipo en la sede."
            : s.reason === "OUTSIDE_HOURS"
              ? "Evaluar ampliar el horario de operación."
              : "Revisar la tarifa de esa franja o tipo de sala.",
    };
  });
}

/** Ordena las recomendaciones por urgencia para presentarlas. */
export function sortRecommendations(recs: Recommendation[]): Recommendation[] {
  const order: Record<RecommendationSeverity, number> = { atencion: 0, oportunidad: 1, info: 2 };
  return [...recs].sort((a, b) => order[a.severity] - order[b.severity]);
}
