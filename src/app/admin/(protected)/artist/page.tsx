import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { displaySrc } from "@/lib/images";
import { attachPortrait, prepareArtistUpload, removeDemoWorks, removePortrait, saveArtist } from "./actions";
import { ArtistForm } from "./ArtistForm";
import { RemoveDemoWorks } from "./RemoveDemoWorks";

export const metadata: Metadata = { title: "The artist" };

const portraitWording = {
  label: "Portrait",
  replaceLabel: "Replace the portrait",
  fileHint: "A photograph of the artist, or of the artist at work. JPEG, PNG, WebP or TIFF.",
  altHint: "Who is shown and where, in a sentence — for visitors who cannot see it.",
  altMissing: "Describe the portrait for someone who cannot see it.",
};

export default async function ArtistAdminPage() {
  const [artist, demoWorks] = await Promise.all([
    db.artist.findFirst({ include: { _count: { select: { artworks: true } } } }),
    db.artwork.count({ where: { isDemo: true, orders: { none: {} } } }),
  ]);

  return (
    <>
      <PageHeader
        title="The artist"
        description="The gallery shows and sells the work of one artist. This is their profile, shown on The Artist page and beside every work."
      />

      {demoWorks > 0 && (
        <section className="mb-10 max-w-3xl border border-notice/40 p-5">
          <h2 className="text-xl text-notice">Demonstration works</h2>
          <p className="mt-2 text-ivory-muted">
            The collection still holds {demoWorks} demonstration {demoWorks === 1 ? "work" : "works"}, public-domain
            paintings by {artist?.name ?? "another painter"}, used to show how the gallery looks. Before entering your
            own name here, remove them, so your name never stands above another painter’s work.
          </p>
          <div className="mt-4">
            <RemoveDemoWorks action={removeDemoWorks} count={demoWorks} />
          </div>
        </section>
      )}

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ArtistForm
          action={saveArtist}
          submitLabel={artist ? "Save" : "Create the profile"}
          values={{
            name: artist?.name ?? "",
            lifeDates: artist?.lifeDates ?? "",
            nationality: artist?.nationality ?? "",
            shortBio: artist?.shortBio ?? "",
            biography: artist?.biography ?? "",
            statement: artist?.statement ?? "",
          }}
        />

        <aside className="space-y-8" aria-label="Portrait">
          <section className="space-y-5 border border-gold/15 p-5">
            <h2 className="font-caps text-label tracking-caps text-ivory-muted">Portrait</h2>
            {!artist ? (
              <p className="text-sm text-ivory-muted">Create the profile first; then you can add a portrait.</p>
            ) : (
              <>
                {artist.portraitStorage && artist.portraitKey && artist.portraitWidth && artist.portraitHeight ? (
                  <>
                    <Image
                      src={displaySrc({ storage: artist.portraitStorage, key: artist.portraitKey })}
                      alt={artist.portraitAlt ?? ""}
                      width={artist.portraitWidth}
                      height={artist.portraitHeight}
                      sizes="280px"
                      className="h-auto w-full"
                    />
                    <DeleteButton
                      action={removePortrait}
                      label="Remove the portrait"
                      confirmation="Remove the portrait from The Artist page?"
                    />
                  </>
                ) : (
                  <p className="text-sm text-ivory-muted">
                    Optional. Without one, The Artist page shows the biography alone.
                  </p>
                )}
                <ImageUploader
                  prepare={prepareArtistUpload}
                  attach={attachPortrait}
                  defaultAlt={artist.portraitAlt ?? ""}
                  hasImage={Boolean(artist.portraitKey)}
                  wording={portraitWording}
                />
              </>
            )}
          </section>
          {artist && (
            <p className="text-sm text-ivory-muted">
              <Link href="/artist" className="underline decoration-gold/40 underline-offset-4 hover:text-ivory">
                See The Artist page
              </Link>
              {" · "}
              {artist._count.artworks} {artist._count.artworks === 1 ? "work" : "works"} in the collection
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
