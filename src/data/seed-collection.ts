/**
 * Demo collection: public-domain paintings from The Met Open Access (CC0).
 * Prices are fictional and every work is flagged `isDemo` — these must be
 * replaced with the gallery's real works before launch.
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
  pastel: { slug: "pastel", name: "Pastel" },
  watercolour: { slug: "watercolour", name: "Watercolour" },
} satisfies Record<string, Medium>;

// ---------------------------------------------------------------- Artists

export const seedArtists: Artist[] = [
  {
    slug: "johannes-vermeer",
    name: "Johannes Vermeer",
    sortName: "Vermeer, Johannes",
    lifeDates: "1632–1675",
    nationality: "Dutch",
    shortBio: "Painter of Delft whose small, luminous interiors number only around thirty-five surviving works.",
    biography: [
      "Johannes Vermeer spent his whole life in Delft, where he was a member of the painters’ guild and also dealt in art. He worked slowly, and only around thirty-five of his paintings survive.",
      "His subjects are mostly quiet domestic scenes — women reading, writing, pouring, making music — lit from a window at the left. Largely forgotten after his death, he was rediscovered in the nineteenth century and is now among the most admired painters of the Dutch Golden Age.",
    ],
  },
  {
    slug: "caspar-david-friedrich",
    name: "Caspar David Friedrich",
    sortName: "Friedrich, Caspar David",
    lifeDates: "1774–1840",
    nationality: "German",
    shortBio:
      "The leading painter of German Romanticism, known for figures seen from behind before vast, silent landscapes.",
    biography: [
      "Born in Greifswald on the Baltic coast, Caspar David Friedrich trained in Copenhagen and settled in Dresden, where he lived for the rest of his life.",
      "His landscapes — ruins, mountains, moonlit shores — are rarely just views. Often a figure stands with their back to us, looking out, and invites us to look with them. After decades of neglect, his work was rediscovered in the twentieth century.",
    ],
  },
  {
    slug: "john-singer-sargent",
    name: "John Singer Sargent",
    sortName: "Sargent, John Singer",
    lifeDates: "1856–1925",
    nationality: "American",
    shortBio: "The most sought-after portrait painter of his generation, working between Paris, London and Boston.",
    biography: [
      "Born in Florence to American parents, John Singer Sargent trained in Paris under Carolus-Duran and quickly became a celebrated portraitist.",
      "After the scandal of Madame X in 1884 he moved to London, where he painted society for two decades before turning increasingly to watercolour landscapes and large mural commissions in Boston.",
    ],
  },
  {
    slug: "frederic-edwin-church",
    name: "Frederic Edwin Church",
    sortName: "Church, Frederic Edwin",
    lifeDates: "1826–1900",
    nationality: "American",
    shortBio: "Hudson River School painter of vast, meticulous panoramas, from the Andes to the Arctic.",
    biography: [
      "Frederic Edwin Church was the only pupil of Thomas Cole, the founder of the Hudson River School.",
      "Inspired by the naturalist Alexander von Humboldt, he travelled through South America, Labrador and the Middle East in search of subjects. His large canvases were exhibited like events, drawing paying crowds. His home and studio, Olana, overlooks the Hudson River.",
    ],
  },
  {
    slug: "rembrandt-van-rijn",
    name: "Rembrandt van Rijn",
    sortName: "Rembrandt van Rijn",
    lifeDates: "1606–1669",
    nationality: "Dutch",
    shortBio: "The great painter, draughtsman and printmaker of seventeenth-century Amsterdam.",
    biography: [
      "Rembrandt Harmenszoon van Rijn was born in Leiden and moved to Amsterdam in the early 1630s, where he became the city’s most fashionable portraitist.",
      "His mature work is marked by deep shadow, rich surfaces and an extraordinary sympathy for his sitters. Despite financial ruin later in life, he went on painting some of his most searching pictures, including many self-portraits.",
    ],
  },
  {
    slug: "caravaggio",
    name: "Caravaggio",
    sortName: "Caravaggio",
    lifeDates: "1571–1610",
    nationality: "Italian",
    shortBio: "The painter whose dramatic light and unidealised models changed European painting.",
    biography: [
      "Michelangelo Merisi, known as Caravaggio after the Lombard town of his family, arrived in Rome in the early 1590s and found a patron in Cardinal Francesco Maria del Monte.",
      "His paintings, sacred and secular, used ordinary people as models and a strong, raking light against darkness. His life was violent and short; his influence, carried across Europe by his followers, lasted for generations.",
    ],
  },
  {
    slug: "vincent-van-gogh",
    name: "Vincent van Gogh",
    sortName: "Gogh, Vincent van",
    lifeDates: "1853–1890",
    nationality: "Dutch",
    shortBio: "Post-Impressionist whose short career produced some of the most loved paintings in the world.",
    biography: [
      "Vincent van Gogh came to painting late, after working as an art dealer and a lay preacher. In the last years of his life, in Arles and Saint-Rémy in the south of France, he painted with extraordinary intensity.",
      "His letters to his brother Theo describe his ideas about colour and his love of the landscape around him. He sold very few paintings in his lifetime.",
    ],
  },
  {
    slug: "edgar-degas",
    name: "Edgar Degas",
    sortName: "Degas, Edgar",
    lifeDates: "1834–1917",
    nationality: "French",
    shortBio: "Painter, draughtsman and sculptor of modern Paris — above all, of the ballet.",
    biography: [
      "Edgar Degas trained in the classical tradition and exhibited with the Impressionists, though he preferred to call himself a Realist.",
      "Dancers in rehearsal, laundresses, racehorses and cafés were his subjects. Pastel became one of his favourite media, and he used it with great freedom, often in layers over charcoal.",
    ],
  },
  {
    slug: "winslow-homer",
    name: "Winslow Homer",
    sortName: "Homer, Winslow",
    lifeDates: "1836–1910",
    nationality: "American",
    shortBio: "American painter of the sea, and one of the great watercolourists.",
    biography: [
      "Winslow Homer began as a magazine illustrator, covering the American Civil War, before turning to painting.",
      "From 1883 he lived at Prouts Neck on the coast of Maine, painting the Atlantic in all weathers, and his winter journeys to the Caribbean and Florida produced watercolours of remarkable freshness.",
    ],
  },
  {
    slug: "albert-pinkham-ryder",
    name: "Albert Pinkham Ryder",
    sortName: "Ryder, Albert Pinkham",
    lifeDates: "1847–1917",
    nationality: "American",
    shortBio: "Visionary American painter of moonlit seas and dreamlike subjects.",
    biography: [
      "Albert Pinkham Ryder grew up in the whaling port of New Bedford, Massachusetts, and lived most of his life in New York.",
      "He worked for years on small panels, reworking them again and again with unconventional materials. His paintings of the sea at night, reduced to a few glowing shapes, were much admired by later modernists.",
    ],
  },
  {
    slug: "vilhelm-hammershoi",
    name: "Vilhelm Hammershøi",
    sortName: "Hammershøi, Vilhelm",
    lifeDates: "1864–1916",
    nationality: "Danish",
    shortBio: "Danish painter of silent interiors in grey and white.",
    biography: [
      "Vilhelm Hammershøi trained at the Royal Danish Academy in Copenhagen and spent most of his life in the city.",
      "His best-known pictures show the rooms of his own apartments — above all Strandgade 30 — almost empty, painted in a restrained palette of greys. Admired in his lifetime, he was largely forgotten after his death and has been rediscovered in recent decades.",
    ],
  },
  {
    slug: "jean-simeon-chardin",
    name: "Jean Siméon Chardin",
    sortName: "Chardin, Jean Siméon",
    lifeDates: "1699–1779",
    nationality: "French",
    shortBio: "Master of still life and quiet domestic scenes in eighteenth-century Paris.",
    biography: [
      "Jean Siméon Chardin spent his whole life in Paris and was admitted to the Royal Academy as a painter of animals and fruit.",
      "From the 1730s he also painted small scenes of everyday life — servants at work, children at play, a young man blowing bubbles — with a calm seriousness that set him apart from the fashionable painting of his day.",
    ],
  },
  {
    slug: "j-m-w-turner",
    name: "J. M. W. Turner",
    sortName: "Turner, Joseph Mallord William",
    lifeDates: "1775–1851",
    nationality: "British",
    shortBio: "England’s great painter of light, weather and the sea.",
    biography: [
      "Joseph Mallord William Turner entered the Royal Academy Schools at fourteen and became a full Academician at twenty-six.",
      "Travelling constantly, he filled sketchbooks with studies of landscape and weather. His late paintings, dissolving ships and storms into light, puzzled many of his contemporaries and were later seen as a forerunner of modern painting.",
    ],
  },
  {
    slug: "georges-seurat",
    name: "Georges Seurat",
    sortName: "Seurat, Georges",
    lifeDates: "1859–1891",
    nationality: "French",
    shortBio: "The inventor of the dotted technique known as pointillism.",
    biography: [
      "Georges Seurat studied at the École des Beaux-Arts in Paris and developed, from the science of colour, a method of painting in small, separate touches.",
      "In a career of barely ten years he produced a handful of large, carefully planned canvases, including A Sunday on La Grande Jatte. He died at thirty-one.",
    ],
  },
];

const artist = (slug: string) => {
  const found = seedArtists.find((a) => a.slug === slug);
  if (!found) throw new Error(`Unknown seed artist: ${slug}`);
  return { slug: found.slug, name: found.name };
};

// ---------------------------------------------------------------- Exhibitions

type SeedExhibition = Exhibition & { workSlugs: ImageKey[] };

export const seedExhibitions: SeedExhibition[] = [
  {
    slug: "nocturnes",
    title: "Nocturnes",
    subtitle: "Paintings of the hours after dark",
    opensOn: "2026-09-12",
    closesOn: "2027-02-14",
    statement: [
      "When the light goes, painting changes. Colour sinks, edges soften, and what is left is atmosphere — the glow of a moon through cloud, the lamps of a fairground, a pale square of moonlight on a floor.",
      "From Friedrich’s two wanderers to Seurat’s gaslit sideshow, each of these works finds its own way to paint what the eye can barely see. They were made to be looked at slowly, and they reward it.",
    ],
    workSlugs: ["two-men-contemplating-the-moon", "moonlight-marine", "moonlight-strandgade-30", "circus-sideshow"],
  },
  {
    slug: "the-quiet-interior",
    title: "The Quiet Interior",
    subtitle: "Rooms, light and stillness",
    opensOn: "2026-10-03",
    closesOn: "2027-03-28",
    statement: [
      "A window, a table, a figure absorbed in something small. The painters in this room found their subjects indoors and made stillness itself the drama.",
      "Across three centuries — from Rembrandt’s philosopher to Hammershøi’s empty apartment — light enters from one side and settles on what matters.",
    ],
    workSlugs: [
      "young-woman-with-a-water-pitcher",
      "soap-bubbles",
      "aristotle-with-a-bust-of-homer",
      "moonlight-strandgade-30",
    ],
  },
  {
    slug: "open-air",
    title: "Open Air",
    subtitle: "Sea, sky and distance",
    statement: [
      "Four painters looking outward: at a continent, a wheat field in Provence, a harbour in the Bahamas and the open ocean in a storm.",
      "Some worked on the spot and at speed; others spent months assembling a single view from dozens of sketches. All of them were after the same thing — the feeling of space, air and weather.",
    ],
    workSlugs: ["heart-of-the-andes", "wheat-field-with-cypresses", "sloop-nassau", "whalers"],
  },
];

// ---------------------------------------------------------------- Artworks

type SeedWork = {
  slug: ImageKey;
  title: string;
  yearLabel: string;
  artistSlug: string;
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

/** In curated order: the order the works hang in the collection. */
const works: SeedWork[] = [
  {
    slug: "two-men-contemplating-the-moon",
    title: "Two Men Contemplating the Moon",
    yearLabel: "c. 1825–30",
    artistSlug: "caspar-david-friedrich",
    medium: seedMediums.oil,
    mediumDescription: "Oil on canvas",
    heightCm: 34.9,
    widthCm: 43.8,
    priceCents: 4_200_000,
    frameStyle: "SLIM",
    alt: "Two men in dark cloaks stand on a rocky path beside a gnarled, leaning oak, looking out at a crescent moon in a violet evening sky.",
    description: [
      "Two figures, seen from behind, pause on a forest path at dusk to watch a crescent moon rise. Friedrich returned to the subject more than once; this later version follows a composition he first painted in 1819.",
      "The moon is a sliver and a single star shines beside it; almost everything else is shadow and the violet afterglow of the sun. The men stand where we would stand, so that looking at the painting becomes an act of looking with them.",
    ],
  },
  {
    slug: "young-woman-with-a-water-pitcher",
    title: "Young Woman with a Water Pitcher",
    yearLabel: "c. 1662",
    artistSlug: "johannes-vermeer",
    medium: seedMediums.oil,
    mediumDescription: "Oil on canvas",
    heightCm: 45.7,
    widthCm: 40.6,
    priceCents: 6_800_000,
    alt: "A young woman in a white linen headdress stands at a leaded window, one hand on the casement and the other on a silver pitcher resting on a table covered with a patterned carpet.",
    description: [
      "A young woman opens a leaded window with one hand while the other rests on a pitcher standing in its basin. Light from the window passes through her linen headdress and collar and turns them faintly blue.",
      "Nothing happens, and that is the point: a moment of domestic stillness arranged with the precision Vermeer is known for — the map on the wall, the carpet on the table, the jewel box, all held in a cool, even light.",
    ],
  },
  {
    slug: "heart-of-the-andes",
    title: "Heart of the Andes",
    yearLabel: "1859",
    artistSlug: "frederic-edwin-church",
    medium: seedMediums.oil,
    mediumDescription: "Oil on canvas",
    heightCm: 168,
    widthCm: 302.9,
    priceCents: 8_800_000,
    alt: "A vast South American landscape: a waterfall and pool in a sunlit clearing, dense tropical forest, and snow-capped Andes on the far horizon.",
    description: [
      "Church built this panorama from sketches made on two journeys through Ecuador and Colombia, compressing a continent’s worth of scenery — tropical forest, a waterfall, a village church and the snow-capped peak of Chimborazo — into a single view.",
      "When it was first shown in New York in 1859 it hung alone in a darkened room, set in a frame like a window and lit by gas. Visitors paid admission and queued to see it, some bringing opera glasses to study its detail.",
    ],
  },
  {
    slug: "dancer-with-a-fan",
    title: "Dancer with a Fan",
    yearLabel: "c. 1880",
    artistSlug: "edgar-degas",
    medium: seedMediums.pastel,
    mediumDescription: "Pastel on grey-green laid paper",
    heightCm: 61,
    widthCm: 41.9,
    priceCents: 3_600_000,
    status: "SOLD",
    frameStyle: "SLIM",
    alt: "A ballet dancer in a pale tutu stands half turned away, lifting an open fan to her face, drawn in charcoal and pastel on grey-green paper.",
    description: [
      "Degas drew dancers more than any other subject, usually not on stage but in rehearsal or waiting in the wings. Here a single dancer, half turned away, lifts a fan to her face; the tutu is a few strokes of pale pastel over charcoal.",
      "Much of the grey-green paper is left bare and does the work of shadow — an economy that makes the figure feel caught mid-movement.",
    ],
  },
  {
    slug: "the-musicians",
    title: "The Musicians",
    yearLabel: "1597",
    artistSlug: "caravaggio",
    medium: seedMediums.oil,
    mediumDescription: "Oil on canvas",
    heightCm: 92.1,
    widthCm: 118.4,
    priceCents: 7_600_000,
    alt: "Four young men in loose classical robes crowd together with a lute, a violin and sheet music; one looks directly out at the viewer.",
    description: [
      "Four young men in loose, classical costume prepare to make music: one tunes a lute, another studies a score, a third looks out at us, and a winged boy — Cupid — reaches for a bunch of grapes. It is among the earliest pictures Caravaggio painted for Cardinal Francesco Maria del Monte, a great patron of music in Rome.",
      "Its subject is music and love, and its manner was new: models painted from life, lit sharply from one side and crowded close to the picture’s edge.",
    ],
  },
  {
    slug: "moonlight-marine",
    title: "Moonlight Marine",
    yearLabel: "1870–90",
    artistSlug: "albert-pinkham-ryder",
    medium: seedMediums.oil,
    mediumDescription: "Oil and possibly wax on wood panel",
    heightCm: 29.2,
    widthCm: 30.5,
    priceCents: 2_900_000,
    frameStyle: "SLIM",
    alt: "Dark silhouettes of a sailing boat and a heaving sea against a pale yellow-green sky, where the moon glows behind drifting clouds; the paint surface is densely crackled.",
    description: [
      "Ryder worked on his small paintings for years, building up layers of paint, varnish and sometimes wax until the surface became almost sculptural. Here a boat under sail rides a dark swell beneath clouds lit from behind by the moon.",
      "His unstable materials have left the surface deeply crackled, but the image has only gained from it: a few massed shapes, and a sky that seems to glow from within.",
    ],
  },
  {
    slug: "wheat-field-with-cypresses",
    title: "Wheat Field with Cypresses",
    yearLabel: "1889",
    artistSlug: "vincent-van-gogh",
    medium: seedMediums.oil,
    mediumDescription: "Oil on canvas",
    heightCm: 73.2,
    widthCm: 93.4,
    priceCents: 8_400_000,
    alt: "A golden wheat field under a swirling sky of white clouds, with a tall dark cypress rising on the right and green olive trees beyond.",
    description: [
      "Painted in the summer of 1889 at Saint-Rémy-de-Provence, where Van Gogh was a voluntary patient at the asylum of Saint-Paul. He wrote to his brother that the cypresses were always on his mind, and that they were as beautiful in line and proportion as an Egyptian obelisk.",
      "He counted this among his best summer canvases and painted two further versions of it that autumn.",
    ],
  },
  {
    slug: "madame-x",
    title: "Madame X (Madame Pierre Gautreau)",
    yearLabel: "1883–84",
    artistSlug: "john-singer-sargent",
    medium: seedMediums.oil,
    mediumDescription: "Oil on canvas",
    heightCm: 208.6,
    widthCm: 109.9,
    priceCents: 9_500_000,
    status: "SOLD",
    alt: "A woman in a black satin evening gown with jewelled straps stands with her face in profile, her pale skin set against a warm brown ground, one hand resting on a small table.",
    description: [
      "Sargent’s portrait of Virginie Amélie Avegno Gautreau, an American-born Parisian celebrated for her beauty, caused a scandal at the Paris Salon of 1884. In its first state one jewelled strap had slipped from her shoulder; after the outcry, Sargent repainted it in place.",
      "He kept the painting for more than thirty years, calling it the best thing he had done.",
    ],
  },
  {
    slug: "soap-bubbles",
    title: "Soap Bubbles",
    yearLabel: "c. 1733–34",
    artistSlug: "jean-simeon-chardin",
    medium: seedMediums.oil,
    mediumDescription: "Oil on canvas",
    heightCm: 61,
    widthCm: 63.2,
    priceCents: 3_900_000,
    alt: "A young man leans on a stone window ledge, blowing a large bubble through a straw, while a small child peers over the ledge to watch.",
    description: [
      "A young man leans out over a stone window ledge, blowing a bubble through a straw while a small child peers up to watch it grow. Chardin painted several versions of the composition in the 1730s.",
      "The bubble — a traditional reminder of how brief life is — hangs at the centre, nearly transparent, made from a few touches of reflected light.",
    ],
  },
  {
    slug: "whalers",
    title: "Whalers",
    yearLabel: "c. 1845",
    artistSlug: "j-m-w-turner",
    medium: seedMediums.oil,
    mediumDescription: "Oil on canvas",
    heightCm: 91.8,
    widthCm: 122.6,
    priceCents: 7_200_000,
    alt: "A whaling ship and small boats almost dissolved in pale yellow mist and spray, with a dark shape breaking the surface of a heaving sea.",
    description: [
      "In his seventies Turner painted a group of whaling scenes for the Royal Academy, drawing on a recently published natural history of the sperm whale. Here a ship and its boats are almost lost in spray and pale light as the hunt reaches its climax.",
      "It is less a description than an experience of weather — the kind of painting that left some critics of the day unsure what they were looking at, and that later painters admired for exactly that reason.",
    ],
  },
  {
    slug: "aristotle-with-a-bust-of-homer",
    title: "Aristotle with a Bust of Homer",
    yearLabel: "1653",
    artistSlug: "rembrandt-van-rijn",
    medium: seedMediums.oil,
    mediumDescription: "Oil on canvas",
    heightCm: 143.5,
    widthCm: 136.5,
    priceCents: 12_000_000,
    alt: "A bearded man in a broad black hat and wide white sleeves, a heavy gold chain across his chest, rests his hand on a marble bust of Homer in a dim interior.",
    description: [
      "Painted for a Sicilian collector, Don Antonio Ruffo, this is one of Rembrandt’s most celebrated works: the philosopher Aristotle rests his hand on a bust of the poet Homer, while from his gold chain hangs a medallion bearing the portrait of his pupil, Alexander the Great.",
      "Rembrandt lets most of the canvas fall into warm darkness, so that the light gathers on the sleeve, the chain and the two faces — the thinker and the poet he contemplates.",
    ],
  },
  {
    slug: "sloop-nassau",
    title: "Sloop, Nassau",
    yearLabel: "1899",
    artistSlug: "winslow-homer",
    medium: seedMediums.watercolour,
    mediumDescription: "Watercolour and graphite on off-white wove paper",
    heightCm: 37.8,
    widthCm: 54.3,
    priceCents: 1_850_000,
    frameStyle: "SLIM",
    alt: "A white sloop with billowing sails heels over on turquoise water beside a small red rowing boat, under a grey and pink sky.",
    description: [
      "Winslow Homer spent the winter of 1898–99 in the Bahamas, and the watercolours he made there are among the freshest of his career: white sails, turquoise water, and weather always about to change.",
      "Much of the paper is left untouched to stand for sail and surf, and the sea is laid in with quick, overlapping washes that still look wet.",
    ],
  },
  {
    slug: "moonlight-strandgade-30",
    title: "Moonlight, Strandgade 30",
    yearLabel: "1900–1906",
    artistSlug: "vilhelm-hammershoi",
    medium: seedMediums.oil,
    mediumDescription: "Oil on canvas",
    heightCm: 41,
    widthCm: 51.1,
    priceCents: 4_600_000,
    frameStyle: "SLIM",
    alt: "An empty panelled room at night: a tall window and a closed white door, with moonlight laying a pale grid of window panes across the floor.",
    description: [
      "Hammershøi painted the rooms of his Copenhagen apartment at Strandgade 30 again and again, usually empty or with a single figure seen from behind. Here no one is present at all; the moon throws the window’s grid across the floor.",
      "The palette is almost colourless — greys, whites, a little warmth in the wood — and the stillness is complete. It is one of the quietest paintings in the collection, and one of the hardest to stop looking at.",
    ],
  },
  {
    slug: "circus-sideshow",
    title: "Circus Sideshow (Parade de cirque)",
    yearLabel: "1887–88",
    artistSlug: "georges-seurat",
    medium: seedMediums.oil,
    mediumDescription: "Oil on canvas",
    heightCm: 99.7,
    widthCm: 149.9,
    priceCents: 9_100_000,
    alt: "A night-time circus sideshow in muted blue and violet dots: a trombonist stands on a raised platform under a row of gas lamps, flanked by performers, with the silhouetted heads of spectators below.",
    description: [
      "Seurat’s first painting of a night scene shows the parade — the free performance staged outside a travelling circus in Paris to lure passers-by inside. A trombonist stands on the platform under a row of gas lamps while the crowd waits below.",
      "Built entirely from small touches of contrasting colour, the picture has a hushed, frozen quality quite unlike the noise of a fairground. It was first shown at the Salon des Indépendants in 1888.",
    ],
  },
];

export const featuredArtworkSlug: ImageKey = "two-men-contemplating-the-moon";

export const seedArtworks: Artwork[] = works.map(({ alt, status, frameStyle, artistSlug, ...work }) => {
  const image = images[work.slug];
  return {
    ...work,
    artist: artist(artistSlug),
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
