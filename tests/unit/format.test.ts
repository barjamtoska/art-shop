import { describe, expect, it } from "vitest";
import { formatDimensionsCm, formatDimensionsIn, formatPrice } from "@/lib/format";
import { hangSize } from "@/lib/hang";

describe("formatPrice", () => {
  it("formats whole euros without cents", () => {
    expect(formatPrice(4_800_000)).toBe("€48,000");
  });
});

describe("dimensions", () => {
  it("lists height × width in cm, dropping trailing .0", () => {
    expect(formatDimensionsCm(45.7, 40.6)).toBe("45.7 × 40.6 cm");
    expect(formatDimensionsCm(168, 302.9)).toBe("168 × 302.9 cm");
    expect(formatDimensionsCm(30, 20, 2.5)).toBe("30 × 20 × 2.5 cm");
  });

  it("converts to inches, rounded to a quarter inch", () => {
    expect(formatDimensionsIn(45.7, 40.6)).toBe("18 × 16 in");
  });
});

describe("hangSize", () => {
  it("keeps small works legible and large works within bounds", () => {
    expect(hangSize(20, 25).width).toBe("min(220px, 64vw)");
    expect(hangSize(302.9, 168).width).toBe("min(480px, 86vw)");
  });

  it("caps tall works by height", () => {
    const px = Number(hangSize(109.9, 208.6).width.match(/min\((\d+)px/)![1]);
    expect(px).toBeLessThanOrEqual(270);
  });
});
