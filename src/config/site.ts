/**
 * Gallery identity. The name is a placeholder until the final one is chosen —
 * change it here and it changes everywhere (pages, metadata, emails).
 */
export const site = {
  name: "Maison",
  tagline: "Fine art, quietly shown",
  description:
    "A private gallery of paintings, hung and lit as they would be in a museum at night. Each work is unique.",
  currency: "EUR",
  locale: "en-IE",
  /** Certificates of acquisition are numbered MAI-2026-0001, MAI-2026-0002 … */
  certificatePrefix: "MAI",
  /**
   * How to reach the gallery (Visit page, footer, legal pages, structured
   * data). PLACEHOLDERS — replace every value before launch.
   */
  contact: {
    email: "gallery@example.com",
    phone: "+353 1 000 0000",
    /** Shown line by line. */
    address: ["[Street address]", "[Postcode] [City]", "[Country]"],
    /** e.g. a Google Maps link to the address. */
    mapUrl: "https://maps.google.com/?q=[gallery+address]",
    hours: "By appointment",
    /** The legal seller named in the terms of sale (company or sole trader), and its registration. */
    legalName: "[Legal name of the seller]",
    registration: "[Company number / VAT number]",
  },
} as const;
