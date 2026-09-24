/**
 * Demo collection: public-domain paintings from The Met Open Access (CC0).
 * Prices are fictional and every work is flagged `isDemo` once the database
 * exists — these must be replaced with the gallery's real works before launch.
 *
 * Images are fetched and resized by `scripts/fetch-seed-images.mts`.
 */
import images from "../../public/seed/images.json";
import type { Artwork, ArtistRef, FrameStyle, ArtworkStatus } from "@/lib/catalog/types";

type ImageKey = keyof typeof images;

const artists = {
  vermeer: { slug: "johannes-vermeer", name: "Johannes Vermeer" },
  friedrich: { slug: "caspar-david-friedrich", name: "Caspar David Friedrich" },
  sargent: { slug: "john-singer-sargent", name: "John Singer Sargent" },
  church: { slug: "frederic-edwin-church", name: "Frederic Edwin Church" },
  rembrandt: { slug: "rembrandt-van-rijn", name: "Rembrandt van Rijn" },
  caravaggio: { slug: "caravaggio", name: "Caravaggio" },
  vanGogh: { slug: "vincent-van-gogh", name: "Vincent van Gogh" },
} satisfies Record<string, ArtistRef>;

type SeedWork = {
  slug: ImageKey;
  title: string;
  yearLabel: string;
  artist: ArtistRef;
  mediumDescription: string;
  heightCm: number;
  widthCm: number;
  priceCents: number;
  status?: ArtworkStatus;
  frameStyle?: FrameStyle;
  alt: string;
};

const works: SeedWork[] = [
  {
    slug: "young-woman-with-a-water-pitcher",
    title: "Young Woman with a Water Pitcher",
    yearLabel: "c. 1662",
    artist: artists.vermeer,
    mediumDescription: "Oil on canvas",
    heightCm: 45.7,
    widthCm: 40.6,
    priceCents: 6_800_000,
    alt: "A young woman in a white linen headdress stands at a leaded window, one hand on the casement and the other on a silver pitcher resting on a table covered with a patterned carpet.",
  },
  {
    slug: "two-men-contemplating-the-moon",
    title: "Two Men Contemplating the Moon",
    yearLabel: "c. 1825–30",
    artist: artists.friedrich,
    mediumDescription: "Oil on canvas",
    heightCm: 34.9,
    widthCm: 43.8,
    priceCents: 4_200_000,
    frameStyle: "SLIM",
    alt: "Two men in dark cloaks stand on a rocky path beside a gnarled, leaning oak, looking out at a crescent moon in a violet evening sky.",
  },
  {
    slug: "madame-x",
    title: "Madame X (Madame Pierre Gautreau)",
    yearLabel: "1883–84",
    artist: artists.sargent,
    mediumDescription: "Oil on canvas",
    heightCm: 208.6,
    widthCm: 109.9,
    priceCents: 9_500_000,
    status: "SOLD",
    alt: "A woman in a black satin evening gown with jewelled straps stands with her face in profile, her pale skin set against a warm brown ground, one hand resting on a small table.",
  },
  {
    slug: "heart-of-the-andes",
    title: "Heart of the Andes",
    yearLabel: "1859",
    artist: artists.church,
    mediumDescription: "Oil on canvas",
    heightCm: 168,
    widthCm: 302.9,
    priceCents: 8_800_000,
    alt: "A vast South American landscape: a waterfall and pool in a sunlit clearing, dense tropical forest, and snow-capped Andes on the far horizon.",
  },
  {
    slug: "aristotle-with-a-bust-of-homer",
    title: "Aristotle with a Bust of Homer",
    yearLabel: "1653",
    artist: artists.rembrandt,
    mediumDescription: "Oil on canvas",
    heightCm: 143.5,
    widthCm: 136.5,
    priceCents: 12_000_000,
    status: "RESERVED",
    alt: "A bearded man in a broad black hat and wide white sleeves, a heavy gold chain across his chest, rests his hand on a marble bust of Homer in a dim interior.",
  },
  {
    slug: "the-musicians",
    title: "The Musicians",
    yearLabel: "1597",
    artist: artists.caravaggio,
    mediumDescription: "Oil on canvas",
    heightCm: 92.1,
    widthCm: 118.4,
    priceCents: 7_600_000,
    alt: "Four young men in loose classical robes crowd together with a lute, a violin and sheet music; one looks directly out at the viewer.",
  },
  {
    slug: "wheat-field-with-cypresses",
    title: "Wheat Field with Cypresses",
    yearLabel: "1889",
    artist: artists.vanGogh,
    mediumDescription: "Oil on canvas",
    heightCm: 73.2,
    widthCm: 93.4,
    priceCents: 8_400_000,
    alt: "A golden wheat field under a swirling sky of white clouds, with a tall dark cypress rising on the right and green olive trees beyond.",
  },
];

export const seedArtworks: Artwork[] = works.map(({ alt, status, frameStyle, ...work }) => {
  const image = images[work.slug];
  return {
    ...work,
    status: status ?? "AVAILABLE",
    frameStyle: frameStyle ?? "CLASSIC",
    image: {
      src: image.src,
      width: image.width,
      height: image.height,
      blurDataURL: image.blurDataURL,
      credit: image.credit,
      alt,
    },
  };
});

export function seedArtwork(slug: string): Artwork {
  const artwork = seedArtworks.find((a) => a.slug === slug);
  if (!artwork) throw new Error(`Unknown seed artwork: ${slug}`);
  return artwork;
}
