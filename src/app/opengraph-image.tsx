import { site } from "@/config/site";
import { db } from "@/lib/db";
import { renderShareImage, shareImageSize } from "@/lib/share-image";

export const size = shareImageSize;
export const contentType = "image/png";
export const alt = `${site.name} — ${site.tagline}`;

/** The gallery's default preview: the work hanging in the Entrance, and the gallery's name. */
export default async function Image() {
  const work = await db.artwork.findFirst({
    where: { published: true, images: { some: { kind: "PRIMARY" } } },
    orderBy: [{ featured: "desc" }, { position: "asc" }],
    include: { images: { where: { kind: "PRIMARY" }, take: 1 } },
  });
  const image = work?.images[0];
  return renderShareImage({
    eyebrow: "A private gallery",
    title: site.name,
    lines: [site.tagline],
    painting: image ? { image, width: image.width, height: image.height } : null,
  });
}
