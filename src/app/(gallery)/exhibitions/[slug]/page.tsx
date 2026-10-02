import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Hang } from "@/components/gallery/Hang";
import { copy } from "@/config/copy";
import { getExhibition, getExhibitionSlugs } from "@/lib/catalog";
import { formatExhibitionDates } from "@/lib/format";

export async function generateStaticParams() {
  return (await getExhibitionSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/exhibitions/[slug]">): Promise<Metadata> {
  const exhibition = await getExhibition((await params).slug);
  if (!exhibition) return {};
  return {
    title: exhibition.title,
    description: exhibition.statement[0],
    alternates: { canonical: `/exhibitions/${exhibition.slug}` },
  };
}

export default async function ExhibitionPage({ params }: PageProps<"/exhibitions/[slug]">) {
  const exhibition = await getExhibition((await params).slug);
  if (!exhibition) notFound();

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <Link
          href="/exhibitions"
          className="font-caps text-label tracking-caps text-ivory-muted transition-colors duration-500 hover:text-ivory"
        >
          ← {copy.exhibitions.title}
        </Link>
      </div>

      <div className="px-4 sm:px-8">
        <header className="mx-auto max-w-3xl pt-10 text-center sm:pt-14">
          <p className="font-caps text-label tracking-caps text-ivory-muted">
            {formatExhibitionDates(exhibition.opensOn, exhibition.closesOn)}
          </p>
          <h1 className="mt-4 text-5xl sm:text-7xl">{exhibition.title}</h1>
          <p className="mt-4 font-display text-2xl text-ivory-muted italic">{exhibition.subtitle}</p>
          <div className="mx-auto mt-12 max-w-prose space-y-5 text-left font-display text-xl leading-relaxed text-ivory">
            {exhibition.statement.map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}
          </div>
        </header>

        <section className="mt-36" aria-label={exhibition.title}>
          <Hang works={exhibition.works} label={exhibition.title} />
        </section>
      </div>
    </>
  );
}
