import "server-only";
import { site } from "@/config/site";
import type { Artist, Artwork } from "@/lib/catalog/types";
import { env } from "@/lib/env";

/*
 * schema.org descriptions for search engines (JSON-LD): each work as a
 * VisualArtwork with its offer, the artist as a Person, the gallery itself.
 */

const absolute = (path: string) => new URL(path, env.SITE_URL).toString();

const person = (artist: Pick<Artist, "name"> & Partial<Artist>) => ({
  "@type": "Person",
  name: artist.name,
  url: absolute("/artist"),
  ...(artist.nationality && { nationality: artist.nationality }),
});

export function artworkJsonLd(artwork: Artwork) {
  const url = absolute(`/collection/${artwork.slug}`);
  const cm = (value: number) => ({ "@type": "QuantitativeValue", value, unitCode: "CMT" });
  return {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: artwork.title,
    url,
    image: absolute(artwork.image.src),
    description: artwork.metaDescription ?? artwork.description[0],
    creator: person(artwork.artist),
    dateCreated: artwork.yearLabel,
    artMedium: artwork.mediumDescription,
    artform: artwork.medium.name === "Drawing" ? "Drawing" : "Painting",
    height: cm(artwork.heightCm),
    width: cm(artwork.widthCm),
    ...(artwork.depthCm && { depth: cm(artwork.depthCm) }),
    offers: {
      "@type": "Offer",
      url,
      price: (artwork.priceCents / 100).toFixed(2),
      priceCurrency: site.currency,
      availability: artwork.status === "SOLD" ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      seller: { "@type": "Organization", name: site.name, url: absolute("/") },
    },
  };
}

export function artistJsonLd(artist: Artist) {
  return {
    "@context": "https://schema.org",
    ...person(artist),
    description: artist.shortBio,
    ...(artist.portrait && { image: absolute(artist.portrait.src) }),
  };
}

export function galleryJsonLd() {
  const { contact } = site;
  return {
    "@context": "https://schema.org",
    "@type": "ArtGallery",
    name: site.name,
    description: site.description,
    url: absolute("/"),
    email: contact.email,
    telephone: contact.phone,
    address: { "@type": "PostalAddress", streetAddress: contact.address.join(", ") },
  };
}

/** Safe to inline in a <script>: no "</script>" can escape the JSON. */
export function jsonLdScript(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
