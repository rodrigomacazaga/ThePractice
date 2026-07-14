/**
 * Capa de eventos de conversión, agnóstica del proveedor.
 * Los scripts (Meta Pixel, GA4, Google Ads) se cargan en
 * components/analytics/analytics-scripts.tsx SOLO si su ID existe en las
 * variables de entorno — aquí nunca se inventan identificadores. Si un
 * proveedor no está cargado, track() simplemente no le envía nada.
 *
 * IDs esperados (configurar en el entorno, no en código):
 *   NEXT_PUBLIC_META_PIXEL_ID      → Meta Pixel
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID  → Google Analytics 4 (G-XXXX)
 *   NEXT_PUBLIC_GOOGLE_ADS_ID      → Google Ads (AW-XXXX)
 *   NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL → label de conversión de Ads para form_submit
 */

export type ConversionEvent =
  | "page_view"
  | "cta_click"
  | "form_start"
  | "form_submit"
  | "whatsapp_click"
  | "view_memberships"
  | "founder_reserve_click";

type EventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

/** Eventos estándar de Meta equivalentes a nuestros eventos internos.
 *  El resto (cta_click, form_start, whatsapp_click…) se envía como trackCustom. */
const META_STANDARD: Partial<Record<ConversionEvent, string>> = {
  form_submit: "Lead",
  view_memberships: "ViewContent",
};

export function track(event: ConversionEvent, params: EventParams = {}): void {
  if (typeof window === "undefined") return;

  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) if (v !== undefined) clean[k] = v;

  // GA4 (y Google Ads vía gtag, si está configurado)
  if (typeof window.gtag === "function") {
    window.gtag("event", event, clean);

    // Conversión de Google Ads para el envío del formulario, solo si hay
    // ID + label configurados en el entorno.
    if (event === "form_submit") {
      const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
      const adsLabel = process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL;
      if (adsId && adsLabel) {
        window.gtag("event", "conversion", { send_to: `${adsId}/${adsLabel}` });
      }
    }
  }

  // Meta Pixel
  if (typeof window.fbq === "function") {
    const standard = META_STANDARD[event];
    if (standard) window.fbq("track", standard, clean);
    else window.fbq("trackCustom", event, clean);
  }
}
