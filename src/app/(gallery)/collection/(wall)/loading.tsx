/**
 * Between rooms: the dim wall and the outline of a frame, fading gently in.
 * No spinners.
 *
 * Scoped to the collection wall (the one page rendered per request, for its
 * filters) by the (wall) route group. A loading boundary makes a page stream,
 * and a streamed page can no longer answer 404 — so artwork, exhibition and
 * artist pages sit outside it and return a real 404 for unknown slugs.
 *
 * A full screen tall, so the footer waits below the fold instead of showing
 * and then being pushed away when the wall arrives (a layout shift).
 */
export default function Loading() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4" role="status">
      <div
        className="fade-in aspect-[4/5] w-[min(260px,56vw)] border border-gold/15 shadow-[0_30px_60px_-20px_rgb(12_3_2/0.6)]"
        style={{ animationDuration: "800ms" }}
      />
      <span className="sr-only">Loading</span>
    </div>
  );
}
