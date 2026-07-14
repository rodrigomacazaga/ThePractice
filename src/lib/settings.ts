import { db } from "@/lib/db";

/**
 * Settings operativos configurables desde admin, con defaults seguros.
 * key global (locationId = null) o por ubicación.
 */

export const SETTING_DEFAULTS = {
  "booking.cancellation_window_hours": 24,
  "booking.late_cancel_penalty_pct": 100, // % de créditos que se pierden
  "booking.no_show_penalty_pct": 100,
  "booking.min_advance_minutes": 30,
  "booking.max_days_ahead": 30,
  "credits.package_validity_days": 90,
  // Depósito del programa Founder, en centavos MXN. 0 = aún no configurado
  // (se define desde el panel admin / base de datos; nunca se hardcodea).
  "founder.deposit_cents": 0,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function getSetting<K extends SettingKey>(
  key: K,
  locationId?: string
): Promise<number> {
  // Prioridad: setting por ubicación → global → default
  const rows = await db.setting.findMany({
    where: { key, OR: [{ locationId: locationId ?? null }, { locationId: null }] },
  });
  const local = rows.find((r) => r.locationId === locationId);
  const global = rows.find((r) => r.locationId === null);
  const value = (local ?? global)?.value;
  if (typeof value === "number") return value;
  return SETTING_DEFAULTS[key];
}

export async function setSetting(key: string, value: number, locationId?: string) {
  // No usamos upsert: el unique compuesto incluye locationId nullable y
  // en Postgres NULL != NULL, así que el where del upsert no lo cubre.
  const existing = await db.setting.findFirst({
    where: { key, locationId: locationId ?? null },
  });
  if (existing) {
    await db.setting.update({ where: { id: existing.id }, data: { value } });
  } else {
    await db.setting.create({ data: { key, locationId: locationId ?? null, value } });
  }
}
