import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FramedArtwork } from "@/components/gallery/FramedArtwork";
import { QuietLink } from "@/components/ui/Quiet";
import { copy } from "@/config/copy";
import { getArtwork } from "@/lib/catalog";
import { db } from "@/lib/db";
import { AwaitRecording } from "./AwaitRecording";

export const metadata: Metadata = { title: "Your acquisition", robots: { index: false, follow: false } };

/**
 * Where checkout returns the collector. This page only reads: the sale is
 * recorded by the verified Stripe webhook, which usually arrives first.
 */
export default async function AcquisitionCompletePage({ searchParams }: PageProps<"/acquisition/complete">) {
  const { session_id: sessionId } = await searchParams;
  if (typeof sessionId !== "string") notFound();

  const order = await db.order.findUnique({
    where: { stripeSessionId: sessionId },
    select: { status: true, certificateToken: true, artwork: { select: { slug: true } } },
  });
  if (!order) notFound();
  const work = await getArtwork(order.artwork.slug);
  const c = copy.acquisition.complete;
  const workTitle = work ? `${work.title}, ${work.yearLabel}` : "";

  return (
    <section className="flex min-h-[70svh] flex-col items-center justify-center px-4 py-16 text-center">
      {work && (
        <div className="mb-14 w-[min(300px,64vw)]">
          <FramedArtwork image={work.image} frameStyle={work.frameStyle} sizes="(max-width: 640px) 47vw, 222px" />
        </div>
      )}

      {order.status === "PAID" && (
        <>
          <h1 className="text-5xl">{c.title}</h1>
          <p className="mt-5 max-w-md font-display text-2xl text-ivory">
            <cite>{work?.title}</cite>
            {work && `, ${work.yearLabel}`} is now in your collection.
          </p>
          <p className="mt-4 max-w-md text-ivory-muted">{c.next}</p>
          <div className="mt-12">
            <QuietLink href={`/certificate/${order.certificateToken}`}>{c.certificate}</QuietLink>
          </div>
        </>
      )}

      {order.status === "PENDING" && (
        <>
          <h1 className="text-4xl">{c.recordingTitle}</h1>
          <AwaitRecording />
        </>
      )}

      {(order.status === "CONFLICT_REFUNDED" || order.status === "REFUNDED") && (
        <>
          <h1 className="text-4xl">{c.conflictTitle}</h1>
          <p className="mt-5 max-w-md font-display text-xl text-ivory-muted italic">{c.conflictBody}</p>
          <div className="mt-12">
            <QuietLink href="/collection">{c.backToCollection}</QuietLink>
          </div>
        </>
      )}

      {(order.status === "EXPIRED" || order.status === "CANCELLED") && (
        <>
          <h1 className="text-4xl">{c.endedTitle}</h1>
          <p className="mt-5 max-w-md font-display text-xl text-ivory-muted italic">{c.endedBody}</p>
          <div className="mt-12">
            <QuietLink href={work ? `/collection/${work.slug}` : "/collection"}>
              {work ? workTitle : c.backToCollection}
            </QuietLink>
          </div>
        </>
      )}
    </section>
  );
}
