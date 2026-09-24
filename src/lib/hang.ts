/**
 * How wide a framed work hangs on the wall. Sizes reflect the painting's real
 * width, so a small panel reads as intimate and a large canvas as grand, but
 * are clamped so nothing becomes a postage stamp or overwhelms the room.
 */

const MIN_PX = 240;
const MAX_PX = 540;
const MAX_HEIGHT_PX = 500; // keeps tall portraits from towering over the hang
// Painting width as a share of the framed width, and the extra height the
// frame + bottom-weighted mat add, both as a share of the framed width.
// Mirrors --fw / --mw in FramedArtwork.module.css.
const PAINTING_SHARE = 0.74;
const FRAME_EXTRA_HEIGHT = 0.27;

export type HangSize = {
  /** CSS width for the framed work (desktop px, mobile vw). */
  width: string;
  /** `sizes` attribute describing the painting's rendered width. */
  sizes: string;
};

export function hangSize(widthCm: number, heightCm: number): HangSize {
  const byWidth = 180 + widthCm * 2.2;
  const byHeight = MAX_HEIGHT_PX * (widthCm / heightCm);
  const px = Math.round(Math.min(MAX_PX, Math.max(MIN_PX, Math.min(byWidth, byHeight))));

  // On phones every work is shown large enough to see, still keeping some scale.
  const vw = Math.round(64 + ((px - MIN_PX) / (MAX_PX - MIN_PX)) * 22);

  return {
    width: `min(${px}px, ${vw}vw)`,
    sizes: `(max-width: 640px) ${Math.round(vw * PAINTING_SHARE)}vw, ${Math.round(px * PAINTING_SHARE)}px`,
  };
}

/**
 * Size for a single work shown alone (the artwork room, the Entrance): as
 * large as possible while the whole frame stays within ~70% of the viewport
 * height, so the work is seen at once, never cropped by the fold.
 */
export function roomSize(aspectRatio: number, { maxPx = 620, heightShare = 0.7 } = {}): HangSize {
  const heightPerWidth = PAINTING_SHARE / aspectRatio + FRAME_EXTRA_HEIGHT;
  const byHeight = `calc(${heightShare * 100}svh / ${heightPerWidth.toFixed(3)})`;
  return {
    width: `min(88vw, ${maxPx}px, ${byHeight})`,
    sizes: `(max-width: 640px) ${Math.round(88 * PAINTING_SHARE)}vw, ${Math.round(maxPx * PAINTING_SHARE)}px`,
  };
}
