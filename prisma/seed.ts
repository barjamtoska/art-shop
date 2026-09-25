/**
 * Loads the demonstration collection (src/data/seed-collection.ts) into the
 * database: `npm run db:seed`.
 *
 * Safe to run again: records that already exist are left as they are, so
 * edits made in the admin, and any sale, are never overwritten.
 *
 * Images: with Cloudinary keys set, the seed paintings are uploaded there
 * (once — an existing upload is reused); without them, they are served from
 * /public/seed.
 *
 * The gallery has one artist. The demonstration works are by one painter
 * (Winslow Homer); if the owner's own profile already exists, the demo is
 * skipped rather than showing another painter's works under their name.
 *
 * Two demo works are created as already sold, standing for works that sold
 * before the site existed. That is the only place a work is created SOLD;
 * in the running application, only a verified Stripe webhook marks a sale.
 */
import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { v2 as cloudinary } from "cloudinary";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  featuredArtworkSlug,
  seedArtist,
  seedArtworks,
  seedExhibitions,
  seedMediums,
} from "../src/data/seed-collection";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

if (process.env.NODE_ENV === "production" && process.env.SEED_DEMO !== "1") {
  console.error("Refusing to load demonstration works in production. Set SEED_DEMO=1 to do it anyway.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const paragraphs = (lines: string[]) => lines.join("\n\n");
const toMm = (cm: number) => Math.round(cm * 10);

const useCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET,
);
if (useCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}
const folder = process.env.CLOUDINARY_FOLDER || "maison";

async function storeImage(slug: string, localSrc: string) {
  if (!useCloudinary) return { storage: "LOCAL" as const, key: localSrc };
  const result = await cloudinary.uploader.upload(`public${localSrc}`, {
    public_id: `${folder}/seed/${slug}`,
    overwrite: false,
    resource_type: "image",
  });
  return { storage: "CLOUDINARY" as const, key: result.public_id };
}

async function main() {
  for (const medium of Object.values(seedMediums)) {
    await db.medium.upsert({ where: { slug: medium.slug }, update: {}, create: medium });
  }

  const existing = await db.artist.findFirst({ select: { id: true, slug: true, name: true } });
  if (existing && existing.slug !== seedArtist.slug) {
    console.log(`The gallery already has its artist (${existing.name}); demonstration works were not added.`);
    return;
  }
  const artist =
    existing ??
    (await db.artist.create({
      data: {
        ...seedArtist,
        biography: paragraphs(seedArtist.biography),
        statement: paragraphs(seedArtist.statement),
      },
    }));

  const anyFeatured = await db.artwork.count({ where: { featured: true } });
  let created = 0;

  for (const [index, work] of seedArtworks.entries()) {
    const existing = await db.artwork.findUnique({ where: { slug: work.slug }, select: { id: true } });
    if (existing) continue;

    const sold = work.status === "SOLD";
    const image = await storeImage(work.slug, work.image.src);
    await db.artwork.create({
      data: {
        slug: work.slug,
        title: work.title,
        yearLabel: work.yearLabel,
        artist: { connect: { id: artist.id } },
        medium: { connect: { slug: work.medium.slug } },
        mediumDescription: work.mediumDescription,
        heightMm: toMm(work.heightCm),
        widthMm: toMm(work.widthCm),
        depthMm: work.depthCm ? toMm(work.depthCm) : null,
        priceCents: work.priceCents,
        status: sold ? "SOLD" : "AVAILABLE",
        soldAt: sold ? new Date("2026-01-01T00:00:00Z") : null,
        frameStyle: work.frameStyle,
        description: paragraphs(work.description),
        published: true,
        featured: !anyFeatured && work.slug === featuredArtworkSlug,
        position: (index + 1) * 10,
        isDemo: true,
        images: {
          create: {
            kind: "PRIMARY",
            ...image,
            width: work.image.width,
            height: work.image.height,
            blurDataUrl: work.image.blurDataURL,
            alt: work.image.alt,
            credit: work.image.credit,
          },
        },
      },
    });
    created++;
  }

  for (const [index, exhibition] of seedExhibitions.entries()) {
    const { workSlugs, statement, opensOn, closesOn, ...fields } = exhibition;
    const record = await db.exhibition.upsert({
      where: { slug: exhibition.slug },
      update: {},
      create: {
        ...fields,
        statement: paragraphs(statement),
        opensOn: opensOn ? new Date(opensOn) : null,
        closesOn: closesOn ? new Date(closesOn) : null,
        position: (index + 1) * 10,
      },
    });
    const artworks = await db.artwork.findMany({
      where: { slug: { in: workSlugs } },
      select: { id: true, slug: true },
    });
    await db.exhibitionWork.createMany({
      data: workSlugs.map((slug, position) => ({
        exhibitionId: record.id,
        artworkId: artworks.find((a) => a.slug === slug)!.id,
        position: (position + 1) * 10,
      })),
      skipDuplicates: true,
    });
  }

  console.log(
    `Seeded: ${created} new works (${seedArtworks.length - created} already present), ` +
      `images ${useCloudinary ? "on Cloudinary" : "served locally"}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
