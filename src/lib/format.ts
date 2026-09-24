import { site } from "@/config/site";

const price = new Intl.NumberFormat(site.locale, {
  style: "currency",
  currency: site.currency,
  maximumFractionDigits: 0,
});

/** "€48,000" — prices are stored as integer cents. */
export function formatPrice(cents: number): string {
  return price.format(cents / 100);
}

const oneDecimal = (n: number) => String(Math.round(n * 10) / 10);

/** "45.7 × 40.6 cm" (height × width [× depth], as museums list them). */
export function formatDimensionsCm(heightCm: number, widthCm: number, depthCm?: number): string {
  const parts = [heightCm, widthCm, ...(depthCm ? [depthCm] : [])].map(oneDecimal);
  return `${parts.join(" × ")} cm`;
}

/** "18 × 16 in" — rounded to the nearest quarter inch. */
export function formatDimensionsIn(heightCm: number, widthCm: number, depthCm?: number): string {
  const toIn = (cm: number) => String(Math.round((cm / 2.54) * 4) / 4);
  const parts = [heightCm, widthCm, ...(depthCm ? [depthCm] : [])].map(toIn);
  return `${parts.join(" × ")} in`;
}
