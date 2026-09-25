import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { createExhibition } from "../actions";
import { ExhibitionForm } from "../ExhibitionForm";
import { exhibitionWorkChoices } from "../works";

export const metadata: Metadata = { title: "Add an exhibition" };

export default async function NewExhibitionPage() {
  const [works, last] = await Promise.all([
    exhibitionWorkChoices(),
    db.exhibition.aggregate({ _max: { position: true } }),
  ]);
  return (
    <>
      <PageHeader title="Add an exhibition" back={{ href: "/admin/exhibitions", label: "Exhibitions" }} />
      <ExhibitionForm
        action={createExhibition}
        submitLabel="Add the exhibition"
        works={works}
        values={{
          title: "",
          subtitle: "",
          slug: "",
          statement: "",
          opensOn: "",
          closesOn: "",
          position: String((last._max.position ?? 0) + 10),
          published: false,
          workIds: [],
        }}
      />
    </>
  );
}
