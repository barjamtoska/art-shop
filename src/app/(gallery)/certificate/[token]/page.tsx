import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FramedArtwork } from "@/components/gallery/FramedArtwork";
import { copy } from "@/config/copy";
import { site } from "@/config/site";
import { db } from "@/lib/db";
import { formatDimensionsCm, formatDimensionsIn } from "@/lib/format";
import { displaySrc } from "@/lib/images";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "Certificate of acquisition", robots: { index: false, follow: false } };

const longDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * The certificate of acquisition, at an unguessable address sent only to the
 * collector. Printable on A4.
 */
export default async function CertificatePage({ params }: PageProps<"/certificate/[token]">) {
  const { token } = await params;
  const order = await db.order.findUnique({
    where: { certificateToken: token },
    include: {
      artwork: {
        include: {
          artist: { select: { name: true } },
          images: { where: { kind: "PRIMARY" }, take: 1 },
        },
      },
    },
  });
  if (!order || !order.certificateNumber || !order.paidAt || !["PAID", "REFUNDED"].includes(order.status)) notFound();

  const { artwork } = order;
  const image = artwork.images[0];
  const c = copy.certificate;
  const cm = artwork.heightMm / 10;
  const wcm = artwork.widthMm / 10;
  const dcm = artwork.depthMm ? artwork.depthMm / 10 : undefined;

  return (
    <section className="px-4 pt-6 pb-24 print:p-0">
      <article className="certificate mx-auto max-w-3xl bg-mat px-6 py-12 text-wall-deep shadow-[0_40px_80px_-30px_rgb(12_3_2/0.8)] sm:px-14 sm:py-16 print:max-w-none print:shadow-none">
        <div className="border-[3px] border-double border-gold-deep/70 px-5 py-10 text-center sm:px-12">
          <p className="font-caps text-sm tracking-[0.4em]">{site.name}</p>
          <h1 className="mt-6 font-display text-4xl font-light tracking-wide sm:text-5xl">{c.title}</h1>
          <div className="mx-auto mt-6 h-px w-24 bg-gold-deep/60" />

          {image && (
            <div className="mx-auto mt-10 w-[min(220px,56vw)]">
              <FramedArtwork
                image={{
                  src: displaySrc(image),
                  zoomSrc: displaySrc(image),
                  width: image.width,
                  height: image.height,
                  alt: image.alt,
                  blurDataURL: image.blurDataUrl ?? undefined,
                }}
                frameStyle={artwork.frameStyle}
                size="thumb"
                sizes="160px"
                unlit
              />
            </div>
          )}

          <p className="mt-10 font-display text-lg italic">{c.intro}</p>
          <p className="mt-4 font-display text-3xl">
            <cite>{artwork.title}</cite>, {artwork.yearLabel}
          </p>
          <p className="mt-2 font-caps tracking-[0.2em]">{artwork.artist.name}</p>
          <p className="mt-3 text-sm">
            {artwork.mediumDescription} · {formatDimensionsCm(cm, wcm, dcm)} ({formatDimensionsIn(cm, wcm, dcm)})
          </p>

          <p className="mt-8 font-display text-lg italic">{c.acquiredBy}</p>
          <p className="mt-2 font-display text-2xl">{order.collectorName ?? "—"}</p>
          <p className="mt-2 font-display text-lg italic">
            {c.on} {longDate.format(order.paidAt)}
          </p>

          <div className="mt-12 flex flex-col items-center justify-between gap-10 sm:flex-row sm:items-end">
            <div className="text-left">
              <div className="h-px w-56 bg-wall-deep/50" />
              <p className="mt-2 font-caps text-sm tracking-[0.2em]">{c.signature}</p>
            </div>
            <div className="seal" aria-hidden="true">
              <span>{site.certificatePrefix}</span>
            </div>
            <div className="text-right">
              <p className="font-caps text-sm tracking-[0.2em]">{c.number}</p>
              <p className="mt-1 font-display text-2xl tabular-nums">{order.certificateNumber}</p>
            </div>
          </div>

          {order.status === "REFUNDED" && (
            <p role="note" className="mt-10 font-display text-lg italic">
              {c.refunded}
            </p>
          )}
        </div>
      </article>
      <div className="mt-10 text-center print:hidden">
        <PrintButton label={c.print} />
      </div>
    </section>
  );
}
