/**
 * Demonstration collection: public-domain works by a single painter, Winslow
 * Homer, from The Met Open Access programme (CC0) — the gallery shows one
 * artist, so the demo does too. Prices are fictional and every work is
 * flagged `isDemo`; the artist's profile and these works are replaced with
 * the owner's own before launch.
 *
 * Images are fetched and resized by `scripts/fetch-seed-images.mts`.
 * prisma/seed.ts loads this data into the database; the /lab page reads it
 * directly.
 */
import images from "../../public/seed/images.json";
import type { Artist, Artwork, ArtworkStatus, Exhibition, FrameStyle, Medium } from "@/lib/catalog/types";

type ImageKey = keyof typeof images;

// ---------------------------------------------------------------- Mediums

export const seedMediums = {
  oil: { slug: "oil", name: "Oil" },
  watercolour: { slug: "watercolour", name: "Watercolour" },
  drawing: { slug: "drawing", name: "Drawing" },
} satisfies Record<string, Medium>;

// ---------------------------------------------------------------- The artist

export const seedArtist: Artist = {
  slug: "winslow-homer",
  name: "Winslow Homer",
  sortName: "Homer, Winslow",
  lifeDates: "1836–1910",
  nationality: "American",
  shortBio:
    "Painter of the sea, whose oils and watercolours of the Maine coast and the Caribbean are among the most admired of his century.",
  biography: [
    "Winslow Homer was born in Boston in 1836 and began as a commercial illustrator, drawing for Harper’s Weekly; during the Civil War he sketched soldiers in camp and at the front. He taught himself to paint in oils in the early 1860s and was soon exhibiting in New York.",
    "In 1881–82 he spent almost two years at Cullercoats, a fishing village on the North Sea coast of England. The women there, waiting on the shore for the boats to come in, changed his subject for good: from then on his work turned to the sea and the people who live by it.",
    "In 1883 he settled at Prouts Neck, on the coast of Maine, and painted the surf breaking on the rocks below his studio. Winters took him south — to Florida, the Bahamas, Bermuda and Cuba — and to watercolours of a brilliance few have matched. He died at Prouts Neck in 1910.",
  ],
  statement: [],
};

const artist = { slug: seedArtist.slug, name: seedArtist.name };

// ---------------------------------------------------------------- Exhibitions

type SeedExhibition = Exhibition & { workSlugs: ImageKey[] };

export const seedExhibitions: SeedExhibition[] = [
  {
    slug: "the-weather-coast",
    title: "The Weather Coast",
    subtitle: "Prouts Neck, Maine",
    opensOn: "2026-09-12",
    closesOn: "2027-02-14",
    statement: [
      "For the last twenty-seven years of his life, Homer lived on a rocky point on the coast of Maine, and the sea below his studio became his great subject. He painted it in every weather, but above all when it was at its most violent.",
      "The four paintings in this room show the same stretch of shore — by day and by moonlight, in a gale and in the grey after one. There are almost no people in them: only rock, water and the light between.",
    ],
    workSlugs: ["northeaster", "cannon-rock", "maine-coast", "moonlight-wood-island-light"],
  },
  {
    slug: "islands-in-the-sun",
    title: "Islands in the Sun",
    subtitle: "The Bahamas, Key West and Cuba",
    opensOn: "2026-11-07",
    closesOn: "2027-04-18",
    statement: [
      "Homer escaped the Maine winters by travelling south, and there, working mostly in watercolour, he found a new palette: turquoise water, white sails, the green of palms against a storm.",
      "Alongside the watercolours hang two oils that grew out of these journeys — a sailor adrift on the Gulf Stream, and the harbour of Santiago de Cuba by searchlight.",
    ],
    workSlugs: [
      "sloop-nassau",
      "palm-tree-nassau",
      "hurricane-bahamas",
      "shore-and-surf-nassau",
      "fishing-boats-key-west",
      "the-gulf-stream",
      "searchlight-on-harbor-entrance",
    ],
  },
  {
    slug: "people-of-the-shore",
    title: "People of the Shore",
    subtitle: "Figures by the sea",
    statement: [
      "Before the sea became Homer’s whole subject, it was the setting for the people who lived beside it: bathers on a Massachusetts beach, and the fisherwomen of an English village who waited, in all weathers, for the boats.",
      "These works trace that change — from a sunlit afternoon in 1870 to the drawings and watercolours of Cullercoats, where his art found its gravity.",
    ],
    workSlugs: ["eagle-head-manchester", "inside-the-bar", "fisherwomen"],
  },
];

