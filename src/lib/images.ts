import "server-only";
import { env } from "./env";

/*
 * Where artwork images live, and the URLs to show them.
 *
 * CLOUDINARY: the originals. The wall and room views go through next/image
 * (sized for each screen) from a high-quality master capped at 2400px; the
 * brushwork viewer loads a 4000px version directly, only when opened.
 * LOCAL: files under /public — the seed paintings, and uploads made in
 * development without Cloudinary keys.
 */

export type StoredImage = { storage: "LOCAL" | "CLOUDINARY"; key: string };

const cloudinaryBase = () => `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload`;

/** Source for next/image: the best master to resize from. */
export function displaySrc({ storage, key }: StoredImage): string {
  if (storage === "LOCAL") return key;
  // sRGB, capped size, near-lossless: next/image does the per-screen resizing.
  return `${cloudinaryBase()}/c_limit,w_2400,h_2400,q_auto:best,cs_srgb/${key}`;
}

/** The large image for the brushwork viewer. */
export function zoomSrc({ storage, key }: StoredImage): string {
  if (storage === "LOCAL") return key;
  return `${cloudinaryBase()}/c_limit,w_4000,h_4000,q_auto:good,f_auto,cs_srgb/${key}`;
}

/** A tiny version, for building the blurred placeholder. */
export function placeholderSrc({ storage, key }: StoredImage): string | null {
  if (storage === "LOCAL") return null;
  return `${cloudinaryBase()}/c_limit,w_16,h_16,q_auto:low,f_webp/${key}`;
}
