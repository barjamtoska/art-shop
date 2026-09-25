import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { deleteExhibition, updateExhibition } from "../actions";
import { ExhibitionForm } from "../ExhibitionForm";
import { exhibitionWorkChoices } from "../works";

export async function generateMetadata({ params }: PageProps<"/admin/exhibitions/[id]">): Promise<Metadata> {
  const exhibition = await db.exhibition.findUnique({ where: { id: (await params).id }, select: { title: true } });
  return { title: exhibition?.title ?? "Exhibition" };
}

const iso = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : "");

export default async function EditExhibitionPage({ params, searchParams }: PageProps<"/admin/exhibitions/[id]">) {
  const { id } = await params;
  const { created } = await searchParams;
  const [exhibition, works] = await Promise.all([
    db.exhibition.findUnique({
      where: { id },
      include: { works: { orderBy: { position: "asc" }, select: { artworkId: true } } },
    }),
    exhibitionWorkChoices(),
  ]);
  if (!exhibition) notFound();

  return (
    <>
      <PageHeader title={exhibition.title} back={{ href: "/admin/exhibitions", label: "Exhibitions" }} />
      {created && (
        <p role="status" className="mb-8 border border-gold/30 px-4 py-3 text-ivory">
          Exhibition added{exhibition.published ? "." : " as hidden. Tick “Shown in the gallery” when it is ready."}
        </p>
      )}
      {exhibition.published && (
        <p className="mb-8 text-sm text-ivory-muted">
          <Link
            href={`/exhibitions/${exhibition.slug}`}
            className="underline decoration-gold/40 underline-offset-4 hover:text-ivory"
          >
            See it in the gallery
          </Link>
        </p>
      )}
      <ExhibitionForm
        action={updateExhibition.bind(null, exhibition.id)}
        works={works}
        values={{
          title: exhibition.title,
          subtitle: exhibition.subtitle,
          slug: exhibition.slug,
          statement: exhibition.statement,
          opensOn: iso(exhibition.opensOn),
          closesOn: iso(exhibition.closesOn),
          position: String(exhibition.position),
          published: exhibition.published,
          workIds: exhibition.works.map((w) => w.artworkId),
        }}
      />
      <div className="mt-14 max-w-3xl border-t border-gold/15 pt-8">
        <DeleteButton
          action={deleteExhibition.bind(null, exhibition.id)}
          label="Delete this exhibition"
          confirmation={`Delete the exhibition “${exhibition.title}”? Its works stay in the collection.`}
        />
      </div>
    </>
  );
}
