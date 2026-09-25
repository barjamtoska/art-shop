/*
 * Parsing for admin form input: forgiving about how people type numbers
 * ("68,000", "45,7"), strict about what gets stored.
 */

/** "Moonlight, Wood Island Light" → "moonlight-wood-island-light" */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A price in euros as typed — "68000", "68,000", "68 000", "68000.50",
 * "€68,000" — to cents. Returns null for anything else.
 */
export function parseEuros(input: string): number | null {
  const cleaned = input
    .trim()
    .replace(/^€\s*/, "")
    .replace(/[\s\u00a0\u202f]/g, "");
  const match = /^(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const whole = Number(match[1].replace(/,/g, ""));
  const cents = Number((match[2] ?? "").padEnd(2, "0"));
  const total = whole * 100 + cents;
  return Number.isSafeInteger(total) ? total : null;
}

/** Centimetres as typed ("45.7" or "45,7") to whole millimetres. */
export function parseCentimetres(input: string): number | null {
  const cleaned = input.trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const mm = Math.round(Number(cleaned) * 10);
  return mm > 0 ? mm : null;
}

/** Cents back to the form's "68000" or "68000.50". */
export function formatEurosInput(cents: number): string {
  const whole = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest ? `${whole}.${String(rest).padStart(2, "0")}` : String(whole);
}

/** Millimetres back to the form's centimetres. */
export function formatCentimetresInput(mm: number | null | undefined): string {
  return mm ? String(mm / 10) : "";
}

/** Normalise paragraphs: trims each, one blank line between them. */
export function normaliseParagraphs(text: string): string {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.trim().replace(/\r\n/g, "\n"))
    .filter(Boolean)
    .join("\n\n");
}