// ---------------------------------------------------------------- Works

type SeedWork = {
  slug: ImageKey;
  title: string;
  yearLabel: string;
  medium: Medium;
  mediumDescription: string;
  heightCm: number;
  widthCm: number;
  priceCents: number;
  status?: ArtworkStatus;
  frameStyle?: FrameStyle;
  alt: string;
  description: string[];
};

/** Works on paper hang in slim frames; oils in the classic moulding. */
const onPaper = { frameStyle: "SLIM" as const };
const watercolour = {
  ...onPaper,
  medium: seedMediums.watercolour,
  mediumDescription: "Watercolour and graphite on off-white wove paper",
};
const oil = { medium: seedMediums.oil, mediumDescription: "Oil on canvas" };

/** In curated order: the order the works hang in the collection. */
const works: SeedWork[] = [
  {
    slug: "moonlight-wood-island-light",
    title: "Moonlight, Wood Island Light",
    yearLabel: "1894",
    ...oil,
    heightCm: 78.1,
    widthCm: 102.2,
    priceCents: 13_800_000,
    alt: "Waves break over dark rocks under a clouded night sky; moonlight catches the spray and lays a pale track across the sea.",
    description: [
      "Moonlight glances off the spray of a wave breaking on the rocks at Prouts Neck, and a pale track runs out across the water towards the horizon. Almost everything else is darkness, held in tones of blue-black and grey.",
      "Homer’s family remembered that he painted it out of doors, on a single summer night. It has the directness of something seen and set down at once: the sea at night, with nothing between it and the viewer.",
    ],
  },
  {
    slug: "snap-the-whip",
    title: "Snap the Whip",
    yearLabel: "1872",
    ...oil,
    heightCm: 30.5,
    widthCm: 50.8,
    priceCents: 6_400_000,
    alt: "Barefoot boys hold hands and run in a line across a meadow in front of a red schoolhouse; the boys at the end of the line tumble to the ground.",
    description: [
      "Schoolboys play snap the whip in a summer meadow: the line runs, the leader stops short, and the boys at the far end are flung off their feet. Behind them stands a small red one-room schoolhouse.",
      "Homer painted the subject twice in 1872; this is the smaller of the two versions. Made a few years after the Civil War, it looks back to a country childhood that was already passing.",
    ],
  },
  {
    slug: "northeaster",
    title: "Northeaster",
    yearLabel: "1895, reworked by 1901",
    ...oil,
    heightCm: 87.6,
    widthCm: 127,
    priceCents: 12_800_000,
    alt: "A great wave bursts into white spray against dark coastal rocks under a heavy grey sky.",
    description: [
      "A northeasterly gale drives a wave against the ledges at Prouts Neck, and the sea explodes upwards in a tower of spray. There is no horizon to speak of and no place to stand: only rock, water and weather.",
      "Homer first exhibited the painting in 1895 and later reworked it, painting out two figures in oilskins who had stood on the rocks. Without them, the storm is the whole subject.",
    ],
  },
  {
    slug: "sloop-nassau",
    title: "Sloop, Nassau",
    yearLabel: "1899",
    ...watercolour,
    heightCm: 37.8,
    widthCm: 54.3,
    priceCents: 3_400_000,
    alt: "A white sloop with billowing sails rides out a squall on turquoise water under a darkening sky, a small red boat alongside.",
    description: [
      "A sloop with its sails half lowered rides out a squall off Nassau. The water shifts from turquoise to deep blue, and a pink light still touches the clouds as the weather comes in.",
      "On his winter journeys to the Bahamas Homer worked almost entirely in watercolour. Here the white of the paper does much of the work — in the sails, the foam and the breaks in the cloud.",
    ],
  },
  {
    slug: "the-veteran-in-a-new-field",
    title: "The Veteran in a New Field",
    yearLabel: "1865",
    ...oil,
    heightCm: 61.3,
    widthCm: 96.8,
    priceCents: 11_800_000,
    status: "SOLD",
    alt: "A man in a white shirt, seen from behind, swings a scythe through a field of ripe golden wheat under a pale blue sky; a jacket and canteen lie at the lower right.",
    description: [
      "A former soldier, home from the Civil War, cuts ripe wheat with a scythe. His army jacket and canteen lie discarded at the lower right; everything else is the golden field and a clear summer sky.",
      "Painted in the months after the war ended, the picture is about a return to peace: the soldier has gone back to the land. Yet a lone figure with a scythe also recalls the Grim Reaper, at a time when the country was counting its dead.",
    ],
  },
  {
    slug: "palm-tree-nassau",
    title: "Palm Tree, Nassau",
    yearLabel: "1898",
    ...watercolour,
    heightCm: 54.3,
    widthCm: 37.8,
    priceCents: 2_900_000,
    alt: "A single tall palm bends in the wind on a green hillside above a blue sea, its fronds streaming to one side.",
    description: [
      "A lone palm on a hill above the sea at Nassau bends before the wind, its fronds streaming out to one side. Below, the water is a band of pure blue.",
      "The tall, narrow format — unusual for Homer — follows the tree up into the sky, and the wind is everywhere in the brushwork: in the fronds, the grass and the scudding cloud.",
    ],
  },
  {
    slug: "cannon-rock",
    title: "Cannon Rock",
    yearLabel: "1895",
    ...oil,
    heightCm: 101.6,
    widthCm: 101.6,
    priceCents: 12_400_000,
    alt: "Seen from a cliff above, green-blue waves surge into a cleft between two dark masses of rock and break in white foam.",
    description: [
      "From high on the rocks, we look almost straight down on the surf as it surges into a narrow cleft on the shore at Prouts Neck, at a place known locally as Cannon Rock.",
      "The square canvas and the steep, cropped view recall the Japanese prints of Homer’s day. There is no horizon at all — only the rhythm of green water breaking white against the stone.",
    ],
  },
  {
    slug: "fisherwomen",
    title: "Fisherwomen",
    yearLabel: "1882",
    ...onPaper,
    medium: seedMediums.drawing,
    mediumDescription: "Charcoal, white chalk and graphite on off-white wove paper",
    heightCm: 21.6,
    widthCm: 31.8,
    priceCents: 950_000,
    alt: "A charcoal drawing of two women in heavy shawls bent into the wind as they walk along a shore with baskets on their backs; a figure and a boat are sketched behind them.",
    description: [
      "Two fisherwomen lean into the wind as they walk the shore, baskets on their backs. The drawing is quick and sure: a few dark strokes of charcoal for the figures, touches of white chalk for the light.",
      "Homer made it at Cullercoats, the fishing village on the North Sea coast of England where he lived in 1881–82. The women who worked there became the heroines of his art.",
    ],
  },
  {
    slug: "the-gulf-stream",
    title: "The Gulf Stream",
    yearLabel: "1899, reworked by 1906",
    ...oil,
    heightCm: 71.4,
    widthCm: 124.8,
    priceCents: 14_200_000,
    alt: "A man lies on the deck of a small dismasted boat tossed on a rough blue-green sea; sharks circle in the water around it and a waterspout rises in the distance.",
    description: [
      "A lone sailor lies on the deck of a dismasted boat, adrift in heavy seas. Sharks circle, a waterspout rises in the distance, and a ship on the far horizon has not seen him.",
      "Homer built the picture from sketches and watercolours made on his journeys to the Bahamas. Asked what would become of the sailor, he replied, with dry humour, that the man would be rescued and return home.",
    ],
  },
  {
    slug: "inside-the-bar",
    title: "Inside the Bar",
    yearLabel: "1883",
    ...watercolour,
    heightCm: 40.6,
    widthCm: 73.7,
    priceCents: 3_800_000,
    status: "SOLD",
    alt: "A fisherwoman holding a basket stands on a wet shore, her skirts blown by a strong wind, as sailing boats come in under a stormy grey sky.",
    description: [
      "A fisherwoman stands braced against the wind on the shore, her shawl and skirts pulled sideways, as the boats run for the shelter of the harbour. The sky is heavy with weather.",
      "Homer painted it in 1883, after his return from Cullercoats, working from studies made in England. The single, monumental figure speaks for all those who waited on the shore for the fleet.",
    ],
  },
  {
    slug: "eagle-head-manchester",
    title: "Eagle Head, Manchester, Massachusetts (High Tide)",
    yearLabel: "1870",
    ...oil,
    heightCm: 66,
    widthCm: 96.5,
    priceCents: 9_600_000,
    alt: "Three women who have been bathing wring out their hair and dresses on a sunlit beach; a small black dog barks at the waves, and a green headland rises behind.",
    description: [
      "Three women come out of the sea at high tide: one wrings the water from her hair, another stands with her back to us, a third sits on the sand. A small dog barks at the retreating wave.",
      "When Homer exhibited the painting in 1870, critics found the wet bathing dresses improper. Today it reads as a fresh, unposed moment of summer on the Massachusetts shore.",
    ],
  },
  {
    slug: "hurricane-bahamas",
    title: "Hurricane, Bahamas",
    yearLabel: "1898",
    ...watercolour,
    heightCm: 36.7,
    widthCm: 53.5,
    priceCents: 3_200_000,
    alt: "Palm trees bend and thrash in a storm above the red and grey roofs of low houses, under a dark, heavy sky.",
    description: [
      "A storm tears through the palms above the rooftops of Nassau. The trees bend almost double, their fronds whipped into ragged shapes against a sky of wet grey.",
      "Homer let the washes run and bleed to catch the violence of the wind. Few painters have made a medium so often thought of as gentle look so wild.",
    ],
  },
  {
    slug: "searchlight-on-harbor-entrance",
    title: "Searchlight on Harbor Entrance, Santiago de Cuba",
    yearLabel: "1902",
    ...oil,
    heightCm: 77.5,
    widthCm: 128.3,
    priceCents: 11_200_000,
    alt: "At night, the dark silhouettes of a watchtower and an old cannon stand on a fortress wall above a harbour; a searchlight beam crosses the cloudy sky and a small moon glows above.",
    description: [
      "An old cannon and a watchtower stand in silhouette on the walls of Morro Castle, the fortress guarding the harbour of Santiago de Cuba, while a searchlight from the fleet offshore sweeps the sky.",
      "The scene recalls the Spanish–American War of 1898, when warships blockaded the harbour and lit its entrance by night. Homer had visited Santiago years before; here he paints the war as an eerie stillness, with no one in sight.",
    ],
  },
  {
    slug: "fishing-boats-key-west",
    title: "Fishing Boats, Key West",
    yearLabel: "1903",
    ...watercolour,
    heightCm: 35.4,
    widthCm: 55.2,
    priceCents: 2_700_000,
    alt: "White sailing boats with loosened sails lie at anchor on pale blue water under a bright sky; a man works aboard one of them.",
    description: [
      "Fishing boats rest at anchor off Key West, their sails loosened to dry in the sun. The water is pale and still, the light high and bright.",
      "It is watercolour at its most economical: much of the sunlit sail and sky is simply bare paper, framed by a few quick, exact strokes.",
    ],
  },
  {
    slug: "maine-coast",
    title: "Maine Coast",
    yearLabel: "1896",
    ...oil,
    heightCm: 76.2,
    widthCm: 101.6,
    priceCents: 11_800_000,
    alt: "Green-grey waves roll in and break in white foam over dark rocks in the foreground under a low grey sky.",
    description: [
      "Wave after wave rolls in towards the ledges below Homer’s studio at Prouts Neck and breaks in white foam over the rocks. The sky is low and grey, the sea a deep, cold green.",
      "The rocks in the foreground seem to meet us head-on, as if we too stood at the water’s edge, with the whole weight of the Atlantic coming in.",
    ],
  },
  {
    slug: "shore-and-surf-nassau",
    title: "Shore and Surf, Nassau",
    yearLabel: "1899",
    ...watercolour,
    heightCm: 37.9,
    widthCm: 54.3,
    priceCents: 3_100_000,
    alt: "Turquoise waves break in white against a low, rocky shore under grey clouds; a steamship and a lighthouse are small on the horizon.",
    description: [
      "Waves in turquoise and ultramarine roll onto the low rocks of the Bahamas shore. On the horizon a steamer passes, and a lighthouse stands at the sea’s edge.",
      "It shows Homer’s watercolour at its freest: broad, bright washes laid side by side, with flecks of bare paper for the foam.",
    ],
  },
];

export const featuredArtworkSlug: ImageKey = "moonlight-wood-island-light";

export const seedArtworks: Artwork[] = works.map(({ alt, status, frameStyle, ...work }) => {
  const image = images[work.slug];
  return {
    ...work,
    artist,
    status: status ?? "AVAILABLE",
    frameStyle: frameStyle ?? "CLASSIC",
    isDemo: true,
    exhibitions: seedExhibitions
      .filter((e) => e.workSlugs.includes(work.slug))
      .map((e) => ({ slug: e.slug, title: e.title })),
    image: {
      src: image.src,
      zoomSrc: image.src,
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
