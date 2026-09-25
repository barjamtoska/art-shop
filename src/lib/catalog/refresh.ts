import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Public pages are generated from the catalogue and kept until it changes.
 * Call this after any change a visitor could see — an admin edit, a sale, a
 * hold placed or released — and every page is rebuilt on its next visit.
 *
 * The catalogue is small (tens or hundreds of works) and changes rarely, so
 * refreshing the whole site is simpler and safer than tracking which pages
 * show which work.
 */
export function refreshCatalogue(): void {
  revalidatePath("/", "layout");
}
