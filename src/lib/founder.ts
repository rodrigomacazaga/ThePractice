import { getSetting } from "@/lib/settings";

/**
 * Programa Founder — The Practice La Ceiba.
 *
 * Arquitectura de la futura liga de pago (NO implementada en esta fase;
 * no se realizan cobros reales todavía):
 *
 *   1. Admin califica el lead (LeadStatus.QUALIFIED) tras validar por
 *      WhatsApp: especialidad compatible, comprensión del modelo,
 *      disponibilidad de horarios, plan y horas estimadas.
 *   2. Admin genera una liga de pago con el proveedor configurado
 *      (PAYMENT_PROVIDER: stripe | mercado_pago | payment link manual) por
 *      el importe de getFounderDepositCents(), con concepto
 *      FOUNDER_RESERVATION_CONCEPT y Payment.kind = DEPOSIT.
 *   3. La liga se envía manualmente por WhatsApp → lead pasa a
 *      PAYMENT_LINK_SENT.
 *   4. El webhook del proveedor confirma el pago → DEPOSIT_PAID → admin
 *      confirma el lugar → FOUNDER_RESERVED. El depósito se acredita al
 *      100% contra futuras reservas o membresías.
 */

export const FOUNDER_RESERVATION_CONCEPT =
  "Reservación de Membresía Founder — The Practice La Ceiba";

/**
 * Importe del depósito Founder en centavos, configurable desde el panel
 * admin (Setting "founder.deposit_cents", global o por ubicación).
 * Devuelve null mientras no esté configurado — nunca hay un monto
 * hardcodeado como fallback.
 */
export async function getFounderDepositCents(locationId?: string): Promise<number | null> {
  const cents = await getSetting("founder.deposit_cents", locationId);
  return cents > 0 ? cents : null;
}
