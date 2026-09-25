import { describe, expect, it } from "vitest";
import {
  formatCentimetresInput,
  formatEurosInput,
  normaliseParagraphs,
  parseCentimetres,
  parseEuros,
  slugify,
} from "@/lib/parse";

describe("slugify", () => {
  it("makes readable URL slugs, including from accented names", () => {
    expect(slugify("Moonlight, Wood Island Light")).toBe("moonlight-wood-island-light");
    expect(slugify("Vilhelm Hammershøi")).toBe("vilhelm-hammershoi");
    expect(slugify("Jean Siméon Chardin")).toBe("jean-simeon-chardin");
    expect(slugify("  Madame X (Madame Pierre Gautreau), 1883–84 ")).toBe("madame-x-madame-pierre-gautreau-1883-84");
  });
});

describe("parseEuros", () => {
  it("reads prices as people type them", () => {
    expect(parseEuros("68000")).toBe(6_800_000);
    expect(parseEuros("68,000")).toBe(6_800_000);
    expect(parseEuros("€ 68 000")).toBe(6_800_000);
    expect(parseEuros("68000.5")).toBe(6_800_050);
    expect(parseEuros("1,250.75")).toBe(125_075);
  });

  it("rejects anything ambiguous", () => {
    for (const bad of ["", "abc", "68.000,00", "-5", "6,80", "1.234.5", "12.345"]) {
      expect(parseEuros(bad), bad).toBeNull();
    }
  });

  it("round-trips through the form", () => {
    expect(parseEuros(formatEurosInput(6_800_050))).toBe(6_800_050);
    expect(formatEurosInput(4_200_000)).toBe("42000");
  });
});

describe("parseCentimetres", () => {
  it("stores whole millimetres, accepting a decimal comma", () => {
    expect(parseCentimetres("45.7")).toBe(457);
    expect(parseCentimetres("45,7")).toBe(457);
    expect(parseCentimetres("302.9")).toBe(3029);
    expect(parseCentimetres("0")).toBeNull();
    expect(parseCentimetres("forty")).toBeNull();
    expect(formatCentimetresInput(457)).toBe("45.7");
  });
});

describe("normaliseParagraphs", () => {
  it("keeps one blank line between paragraphs", () => {
    expect(normaliseParagraphs("  First.\r\n\r\n\r\n Second. \n\n")).toBe("First.\n\nSecond.");
  });
});
