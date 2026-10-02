import type { Metadata } from "next";
import { TextPage } from "@/components/site/TextPage";
import { site } from "@/config/site";
import { visit } from "@/content/pages";
import { getArtwork } from "@/lib/catalog";
import { EnquiryForm } from "./EnquiryForm";

export const metadata: Metadata = {
  title: visit.title,
  description: visit.description,
  alternates: { canonical: "/visit" },
};

const link = "underline decoration-gold/50 underline-offset-4 transition-colors duration-500 hover:decoration-gold";

/** Where the gallery is, how to visit, and a form for enquiries (optionally about one work). */
export default async function VisitPage({ searchParams }: PageProps<"/visit">) {
  const { work: slug } = await searchParams;
  const work = typeof slug === "string" ? await getArtwork(slug) : null;
  const { contact } = site;

  return (
    <TextPage page={visit} literary>
      <section aria-labelledby="find-us" className="grid gap-10 sm:grid-cols-2">
        <h2 id="find-us" className="sr-only">
          Find us
        </h2>
        <div>
          <p className="font-caps text-label tracking-caps text-ivory-muted">Address</p>
          <address className="mt-3 leading-relaxed text-ivory not-italic">
            {contact.address.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
          <p className="mt-3">
            <a href={contact.mapUrl} className={link} rel="noopener">
              Open in maps
            </a>
          </p>
        </div>
        <div>
          <p className="font-caps text-label tracking-caps text-ivory-muted">Hours</p>
          <p className="mt-3 text-ivory">{contact.hours}</p>
          <p className="mt-6 font-caps text-label tracking-caps text-ivory-muted">Contact</p>
          <p className="mt-3 space-y-1 text-ivory">
            <a href={`mailto:${contact.email}`} className={`block w-fit ${link}`}>
              {contact.email}
            </a>
            <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className={`block w-fit ${link}`}>
              {contact.phone}
            </a>
          </p>
        </div>
      </section>

      <section id="enquiry" aria-labelledby="enquiry-heading" className="scroll-mt-12 border-t border-gold/20 pt-14">
        <h2 id="enquiry-heading" className="mb-8 text-3xl">
          {work ? "Enquire about this work" : "Write to us"}
        </h2>
        <EnquiryForm work={work ? { slug: work.slug, title: `${work.title}, ${work.yearLabel}` } : undefined} />
      </section>
    </TextPage>
  );
}
