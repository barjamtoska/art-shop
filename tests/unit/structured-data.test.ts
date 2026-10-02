import { describe, expect, it } from "vitest";
import type { Artwork } from "@/lib/catalog/types";
import { artworkJsonLd, jsonLdScript } from "@/lib/structured-data";

const work = (overrides: Partial<Artwork> = {}) =>
  ({
    slug: "northeaster",
    title: "Northeaster",
    yearLabel: "1895",
    mediumDescription: "Oil on canvas",
    medium: { name: "Oil" },
    heightCm: 87.6,
    widthCm: 127,
    depthCm: null,
    priceCents: 12_800_000,
    status: "AVAILABLE",
    description: ["A northeasterly gale drives a wave against the ledges."],
    metaDescription: null,
    image: { src: "/seed/northeaster.jpg" },
    artist: { name: "Winslow Homer", nationality: "American" },
    ...overrides,
  }) as unknown as Artwork;

describe("artworkJsonLd", () => {
  it("describes a work and its offer with absolute addresses", () => {
    const data = artworkJsonLd(work());
    expect(data).toMatchObject({
      "@type": "VisualArtwork",
      name: "Northeaster",
      artform: "Painting",
      height: { value: 87.6, unitCode: "CMT" },
      offers: { price: "128000.00", priceCurrency: "EUR", availability: "https://schema.org/InStock" },
    });
    expect(data.url).toMatch(/^https?:\/\/.+\/collection\/northeaster$/);
    expect(data.image).toMatch(/^https?:\/\/.+\/seed\/northeaster\.jpg$/);
    expect(data).not.toHaveProperty("depth");
  });

  it("marks a sold work as sold out, never in stock", () => {
    expect(artworkJsonLd(work({ status: "SOLD" })).offers.availability).toBe("https://schema.org/SoldOut");
  });
});

describe("jsonLdScript", () => {
  it("cannot close the script element it is inlined in", () => {
    const script = jsonLdScript(artworkJsonLd(work({ title: "</script><script>alert(1)</script>" })));
    expect(script).not.toContain("</script>");
    expect(script).not.toContain("<");
    expect(JSON.parse(script).name).toBe("</script><script>alert(1)</script>");
  });
});
