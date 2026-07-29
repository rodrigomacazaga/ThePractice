import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { site, PUBLIC_LOCATION_STATUSES } from "@/config/site";

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
    priority: path === "/the-practice" ? 1 : 0.7,
  }));

  const [locations, practitioners, landings] = await Promise.all([
    safeQuery(
      () =>
        db.location.findMany({
          where: { status: { in: [...PUBLIC_LOCATION_STATUSES] } },
          select: { slug: true },
        }),
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
    // Landings comerciales publicadas: una por sede, contenido en base.
    safeQuery(
      () =>
        db.locationLanding.findMany({
          where: { published: true },
          select: { updatedAt: true, location: { select: { slug: true } } },
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
    ...landings.map((l) => ({
      url: `${site.url}/l/${l.location.slug}`,
      lastModified: l.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...practitioners.map((p) => ({
      url: `${site.url}/p/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
