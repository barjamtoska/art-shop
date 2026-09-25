/**
 * Downloads public-domain (CC0) paintings from The Met Open Access API,
 * resizes them for the repo, and writes `public/seed/images.json` with
 * dimensions, a tiny blur placeholder, and the credit line for each work.
 *
 *   node scripts/fetch-seed-images.mts           # fetch missing images
 *   node scripts/fetch-seed-images.mts --force   # re-fetch everything
 */
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import sharp, { type Sharp } from "sharp";

type Source = {
  slug: string;
  met: number;
  /** Very dark paintings (e.g. Rembrandt): skip black-edge trimming, which would eat into the paint. */
  darkEdges?: boolean;
};

// Keep in sync with the seed collection. Every object must be flagged
// isPublicDomain by The Met; the script refuses anything that is not.
const SOURCES: Source[] = [
  { slug: "young-woman-with-a-water-pitcher", met: 437881 },
  { slug: "two-men-contemplating-the-moon", met: 438417 },
  { slug: "madame-x", met: 12127 },
  { slug: "heart-of-the-andes", met: 10481 },
  { slug: "aristotle-with-a-bust-of-homer", met: 437394, darkEdges: true },
  { slug: "the-musicians", met: 435844 },
  { slug: "wheat-field-with-cypresses", met: 436535 },
  { slug: "dancer-with-a-fan", met: 436135 },
  { slug: "sloop-nassau", met: 11139 },
  { slug: "moonlight-marine", met: 11979 },
  { slug: "moonlight-strandgade-30", met: 441933 },
  { slug: "soap-bubbles", met: 435888 },
  { slug: "whalers", met: 437854 },
  { slug: "circus-sideshow", met: 437654 },
];

const OUT_DIR = path.join(process.cwd(), "public", "seed");
const MANIFEST = path.join(OUT_DIR, "images.json");
const MAX_EDGE = 2400;

type Entry = {
  src: string;
  width: number;
  height: number;
  blurDataURL: string;
  credit: string;
  sourceUrl: string;
};

async function exists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/** Intermediate steps stay lossless; the artwork is JPEG-encoded exactly once. */
const lossless = (pipeline: Sharp) => pipeline.png({ compressionLevel: 1 }).toBuffer();

/** The Met's API sits behind a bot filter that occasionally answers with an HTML challenge; back off and retry. */
async function fetchWithRetry(url: string, attempts = 5): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url);
    const type = res.headers.get("content-type") ?? "";
    if (res.ok && !type.includes("text/html")) return res;
    if (attempt >= attempts) throw new Error(`${url}: HTTP ${res.status} (${type})`);
    await new Promise((r) => setTimeout(r, 4000 * attempt));
  }
}

/**
 * Paintings are rarely photographed perfectly square to the camera, so after
 * trimming, a thin wedge of black backdrop can remain along an edge. Scan
 * inward from each side and crop past any line that still contains
 * backdrop-black pixels (capped, so a dark painting is never eaten into).
 */
async function backdropWedgeCrop(image: Buffer) {
  const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const isBackdrop = (x: number, y: number) => {
    const i = (y * width + x) * channels;
    return Math.max(data[i], data[i + 1], data[i + 2]) <= 10;
  };
  const lineIsContaminated = (points: Array<[number, number]>) =>
    points.filter(([x, y]) => isBackdrop(x, y)).length / points.length >= 0.02;
  const column = (x: number) => Array.from({ length: height }, (_, y) => [x, y] as [number, number]);
  const row = (y: number) => Array.from({ length: width }, (_, x) => [x, y] as [number, number]);

  const scan = (max: number, line: (i: number) => Array<[number, number]>) => {
    let n = 0;
    while (n < max && lineIsContaminated(line(n))) n++;
    return n === 0 ? 0 : n + 2; // a couple of px of safety past the last dark line
  };

  const maxX = Math.floor(width * 0.025);
  const maxY = Math.floor(height * 0.025);
  const left = scan(maxX, (i) => column(i));
  const right = scan(maxX, (i) => column(width - 1 - i));
  const top = scan(maxY, (i) => row(i));
  const bottom = scan(maxY, (i) => row(height - 1 - i));

  return { left, top, width: width - left - right, height: height - top - bottom };
}

async function main() {
  const force = process.argv.includes("--force");
  await mkdir(OUT_DIR, { recursive: true });

  const manifest: Record<string, Entry> = (await exists(MANIFEST)) ? JSON.parse(await readFile(MANIFEST, "utf8")) : {};

  for (const { slug, met, darkEdges } of SOURCES) {
    const file = path.join(OUT_DIR, `${slug}.jpg`);
    if (!force && manifest[slug] && (await exists(file))) {
      console.log(`✓ ${slug} (cached)`);
      continue;
    }

    const res = await fetchWithRetry(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${met}`);
    const object = await res.json();
    if (!object.isPublicDomain || !object.primaryImage) {
      throw new Error(`Met object ${met} (${slug}) is not public domain or has no image`);
    }

    console.log(`↓ ${slug} ← ${object.primaryImage}`);
    const original = Buffer.from(await (await fetchWithRetry(object.primaryImage)).arrayBuffer());

    // Museum photography often includes a backdrop margin; trim it so the
    // painting's own edge meets our mat: first whatever colour the corner is,
    // then any near-black strip, then any skewed black wedge. Dark paintings
    // are left exactly as photographed — trimming would eat into the paint.
    let image = await lossless(sharp(original).rotate());
    if (!darkEdges) {
      image = await lossless(sharp(image).trim({ threshold: 40 }));
      image = await lossless(sharp(image).trim({ background: "#000000", threshold: 22 }));
    }
    image = await lossless(
      sharp(image)
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
        .toColourspace("srgb"),
    );
    if (!darkEdges) {
      image = await lossless(sharp(image).extract(await backdropWedgeCrop(image)));
    }

    const { data, info } = await sharp(image)
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    await writeFile(file, data);

    const blur = await sharp(data).resize(12, 12, { fit: "inside" }).webp({ quality: 40 }).toBuffer();

    manifest[slug] = {
      src: `/seed/${slug}.jpg`,
      width: info.width,
      height: info.height,
      blurDataURL: `data:image/webp;base64,${blur.toString("base64")}`,
      credit: `The Metropolitan Museum of Art, ${object.creditLine}. Open Access (CC0).`,
      sourceUrl: object.objectURL,
    };
    console.log(`  ${info.width}×${info.height}, ${(data.length / 1024).toFixed(0)} KB`);
  }

  await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Wrote ${path.relative(process.cwd(), MANIFEST)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
