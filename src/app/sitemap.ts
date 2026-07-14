import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { site } from "@/config/site";

export const dynamic = "force-dynamic";

/**
 * Sitemap dinámico: páginas de marketing + ubicaciones abiertas +
 * micrositios publicados. Los micrositios son la superficie SEO que
 * crece con cada practitioner.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    "/the-practice",
    "/for-practitioners",
    "/for-clients",
    "/how-it-works",
    "/memberships",
    "/rooms",
    "/locations",
    "/directory",
    "/la-ceiba",
    "/apply",
    "/about",
    "/faq",
    "/contact",
    "/legal/terms",
    "/legal/privacy",
    "/legal/cancellation",
  ].map((path) => ({
    url: `${site.url}${path}`,
    changeFrequency: "weekly" as const,
    // "/" redirige (307) a /la-ceiba, así que la landing es la página principal.
    priority: path === "/la-ceiba" ? 1 : path === "/the-practice" ? 0.9 : 0.7,
  }));

  const [locations, practitioners] = await Promise.all([
    safeQuery(
      () => db.location.findMany({ where: { status: "OPEN" }, select: { slug: true } }),
      []
    ),
    safeQuery(
      () =>
        db.practitionerProfile.findMany({
          where: { verificationStatus: "APPROVED", microsite: { published: true } },
          select: { slug: true, updatedAt: true },
        }),
      []
    ),
  ]);

  return [
    ...staticPages,
    ...locations.map((l) => ({
      url: `${site.url}/locations/${l.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...practitioners.map((p) => ({
      url: `${site.url}/p/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
