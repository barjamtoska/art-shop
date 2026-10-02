"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { site } from "@/config/site";
import { clientIpHash, siteOrigin } from "@/lib/acquisition/context";
import { db } from "@/lib/db";
import { emailLayout, sendEmail } from "@/lib/email";
import { galleryEmails } from "@/lib/env";

export type EnquiryState = {
  status: "idle" | "sent" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "message", string>>;
};

/** At most this many enquiries per visitor per hour. */
const HOURLY_LIMIT = 5;

const enquirySchema = z.object({
  name: z.string().trim().min(1, "Please tell us your name.").max(120),
  email: z.email("Please give an email address we can reply to.").max(200),
  message: z.string().trim().min(10, "Please write a few words.").max(4000, "Please keep it under 4,000 characters."),
  work: z.string().max(80).optional(),
  /** A field people never see: anything in it means a bot. */
  website: z.string().max(0).optional(),
});

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendEnquiry(_state: EnquiryState, formData: FormData): Promise<EnquiryState> {
  const raw = Object.fromEntries(
    ["name", "email", "message", "work", "website"].map((key) => [key, String(formData.get(key) ?? "")]),
  );
  // Bots fill every field; pretend all is well and keep nothing.
  if (raw.website) return { status: "sent" };

  const parsed = enquirySchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: EnquiryState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<EnquiryState["fieldErrors"]>;
      fieldErrors[key] ??= issue.message;
    }
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors };
  }

  const requestHeaders = await headers();
  const ipHash = clientIpHash(requestHeaders);
  if (ipHash) {
    const recent = await db.enquiry.count({
      where: { clientIpHash: ipHash, createdAt: { gt: new Date(Date.now() - 60 * 60_000) } },
    });
    if (recent >= HOURLY_LIMIT) {
      return {
        status: "error",
        message: `We have your messages. Please write to ${site.contact.email} if it is urgent.`,
      };
    }
  }

  const { name, email, message, work } = parsed.data;
  const artwork = work
    ? await db.artwork.findUnique({ where: { slug: work }, select: { id: true, title: true } })
    : null;
  const enquiry = await db.enquiry.create({
    data: { name, email, message, artworkId: artwork?.id ?? null, clientIpHash: ipHash },
  });

  const origin = siteOrigin(requestHeaders);
  for (const to of galleryEmails) {
    try {
      await sendEmail({
        to,
        subject: `Enquiry from ${name}${artwork ? ` about ${artwork.title}` : ""}`,
        text: `${name} <${email}>${artwork ? `\nAbout: ${artwork.title}` : ""}\n\n${message}\n\n${origin}/admin/enquiries`,
        html: emailLayout({
          heading: "A new enquiry",
          body: `<p>${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;${artwork ? `<br>About: <em>${escapeHtml(artwork.title)}</em>` : ""}</p><p style="white-space:pre-line">${escapeHtml(message)}</p>`,
          action: { label: "Open enquiries", url: `${origin}/admin/enquiries` },
        }),
      });
    } catch (error) {
      // The enquiry is saved either way; it shows in the admin.
      console.error(`Notification for enquiry ${enquiry.id} failed:`, error);
    }
  }
  return { status: "sent" };
}
