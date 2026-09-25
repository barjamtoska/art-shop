import "server-only";
import { db } from "@/lib/db";

/** Every work, labelled for the exhibition editor. */
export async function exhibitionWorkChoices() {
  const works = await db.artwork.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, title: true, published: true, artist: { select: { name: true } } },
  });
  return works.map((work) => ({
    id: work.id,
    label: `${work.title} — ${work.artist.name}${work.published ? "" : " (draft)"}`,
  }));
}
