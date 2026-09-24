/**
 * All visitor-facing UI text lives here, so wording stays consistent with the
 * gallery's voice ("Acquire", "Collection", "Exhibitions") and a second
 * language can be added later without hunting through components.
 */
export const copy = {
  placard: {
    artist: "Artist",
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
    enquire: "Enquire about this work",
  },
} as const;
