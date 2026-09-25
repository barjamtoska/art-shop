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

const longDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "12 September 2026 – 14 February 2027"; an exhibition without dates is ongoing. */
export function formatExhibitionDates(opensOn?: string, closesOn?: string): string {
  const fmt = (iso: string) => longDate.format(new Date(`${iso}T00:00:00Z`));
  if (opensOn && closesOn) return `${fmt(opensOn)} – ${fmt(closesOn)}`;
  if (closesOn) return `Until ${fmt(closesOn)}`;
  if (opensOn) return `From ${fmt(opensOn)}`;
  return "Ongoing";
}

/** "18 × 16 in" — rounded to the nearest quarter inch. */
export function formatDimensionsIn(heightCm: number, widthCm: number, depthCm?: number): string {
  const toIn = (cm: number) => String(Math.round((cm / 2.54) * 4) / 4);
  const parts = [heightCm, widthCm, ...(depthCm ? [depthCm] : [])].map(toIn);
  return `${parts.join(" × ")} in`;
}
