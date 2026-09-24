/**
 * Domain types shared by the public site. Phase 2 serves these from the typed
 * seed collection; Phase 3 serves the same shapes from Prisma.
 */

export type ArtworkStatus = "AVAILABLE" | "RESERVED" | "SOLD";
export type FrameStyle = "CLASSIC" | "SLIM";

export type ArtworkImage = {
  src: string;
  width: number;
  height: number;
  alt: string;
  blurDataURL?: string;
  credit?: string;
};

export type ArtistRef = {
  slug: string;
  name: string;
};

export type Artwork = {
  slug: string;
  title: string;
  yearLabel: string;
  artist: ArtistRef;
  mediumDescription: string;
  heightCm: number;
  widthCm: number;
  depthCm?: number;
  priceCents: number;
  status: ArtworkStatus;
  frameStyle: FrameStyle;
  image: ArtworkImage;
  inscription?: string;
  framingNote?: string;
};
