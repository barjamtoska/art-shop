import type { Metadata } from "next";
import { quietButtonClass } from "@/components/admin/forms";
import { EmptyState, PageHeader, formatDateTime } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { setEnquiryHandled } from "./actions";

export const metadata: Metadata = { title: "Enquiries" };

export default async function EnquiriesPage() {
  const enquiries = await db.enquiry.findMany({
    orderBy: [{ handledAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
    take: 200,
  });
  const works = await db.artwork.findMany({
    where: { id: { in: enquiries.flatMap((e) => (e.artworkId ? [e.artworkId] : [])) } },
    select: { id: true, title: true },
  });
  const workTitle = (id: string | null) => works.find((w) => w.id === id)?.title;

  return (
    <>
      <PageHeader
        title="Enquiries"
        description="Messages from the Visit page and from works in private collections. Waiting ones first."
      />
      {enquiries.length === 0 ? (
        <EmptyState>No enquiries yet.</EmptyState>
      ) : (
        <ul className="max-w-3xl space-y-5">
          {enquiries.map((enquiry) => (
            <li
              key={enquiry.id}
              className={`border p-5 ${enquiry.handledAt ? "border-gold/10 opacity-70" : "border-gold/30"}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p>
                  <span className="text-ivory">{enquiry.name}</span>{" "}
                  <a
                    href={`mailto:${enquiry.email}`}
                    className="text-ivory-muted underline decoration-gold/40 underline-offset-4"
                  >
                    {enquiry.email}
                  </a>
                </p>
                <p className="text-sm text-ivory-muted">{formatDateTime(enquiry.createdAt)}</p>
              </div>
              {workTitle(enquiry.artworkId) && (
                <p className="mt-1 text-sm text-ivory-muted">About: {workTitle(enquiry.artworkId)}</p>
              )}
              <p className="mt-3 whitespace-pre-line text-ivory">{enquiry.message}</p>
              <form action={setEnquiryHandled.bind(null, enquiry.id, !enquiry.handledAt)} className="mt-4">
                <button type="submit" className={quietButtonClass}>
                  {enquiry.handledAt ? "Mark as waiting" : "Mark as answered"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
