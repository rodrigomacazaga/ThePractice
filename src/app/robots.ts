import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Paneles y APIs fuera del índice
        disallow: ["/admin", "/practitioner", "/client", "/api/", "/post-login"],
      },
    ],
    sitemap: `${site.url}/sitemap.xml`,
  };
}
