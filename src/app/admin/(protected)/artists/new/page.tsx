import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { createArtist } from "../actions";
import { ArtistForm } from "../ArtistForm";

export const metadata: Metadata = { title: "Add an artist" };

export default function NewArtistPage() {
  return (
    <>
      <PageHeader title="Add an artist" back={{ href: "/admin/artists", label: "Artists" }} />
      <ArtistForm
        action={createArtist}
        submitLabel="Add the artist"
        values={{
          name: "",
          sortName: "",
          slug: "",
          lifeDates: "",
          nationality: "",
          shortBio: "",
          biography: "",
          published: true,
        }}
      />
    </>
  );
}
