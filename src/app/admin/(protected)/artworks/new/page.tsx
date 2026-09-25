import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { createArtwork } from "../actions";
import { ArtworkForm } from "../ArtworkForm";
import { artworkFormOptions } from "../options";

export const metadata: Metadata = { title: "Add a work" };

export default async function NewArtworkPage() {
  const [options, last] = await Promise.all([artworkFormOptions(), db.artwork.aggregate({ _max: { position: true } })]);

  return (
    <>
      <PageHeader
        title="Add a work"
        back={{ href: "/admin/artworks", label: "Artworks" }}
        description="Save the details first; you will add the photograph on the next page."
      />
      <ArtworkForm
        action={createArtwork}
        submitLabel="Save and continue"
        canPublish={false}
        {...options}
        values={{
          title: "",
          slug: "",
          mediumId: "",
          mediumDescription: "",
          yearLabel: "",
          height: "",
          width: "",
          depth: "",
          price: "",
          frameStyle: "CLASSIC",
          description: "",
          provenance: "",
          inscription: "",
          framingNote: "Presented framed",
          metaDescription: "",
          position: String((last._max.position ?? 0) + 10),
          published: false,
          featured: false,
          exhibitionIds: [],
        }}
      />
    </>
  );
}
