import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * "/" redirige temporalmente a la landing comercial de La Ceiba.
 * La redirección primaria (307) vive en el middleware; esta página es el
 * respaldo por si el middleware no corre (p. ej. cambios en su matcher).
 * redirect() en un Server Component también responde 307 y aquí se
 * reconstruye el query string para no perder utm_*, fbclid ni gclid.
 * La página institucional vive ahora en /the-practice.
 */
export default async function RootRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((v) => query.append(key, v));
    else if (value != null) query.append(key, value);
  }
  const qs = query.toString();
  redirect(qs ? `/la-ceiba?${qs}` : "/la-ceiba");
}
