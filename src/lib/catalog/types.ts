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

export type ArtistRef = { slug: string; name: string };
export type ExhibitionRef = { slug: string; title: string };
export type Medium = { slug: string; name: string };

export type Artwork = {
  slug: string;
  title: string;
  yearLabel: string;
  artist: ArtistRef;
  medium: Medium;
  /** The full medium as a museum would list it, e.g. "Oil on canvas". */
  mediumDescription: string;
  heightCm: number;
  widthCm: number;
  depthCm?: number;
  priceCents: number;
  status: ArtworkStatus;
  frameStyle: FrameStyle;
  image: ArtworkImage;
  /** "About the work", one string per paragraph. */
  description: string[];
  inscription?: string;
  framingNote?: string;
  exhibitions: ExhibitionRef[];
  /** Demo works (public-domain seed data) can never be acquired with live payments. */
  isDemo: boolean;
};

export type Artist = {
  slug: string;
  name: string;
  /** Used for alphabetical order, e.g. "Vermeer, Johannes". */
  sortName: string;
  lifeDates: string;
  nationality: string;
  shortBio: string;
  biography: string[];
};

export type Exhibition = {
  slug: string;
  title: string;
  subtitle: string;
  statement: string[];
  /** ISO dates; an exhibition without dates is ongoing. */
  opensOn?: string;
  closesOn?: string;
};

export type ArtistWithWorks = Artist & { works: Artwork[] };
export type ExhibitionWithWorks = Exhibition & { works: Artwork[] };
