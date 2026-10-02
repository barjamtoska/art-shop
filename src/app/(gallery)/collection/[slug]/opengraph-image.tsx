import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { renderShareImage, shareImageEyebrow, shareImageSize } from "@/lib/share-image";

export const size = shareImageSize;
export const contentType = "image/png";
export const alt = "A painting from the collection, framed and lit on the gallery wall";

/** The work framed on the wall, with its title, artist and price (or its private-collection note). */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const work = await db.artwork.findFirst({
    where: { slug, published: true },
    include: { artist: { select: { name: true } }, images: { where: { kind: "PRIMARY" }, take: 1 } },
  });
  const image = work?.images[0];
  return renderShareImage({
    eyebrow: shareImageEyebrow,
    title: work ? work.title : "The Collection",
    titleItalic: Boolean(work),
    lines: work
      ? [
          `${work.artist.name}, ${work.yearLabel}`,
          work.status === "SOLD" ? "In a private collection" : formatPrice(work.priceCents),
        ]
      : [],
    painting: image ? { image, width: image.width, height: image.height } : null,
  });
}
