import "server-only";
import { db } from "@/lib/db";

/** Choices for the artwork form: artists, mediums, exhibitions. */
export async function artworkFormOptions() {
  const [artists, mediums, exhibitions] = await Promise.all([
    db.artist.findMany({ orderBy: { sortName: "asc" }, select: { id: true, name: true, published: true } }),
    db.medium.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.exhibition.findMany({ orderBy: { position: "asc" }, select: { id: true, title: true, published: true } }),
  ]);
  return {
    artists: artists.map((a) => ({ value: a.id, label: a.published ? a.name : `${a.name} (hidden)` })),
    mediums: mediums.map((m) => ({ value: m.id, label: m.name })),
    exhibitions: exhibitions.map((e) => ({ value: e.id, label: e.published ? e.title : `${e.title} (hidden)` })),
  };
}
