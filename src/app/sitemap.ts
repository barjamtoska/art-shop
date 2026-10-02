import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/** Every public page on view, for search engines. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = (path: string) => new URL(path, env.SITE_URL).toString();
  const [works, exhibitions, artist] = await Promise.all([
    db.artwork.findMany({
      where: { published: true, images: { some: { kind: "PRIMARY" } } },
      select: { slug: true, updatedAt: true },
      orderBy: { position: "asc" },
    }),
    db.exhibition.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    db.artist.findFirst({ select: { updatedAt: true } }),
  ]);
  const latest = works.reduce((max, w) => (w.updatedAt > max ? w.updatedAt : max), new Date(0));

  return [
    { url: url("/"), lastModified: latest, priority: 1 },
    { url: url("/collection"), lastModified: latest, priority: 0.9 },
    ...works.map((w) => ({ url: url(`/collection/${w.slug}`), lastModified: w.updatedAt, priority: 0.8 })),
    { url: url("/exhibitions"), priority: 0.7 },
    ...exhibitions.map((e) => ({ url: url(`/exhibitions/${e.slug}`), lastModified: e.updatedAt, priority: 0.7 })),
    ...(artist ? [{ url: url("/artist"), lastModified: artist.updatedAt, priority: 0.7 }] : []),
    ...["/about", "/visit", "/shipping-and-returns", "/terms", "/privacy"].map((path) => ({
      url: url(path),
      priority: 0.3,
    })),
  ];
}
