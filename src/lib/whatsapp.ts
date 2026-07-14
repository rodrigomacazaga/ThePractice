import { site } from "@/config/site";
import type { CampaignParams } from "@/lib/utm";

/**
 * Links de WhatsApp con mensaje prellenado. WhatsApp es canal de seguimiento
 * y cierre — nunca sustituye al formulario de aplicación.
 */

export const WHATSAPP_APPLIED_MESSAGE =
  "Hola, acabo de enviar mi aplicación para The Practice La Ceiba. " +
  "Me interesa revisar la membresía Founder y la disponibilidad de horarios.";

export const WHATSAPP_QUESTIONS_MESSAGE =
  "Hola, estoy viendo la página de The Practice La Ceiba y me gustaría resolver " +
  "algunas dudas sobre las membresías Founder.";

export function whatsappUrl(message: string, campaign?: CampaignParams): string {
  const phone = site.phone.replace(/\D/g, "");
  const ref = [campaign?.utmSource, campaign?.utmCampaign].filter(Boolean).join(" / ");
  const text = ref ? `${message}\n\n[Ref: ${ref}]` : message;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
