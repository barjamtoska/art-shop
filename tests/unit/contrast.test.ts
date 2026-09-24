import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * WCAG AA contrast for the text tokens, read straight from globals.css so the
 * test follows the design system rather than a copy of it.
 */
const css = readFileSync(path.join(process.cwd(), "src/styles/globals.css"), "utf8");
const token = (name: string) => {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!match) throw new Error(`Missing colour token --color-${name}`);
  return match[1];
};

type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const over = (top: RGB, alpha: number, bottom: RGB): RGB =>
  top.map((c, i) => bottom[i] + (c - bottom[i]) * alpha) as RGB;
const luminance = (rgb: RGB) => {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: RGB, b: RGB) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const wall = hex(token("wall"));
const wallDeep = hex(token("wall-deep"));
const light = hex(token("light"));
// Brightest wall a label can sit on: a (generous) mottling patch from `.wall`,
// lifted by the spotlight's outer falloff where placards hang. The pool's
// peak (crimson 0.62, glow 0.07) only ever falls behind the frame itself;
// see `.spot` in FramedArtwork.module.css.
const mottled = over([104, 24, 40], 0.35, wall);
const litWall = over(light, 0.04, over([150, 38, 52], 0.2, mottled));

const backgrounds = { wall, wallDeep, litWall };

describe("text contrast on the wall (WCAG AA)", () => {
  for (const name of ["ivory", "ivory-muted"]) {
    for (const [bgName, bg] of Object.entries(backgrounds)) {
      it(`${name} on ${bgName} ≥ 4.5:1`, () => {
        expect(contrast(hex(token(name)), bg)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }

  it("gold is usable for small text on the unlit wall (≥ 4.5:1)", () => {
    expect(contrast(hex(token("gold")), wall)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex(token("gold")), wallDeep)).toBeGreaterThanOrEqual(4.5);
  });

  it("gold stays a legible UI/large-text colour under the light (≥ 3:1)", () => {
    expect(contrast(hex(token("gold")), litWall)).toBeGreaterThanOrEqual(3);
  });

  it("the mat is never pure white", () => {
    expect(token("mat").toLowerCase()).not.toBe("#ffffff");
  });
});
