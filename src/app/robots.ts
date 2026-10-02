import type { MetadataRoute } from "next";
import { env, isPreview } from "@/lib/env";

/** The gallery is public; the back office, checkout and certificates are not for search engines. */
export default function robots(): MetadataRoute.Robots {
  // A preview deployment is a copy of the site: none of it belongs in search results.
  if (isPreview) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/acquisition/", "/certificate/", "/lab"],
    },
    sitemap: new URL("/sitemap.xml", env.SITE_URL).toString(),
  };
}
