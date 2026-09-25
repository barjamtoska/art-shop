import "server-only";
import { db } from "@/lib/db";

/** Choices for the artwork form: mediums and exhibitions. */
export async function artworkFormOptions() {
  const [mediums, exhibitions] = await Promise.all([
    db.medium.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.exhibition.findMany({ orderBy: { position: "asc" }, select: { id: true, title: true, published: true } }),
  ]);
  return {
    mediums: mediums.map((m) => ({ value: m.id, label: m.name })),
    exhibitions: exhibitions.map((e) => ({ value: e.id, label: e.published ? e.title : `${e.title} (hidden)` })),
  };
}
