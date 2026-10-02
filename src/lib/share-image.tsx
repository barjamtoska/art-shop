import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/config/site";
import { cloudinaryConfigured, env } from "@/lib/env";
import type { StoredImage } from "@/lib/images";

/*
 * Link-preview images (Open Graph, 1200×630): the painting framed and lit on
 * the maroon wall, with its title set in Cormorant. Rendered by next/og,
 * which supports flexbox and simple gradients, so the frame is built from
 * layered borders rather than the site's CSS.
 */

export const shareImageSize = { width: 1200, height: 630 };

const font = (file: string) => readFile(path.join(process.cwd(), "assets/fonts", file));

async function fonts() {
  const [light, italic, caps] = await Promise.all([
    font("cormorant-garamond-latin-300-normal.woff"),
    font("cormorant-garamond-latin-400-italic.woff"),
    font("cormorant-sc-latin-400-normal.woff"),
  ]);
  return [
    { name: "Cormorant", data: light, weight: 300 as const, style: "normal" as const },
    { name: "Cormorant", data: italic, weight: 400 as const, style: "italic" as const },
    { name: "Cormorant SC", data: caps, weight: 400 as const, style: "normal" as const },
  ];
}

/** The painting as something next/og can draw: a data URL for local files, a sized URL from Cloudinary. */
async function paintingSource(image: StoredImage): Promise<string | null> {
  try {
    if (image.storage === "CLOUDINARY") {
      if (!cloudinaryConfigured) return null;
      return `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/c_limit,w_1000,h_1000,q_auto:good,f_jpg/${image.key}`;
    }
    const file = await readFile(path.join(process.cwd(), "public", ...image.key.split("/").filter(Boolean)));
    const type = image.key.endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${type};base64,${file.toString("base64")}`;
  } catch {
    return null;
  }
}

const wall = "#501210";
const gilt = "linear-gradient(135deg, #6e5427 0%, #b8935a 30%, #dcc08a 48%, #9c7a43 70%, #c4a067 100%)";

export async function renderShareImage(input: {
  eyebrow: string;
  title: string;
  /** Shown in italics, as artwork titles are. */
  titleItalic?: boolean;
  lines?: string[];
  painting?: { image: StoredImage; width: number; height: number } | null;
}) {
  const src = input.painting ? await paintingSource(input.painting.image) : null;
  // Fit the framed painting within 470×470, keeping its proportions.
  const ratio = input.painting ? input.painting.width / input.painting.height : 1;
  const inner =
    ratio >= 1 ? { width: 420, height: Math.round(420 / ratio) } : { width: Math.round(380 * ratio), height: 380 };

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        padding: "0 80px",
        gap: 64,
        backgroundColor: wall,
        backgroundImage: `radial-gradient(ellipse 60% 70% at 30% 35%, rgba(152,44,34,0.75), transparent 70%), radial-gradient(ellipse 120% 90% at 50% 40%, transparent 45%, rgba(20,4,3,0.85) 100%)`,
      }}
    >
      {src && (
        <div
          style={{
            display: "flex",
            padding: 22,
            backgroundImage: gilt,
            boxShadow: "0 30px 50px rgba(12,3,2,0.7)",
            border: "2px solid #4a3514",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "26px 26px 32px",
              backgroundColor: "#dfd2b9",
              boxShadow: "inset 0 4px 8px rgba(30,15,2,0.45)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- next/og draws plain <img> */}
            <img src={src} width={inner.width} height={inner.height} alt="" style={{ objectFit: "cover" }} />
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, color: "#f3ebdd" }}>
        <div style={{ display: "flex", fontFamily: "Cormorant SC", fontSize: 26, letterSpacing: 8, color: "#cbbfa8" }}>
          {input.eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontFamily: "Cormorant",
            fontStyle: input.titleItalic ? "italic" : "normal",
            fontWeight: input.titleItalic ? 400 : 300,
            fontSize: input.title.length > 40 ? 50 : 64,
            lineHeight: 1.1,
          }}
        >
          {input.title}
        </div>
        <div style={{ display: "flex", width: 60, height: 2, marginTop: 28, backgroundColor: "#b8935a" }} />
        {(input.lines ?? []).map((line) => (
          <div
            key={line}
            style={{ display: "flex", marginTop: 18, fontFamily: "Cormorant", fontSize: 30, color: "#cbbfa8" }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>,
    { ...shareImageSize, fonts: await fonts() },
  );
}

export const shareImageEyebrow = site.name.toUpperCase();
