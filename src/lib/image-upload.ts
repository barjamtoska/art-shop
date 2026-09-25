import "server-only";
import { randomUUID } from "node:crypto";
import { rmdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import { cloudinaryConfigured, env, localFallbacks } from "./env";
import { placeholderSrc, type StoredImage } from "./images";

/*
 * Image uploads: artwork photographs and the artist's portrait.
 *
 * Cloudinary (production): the browser uploads straight to Cloudinary with a
 * signed, single-use request for a public ID we choose — originals are far
 * larger than a serverless request may carry. The server then asks
 * Cloudinary for the real dimensions before attaching the image.
 * Local (development without keys): the browser posts to
 * /api/admin/uploads, which writes under public/uploads.
 *
 * Either way nothing the browser reports is trusted: dimensions, ownership
 * and existence are checked here.
 */

if (cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/** Below this on the long edge, the brushwork viewer shows little detail. */
export const RECOMMENDED_LONG_EDGE = 3000;

export const MAX_UPLOAD_BYTES = 60 * 1024 * 1024;

export type UploadTarget =
  | { kind: "cloudinary"; url: string; fields: Record<string, string> }
  | { kind: "local"; url: string; fields: Record<string, string> };

export type VerifiedImage = StoredImage & { width: number; height: number; blurDataUrl: string | null };

/** Where an upload belongs: one artwork's folder, or the artist's portrait. */
export type UploadFolder = `artworks/${string}` | "artist";

export function isUploadFolder(value: string): value is UploadFolder {
  return value === "artist" || /^artworks\/[a-z0-9]{1,40}$/.test(value);
}

const cloudinaryPrefix = (folder: UploadFolder) => `${env.CLOUDINARY_FOLDER}/${folder}/`;
const localPrefix = (folder: UploadFolder) => `/uploads/${folder}/`;

export function uploadTarget(folder: UploadFolder): UploadTarget {
  if (cloudinaryConfigured) {
    const params = {
      public_id: `${cloudinaryPrefix(folder)}${randomUUID()}`,
      timestamp: String(Math.floor(Date.now() / 1000)),
    };
    const signature = cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET!);
    return {
      kind: "cloudinary",
      url: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      fields: { ...params, signature, api_key: env.CLOUDINARY_API_KEY! },
    };
  }
  if (!localFallbacks) throw new Error("Cloudinary is not configured");
  return { kind: "local", url: "/api/admin/uploads", fields: { folder } };
}

/** Confirms an upload exists, belongs where it claims, and reads its true size. */
export async function verifyUpload(folder: UploadFolder, key: string): Promise<VerifiedImage> {
  if (cloudinaryConfigured) {
    if (!key.startsWith(cloudinaryPrefix(folder))) throw new Error("That upload does not belong here.");
    const resource = await cloudinary.api.resource(key, { resource_type: "image" });
    const image: StoredImage = { storage: "CLOUDINARY", key };
    return { ...image, width: resource.width, height: resource.height, blurDataUrl: await cloudinaryBlur(image) };
  }

  if (!key.startsWith(localPrefix(folder)) || key.includes("..")) throw new Error("That upload does not belong here.");
  const file = publicPath(key);
  await stat(file);
  const { default: sharp } = await import("sharp");
  const { width, height } = await sharp(file).metadata();
  if (!width || !height) throw new Error("That file could not be read as an image.");
  return { storage: "LOCAL", key, width, height, blurDataUrl: await localBlur(file) };
}

/** Writes a development upload; returns its public path. */
export async function saveLocalUpload(folder: UploadFolder, file: File): Promise<string> {
  if (cloudinaryConfigured || !localFallbacks) throw new Error("Local uploads are for development only");
  const { default: sharp } = await import("sharp");
  const buffer = Buffer.from(await file.arrayBuffer());
  const { format } = await sharp(buffer).metadata(); // throws for anything that is not an image
  const extension = { jpeg: "jpg", png: "png", webp: "webp", tiff: "tif" }[format as string];
  if (!extension) throw new Error("Please upload a JPEG, PNG, WebP or TIFF image.");

  // Browsers cannot show TIFF: store a high-quality JPEG instead.
  const key = `${localPrefix(folder)}${randomUUID()}.${extension === "tif" ? "jpg" : extension}`;
  const target = publicPath(key);
  const { mkdir, writeFile } = await import("node:fs/promises");
  await mkdir(path.dirname(target), { recursive: true });
  if (extension === "tif") await sharp(buffer).jpeg({ quality: 92, mozjpeg: true }).toFile(target);
  else await writeFile(target, buffer);
  return key;
}

/** Best effort: an orphaned file costs storage, never correctness. */
export async function deleteStoredImage(image: StoredImage): Promise<void> {
  try {
    if (image.storage === "CLOUDINARY") {
      // Seed images are shared by every environment's seed; keep them.
      if (!image.key.includes("/seed/")) await cloudinary.uploader.destroy(image.key, { resource_type: "image" });
    } else if (image.key.startsWith("/uploads/")) {
      const file = publicPath(image.key);
      await unlink(file);
      // Remove the work's folder once its last image is gone (fails harmlessly otherwise).
      await rmdir(path.dirname(file)).catch(() => {});
    }
  } catch (error) {
    console.warn("Could not delete a replaced image:", error);
  }
}

function publicPath(key: string) {
  return path.join(process.cwd(), "public", ...key.split("/").filter(Boolean));
}

async function cloudinaryBlur(image: StoredImage): Promise<string | null> {
  const src = placeholderSrc(image);
  if (!src) return null;
  try {
    const response = await fetch(src);
    if (!response.ok) return null;
    return `data:image/webp;base64,${Buffer.from(await response.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

async function localBlur(file: string): Promise<string | null> {
  const { default: sharp } = await import("sharp");
  const buffer = await sharp(file).resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}
