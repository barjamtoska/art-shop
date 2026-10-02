import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/** The gallery is public; the back office, checkout and certificates are not for search engines. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/acquisition/", "/certificate/", "/lab"],
    },
    sitemap: new URL("/sitemap.xml", env.SITE_URL).toString(),
  };
}
