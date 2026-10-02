import type { Metadata } from "next";
import { QuietLink } from "@/components/ui/Quiet";
import { copy } from "@/config/copy";
import { getArtwork } from "@/lib/catalog";

export const metadata: Metadata = { title: "Acquisition not completed", robots: { index: false, follow: false } };

/** After the collector leaves checkout; the hold has already been released. */
export default async function AcquisitionCancelledPage({ searchParams }: PageProps<"/acquisition/cancelled">) {
  const { work: slug } = await searchParams;
  const work = typeof slug === "string" ? await getArtwork(slug) : null;
  const c = copy.acquisition.cancelled;

  return (
    <section className="flex min-h-[60svh] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-4xl">{c.title}</h1>
      <p className="mt-5 max-w-md font-display text-xl text-ivory-muted italic">{c.body}</p>
      <div className="mt-12">
        <QuietLink href={work ? `/collection/${work.slug}` : "/collection"}>
          {work ? c.backToWork : copy.acquisition.complete.backToCollection}
        </QuietLink>
      </div>
    </section>
  );
}
