import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminForm, TextAreaField, TextField } from "@/components/admin/forms";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { PageHeader, StatusLabel, formatDateTime } from "@/components/admin/ui";
import { artworkStatusLabel } from "@/lib/admin-labels";
import { db } from "@/lib/db";
import { RECOMMENDED_LONG_EDGE } from "@/lib/image-upload";
import { displaySrc } from "@/lib/images";
import { formatCentimetresInput, formatEurosInput } from "@/lib/parse";
import { attachArtworkImage, deleteArtwork, prepareImageUpload, updateArtwork, updateImageDetails } from "../actions";
import { ArtworkForm } from "../ArtworkForm";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { artworkFormOptions } from "../options";

export async function generateMetadata({ params }: PageProps<"/admin/artworks/[id]">): Promise<Metadata> {
  const work = await db.artwork.findUnique({ where: { id: (await params).id }, select: { title: true } });
  return { title: work?.title ?? "Artwork" };
}

export default async function EditArtworkPage({ params, searchParams }: PageProps<"/admin/artworks/[id]">) {
  const { id } = await params;
  const { created } = await searchParams;
  const [work, options] = await Promise.all([
    db.artwork.findUnique({
      where: { id },
      include: {
        images: { where: { kind: "PRIMARY" }, take: 1 },
        exhibitions: { select: { exhibitionId: true } },
        _count: { select: { orders: true } },
      },
    }),
    artworkFormOptions(),
  ]);
  if (!work) notFound();

  const image = work.images[0];
  const status = artworkStatusLabel(work.status, work.reservedUntil);
  const deletable = work.status === "AVAILABLE" && work._count.orders === 0;

  return (
    <>
      <PageHeader title={work.title} back={{ href: "/admin/artworks", label: "Artworks" }} />

      {created && (
        <p role="status" className="mb-8 border border-gold/30 px-4 py-3 text-ivory">
          Saved as a draft. Now add the photograph, then put the work on view.
        </p>
      )}

      <div className="mb-10 flex flex-wrap items-center gap-3 text-sm text-ivory-muted">
        <StatusLabel tone={status.tone}>{status.label}</StatusLabel>
        {work.status === "SOLD" && work.soldAt && <span>Sold {formatDateTime(work.soldAt)}</span>}
        {status.label === "On hold" && work.reservedUntil && (
          <span>Held until {formatDateTime(work.reservedUntil)}</span>
        )}
        {work.published ? (
          <Link
            href={`/collection/${work.slug}`}
            className="underline decoration-gold/40 underline-offset-4 hover:text-ivory"
          >
            See it in the gallery
          </Link>
        ) : (
          <StatusLabel>Draft</StatusLabel>
        )}
        {work.isDemo && <span>Demonstration work: it cannot be acquired with live payments.</span>}
      </div>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <ArtworkForm
          action={updateArtwork.bind(null, work.id)}
          submitLabel="Save"
          canPublish
          {...options}
          values={{
            title: work.title,
            slug: work.slug,
            mediumId: work.mediumId,
            mediumDescription: work.mediumDescription,
            yearLabel: work.yearLabel,
            height: formatCentimetresInput(work.heightMm),
            width: formatCentimetresInput(work.widthMm),
            depth: formatCentimetresInput(work.depthMm),
            price: formatEurosInput(work.priceCents),
            frameStyle: work.frameStyle,
            description: work.description,
            provenance: work.provenance ?? "",
            inscription: work.inscription ?? "",
            framingNote: work.framingNote ?? "",
            metaDescription: work.metaDescription ?? "",
            position: String(work.position),
            published: work.published,
            featured: work.featured,
            exhibitionIds: work.exhibitions.map((e) => e.exhibitionId),
          }}
        />

        <aside className="space-y-10" aria-label="Photograph">
          <section className="space-y-5 border border-gold/15 p-5">
            <h2 className="font-caps text-label tracking-caps text-ivory-muted">Photograph</h2>
            {image ? (
              <>
                <Image
                  src={displaySrc(image)}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  sizes="320px"
                  className="h-auto w-full"
                />
                <p className="text-xs text-ivory-muted">
                  {image.width} × {image.height}px
                  {Math.max(image.width, image.height) < RECOMMENDED_LONG_EDGE &&
                    ` — below the recommended ${RECOMMENDED_LONG_EDGE}px for the brushwork viewer`}
                </p>
                <AdminForm action={updateImageDetails.bind(null, work.id)} submitLabel="Save description">
                  <TextAreaField
                    name="alt"
                    label="Description for screen readers"
                    defaultValue={image.alt}
                    rows={4}
                    hint="What the painting shows, for visitors who cannot see it."
                  />
                  <TextField name="credit" label="Photo credit (optional)" defaultValue={image.credit} />
                </AdminForm>
              </>
            ) : (
              <p className="text-sm text-ivory-muted">No photograph yet. The work cannot go on view without one.</p>
            )}
            <ImageUploader
              prepare={prepareImageUpload.bind(null, work.id)}
              attach={attachArtworkImage.bind(null, work.id)}
              defaultAlt={image?.alt ?? ""}
              defaultCredit={image?.credit ?? ""}
              hasImage={Boolean(image)}
            />
          </section>

          <section className="space-y-3 border border-alert/25 p-5">
            <h2 className="font-caps text-label tracking-caps text-ivory-muted">Delete</h2>
            {deletable ? (
              <DeleteButton
                action={deleteArtwork.bind(null, work.id)}
                label="Delete this work"
                confirmation={`Delete “${work.title}” and its photograph? This cannot be undone.`}
              />
            ) : (
              <p className="text-sm text-ivory-muted">
                A work with orders or a sale on record stays in the archive. Take it off view instead.
              </p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
