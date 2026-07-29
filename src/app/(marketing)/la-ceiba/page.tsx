import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";

export const dynamic = "force-dynamic";

/**
 * Ruta heredada de cuando una sede vivía hardcodeada en el código. Ahora las
 * landings son por ubicación (/l/[slug]); esto solo evita romper ligas viejas
 * mandando a la sede con ese slug si aún existe.
 */
export default async function LegacyLandingRedirect() {
  const location = await safeQuery(
    () => db.location.findUnique({ where: { slug: "la-ceiba" }, select: { slug: true } }),
    null
  );
  if (!location) notFound();
  redirect(`/l/${location.slug}`);
}
