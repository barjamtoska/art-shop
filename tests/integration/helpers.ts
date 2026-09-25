import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

/** A throwaway artwork, by the gallery's one artist, for one test. */
export async function makeArtwork(overrides: Record<string, unknown> = {}, options: { image?: boolean } = {}) {
  const tag = randomUUID().slice(0, 8);
  const medium = await db.medium.findFirstOrThrow({ where: { slug: "oil" } });
  const artist = await db.artist.findFirstOrThrow();
  return db.artwork.create({
    data: {
      slug: `test-work-${tag}`,
      title: `Test Work ${tag}`,
      artistId: artist.id,
      mediumId: medium.id,
      mediumDescription: "Oil on canvas",
      yearLabel: "2026",
      heightMm: 500,
      widthMm: 400,
      priceCents: 1_000_000,
      published: true,
      position: 100_000,
      ...(options.image !== false && {
        images: {
          create: {
            storage: "LOCAL",
            key: "/seed/maine-coast.jpg",
            width: 1000,
            height: 1250,
            alt: "A test painting used only by the integration tests.",
          },
        },
      }),
      ...overrides,
    },
    include: { artist: true },
  });
}

export function makeOrder(artworkId: string, overrides: Record<string, unknown> = {}) {
  return db.order.create({
    data: {
      artworkId,
      amountCents: 1_000_000,
      reservationExpiresAt: new Date(Date.now() + 35 * 60_000),
      certificateToken: randomUUID(),
      ...overrides,
    },
  });
}

/** Removes everything the helpers created, so other test files see only the seed collection. */
export async function cleanupTestRecords() {
  const works = { slug: { startsWith: "test-work-" } };
  await db.order.deleteMany({ where: { artwork: works } });
  await db.exhibition.deleteMany({ where: { slug: { startsWith: "test-" } } });
  await db.artwork.deleteMany({ where: works });
}
