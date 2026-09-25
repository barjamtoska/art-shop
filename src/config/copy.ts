/**
 * All visitor-facing UI text lives here, so wording stays consistent with the
 * gallery's voice ("Acquire", "Collection", "Exhibitions") and a second
 * language can be added later without hunting through components.
 */
export const copy = {
  navigation: [
    { href: "/collection", label: "Collection" },
    { href: "/exhibitions", label: "Exhibitions" },
    { href: "/artist", label: "The Artist" },
  ],
  skipLink: "Skip to the gallery",
  menu: { open: "Menu", close: "Close", label: "Main" },
  placard: {
    title: "Title",
    medium: "Medium",
    dimensions: "Dimensions",
    price: "Price",
    status: "Status",
    sold: "In a private collection",
    reserved: "Under consideration by another collector",
    reservedShort: "Under consideration",
  },
  actions: {
    acquire: "Acquire this work",
    inspect: "Inspect the brushwork",
    enterCollection: "Enter the collection",
    enterExhibition: "Enter the exhibition",
    enquire: "Enquire about this work",
    backToCollection: "The Collection",
    viewArtist: "About the artist",
  },
  entrance: {
    currentExhibition: "Now showing",
  },
  collection: {
    title: "The Collection",
    intro: "Every work is unique. Take your time; the lights stay on.",
    filterLabel: "Filter the collection",
    exhibition: "Exhibition",
    medium: "Medium",
    allExhibitions: "All exhibitions",
    allMediums: "All mediums",
    all: "All",
    availableOnly: "Available works",
    clear: "Clear",
    empty: "No works in this room match your selection.",
    showAll: "Show the whole collection",
    room: "Room",
    of: "of",
    nextRoom: "Continue to the next room",
    previousRoom: "Return to the previous room",
  },
  artwork: {
    about: "About the work",
    theArtist: "The artist",
    details: "Details",
    imageCredit: "Image",
    demoNote:
      "Demonstration piece: a public-domain work from The Met’s Open Access collection, shown to illustrate the gallery. Its price is fictional.",
    related: "Also in the collection",
  },
  exhibitions: {
    title: "Exhibitions",
    intro: "Rooms arranged around a single idea. Each can be visited on its own, or as part of the collection.",
    works: (n: number) => `${n} ${n === 1 ? "work" : "works"}`,
  },
  artist: {
    title: "The Artist",
    inTheirWords: "In the artist’s words",
    worksInCollection: "Works in the collection",
    seeAll: "See the whole collection",
  },
  notFound: {
    title: "This room is closed",
    body: "The work or page you were looking for is not on view. It may have moved to another room.",
    back: "Return to the entrance",
  },
  error: {
    title: "A light has gone out in this room",
    body: "Something went wrong while preparing this page. Please try again in a moment.",
    retry: "Try again",
  },
  zoom: {
    label: (title: string) => `Inspect: ${title}`,
    hint: "Drag to explore · Scroll or pinch to zoom · Esc to close",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    reset: "Reset",
    close: "Close",
  },
} as const;
