import { db } from "@/lib/db";

/** Quién usa cada sede y cómo: base para curaduría y para detectar riesgo. */

const OCCUPYING = ["CONFIRMED", "CHECKED_IN", "COMPLETED"] as const;

export interface PractitionerUsage {
  practitionerId: string;
  name: string;
  slug: string;
  especialidades: string[];
  planName: string | null;
  isFounder: boolean;
  horas: number;
  reservas: number;
  creditosIncluidos: number | null;
  /** Uso frente a lo que su plan incluye. null si no tiene membresía. */
  usoDelPlanPct: number | null;
}

export async function getPractitionerUsage(
  locationId: string,
  from: Date,
  to: Date
): Promise<PractitionerUsage[]> {
  const bookings = await db.booking.findMany({
    where: {
      locationId,
      status: { in: [...OCCUPYING] },
      startsAt: { gte: from, lt: to },
      practitionerId: { not: null },
    },
    select: {
      practitionerId: true,
      startsAt: true,
      endsAt: true,
      practitioner: {
        select: {
          id: true,
          slug: true,
          specialties: true,
          user: { select: { name: true } },
          membership: {
            select: {
              isFounder: true,
              status: true,
              plan: { select: { name: true, includedCredits: true } },
            },
          },
        },
      },
    },
  });

  const byPractitioner = new Map<string, PractitionerUsage>();
  for (const b of bookings) {
    const p = b.practitioner;
    if (!p) continue;
    const horas = Math.max(0, (b.endsAt.getTime() - b.startsAt.getTime()) / 3_600_000);
    const existing = byPractitioner.get(p.id);
    if (existing) {
      existing.horas += horas;
      existing.reservas += 1;
      continue;
    }
    const activeMembership = p.membership?.status === "ACTIVE" ? p.membership : null;
    byPractitioner.set(p.id, {
      practitionerId: p.id,
      name: p.user.name,
      slug: p.slug,
      especialidades: p.specialties,
      planName: activeMembership?.plan.name ?? null,
      isFounder: activeMembership?.isFounder ?? false,
      horas,
      reservas: 1,
      creditosIncluidos: activeMembership?.plan.includedCredits ?? null,
      usoDelPlanPct: null,
    });
  }

  const list = [...byPractitioner.values()].map((p) => ({
    ...p,
    horas: Math.round(p.horas * 10) / 10,
    usoDelPlanPct:
      p.creditosIncluidos && p.creditosIncluidos > 0
        ? Math.round((p.horas / p.creditosIncluidos) * 100)
        : null,
  }));

  return list.sort((a, b) => b.horas - a.horas);
}

/** Mix de especialidades de quienes usan la sede, por horas ocupadas. */
export function getSpecialtyMix(usage: PractitionerUsage[]): { especialidad: string; horas: number }[] {
  const mix = new Map<string, number>();
  for (const u of usage) {
    // Una hora se reparte entre las especialidades declaradas para no inflar.
    const peso = u.especialidades.length > 0 ? u.horas / u.especialidades.length : 0;
    for (const e of u.especialidades) mix.set(e, (mix.get(e) ?? 0) + peso);
  }
  return [...mix.entries()]
    .map(([especialidad, horas]) => ({ especialidad, horas: Math.round(horas * 10) / 10 }))
    .sort((a, b) => b.horas - a.horas);
}
