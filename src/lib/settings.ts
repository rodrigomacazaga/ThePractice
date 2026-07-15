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
  // Minutos que una reserva PENDING_PAYMENT retiene el slot antes de liberarse.
  "booking.pending_payment_hold_minutes": 30,
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
  if (locationId) {
    await db.setting.upsert({
      where: { key_locationId: { key, locationId } },
      update: { value },
      create: { key, locationId, value },
    });
    return;
  }
  // Global: el @@unique compuesto no cubre locationId NULL (NULL != NULL en
  // Postgres), pero el índice parcial `setting_key_global` sí garantiza la
  // unicidad. Un insert en conflicto con ese índice se resuelve como update.
  const existing = await db.setting.findFirst({ where: { key, locationId: null } });
  if (existing) {
    await db.setting.update({ where: { id: existing.id }, data: { value } });
  } else {
    await db.setting.create({ data: { key, locationId: null, value } });
  }
}

/** Elimina el override de una ubicación para que herede el valor global. */
export async function clearSetting(key: string, locationId: string) {
  await db.setting.deleteMany({ where: { key, locationId } });
}

/** Devuelve el valor override de la ubicación (sin caer al global/default),
 *  o null si la ubicación no tiene override propio para esa key. */
export async function getLocationOverride<K extends SettingKey>(
  key: K,
  locationId: string
): Promise<number | null> {
  const row = await db.setting.findFirst({ where: { key, locationId } });
  return typeof row?.value === "number" ? row.value : null;
}
