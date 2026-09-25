import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { cloudinaryConfigured, localFallbacks } from "@/lib/env";
import { MAX_UPLOAD_BYTES, saveLocalUpload } from "@/lib/image-upload";

/**
 * Development-only image uploads, used when Cloudinary is not configured.
 * In production, images go straight from the browser to Cloudinary.
 */
export async function POST(request: Request) {
  if (cloudinaryConfigured || !localFallbacks) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  if (!(await getAdmin())) return NextResponse.json({ error: "Not authorised" }, { status: 401 });

  const form = await request.formData();
  const artworkId = form.get("artworkId");
  const file = form.get("file");
  if (typeof artworkId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES)
    return NextResponse.json({ error: "That file is too large (60 MB at most)." }, { status: 413 });
  if (!(await db.artwork.findUnique({ where: { id: artworkId }, select: { id: true } }))) {
    return NextResponse.json({ error: "Unknown work" }, { status: 404 });
  }

  try {
    return NextResponse.json({ key: await saveLocalUpload(artworkId, file) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json(
      { error: message.startsWith("Please") ? message : "That file could not be read as an image." },
      { status: 400 },
    );
  }
}
