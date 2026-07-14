/**
 * Captura y persistencia (sessionStorage) de parámetros de campaña.
 * Solo para uso en cliente: en servidor todas las funciones regresan vacío.
 *
 * La redirección de "/" y los links de campaña llegan con los parámetros en
 * la URL; se guardan en sessionStorage para que sobrevivan la navegación
 * interna y lleguen al formulario aunque el usuario ya no tenga la query.
 */

export interface CampaignParams {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  fbclid?: string;
  gclid?: string;
}

const PARAM_MAP: Record<string, keyof CampaignParams> = {
  utm_source: "utmSource",
  utm_medium: "utmMedium",
  utm_campaign: "utmCampaign",
  utm_content: "utmContent",
  utm_term: "utmTerm",
  fbclid: "fbclid",
  gclid: "gclid",
};

const STORAGE_KEY = "tp_campaign_params";

function fromSearch(search: string): CampaignParams {
  const params = new URLSearchParams(search);
  const out: CampaignParams = {};
  for (const [param, key] of Object.entries(PARAM_MAP)) {
    const value = params.get(param);
    if (value) out[key] = value.slice(0, 255);
  }
  return out;
}

function fromStorage(): CampaignParams {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CampaignParams) : {};
  } catch {
    return {};
  }
}

/** Guarda los parámetros de la URL actual (si los hay) sobre los ya guardados. */
export function captureCampaignParams(): void {
  if (typeof window === "undefined") return;
  const current = fromSearch(window.location.search);
  if (Object.keys(current).length === 0) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...fromStorage(), ...current }));
  } catch {
    // sessionStorage no disponible (modo privado estricto) — se pierde la persistencia.
  }
}

/** Parámetros de campaña vigentes: URL actual primero, luego lo persistido. */
export function getCampaignParams(): CampaignParams {
  if (typeof window === "undefined") return {};
  return { ...fromStorage(), ...fromSearch(window.location.search) };
}
