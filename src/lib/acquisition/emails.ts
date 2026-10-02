import "server-only";
import { site } from "@/config/site";
import type { PrismaClient } from "@/generated/prisma/client";
import { emailLayout, type Email } from "@/lib/email";
import { formatPrice } from "@/lib/format";

/*
 * Emails about an acquisition. Each is sent at most once per order (guarded
 * in the database), and a failed email never undoes or fails the sale: the
 * admin can resend the confirmation from the order page.
 */

export type SendEmail = (email: Email) => Promise<void>;

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function loadOrder(db: PrismaClient, orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    include: { artwork: { select: { title: true, yearLabel: true, artist: { select: { name: true } } } } },
  });
}

/**
 * Sends the collector's confirmation and the gallery's notification, once.
 * `force` resends the confirmation (from the admin).
 */
export async function sendAcquisitionEmails(
  deps: { db: PrismaClient; send: SendEmail; origin: string; galleryEmails: string[] },
  orderId: string,
  { force = false } = {},
): Promise<"sent" | "already-sent" | "failed" | "not-paid"> {
  const order = await loadOrder(deps.db, orderId);
  if (!order || order.status !== "PAID" || !order.email) return "not-paid";

  if (!force) {
    const { count } = await deps.db.order.updateMany({
      where: { id: orderId, confirmationSentAt: null },
      data: { confirmationSentAt: new Date() },
    });
    if (count === 0) return "already-sent";
  }

  const work = `${order.artwork.title}, ${order.artwork.yearLabel}`;
  const certificateUrl = `${deps.origin}/certificate/${order.certificateToken}`;
  const greeting = order.collectorName ? `Dear ${order.collectorName},` : "Dear collector,";

  try {
    await deps.send({
      to: order.email,
      subject: `Your acquisition: ${work}`,
      text: [
        greeting,
        "",
        `Thank you. ${work} by ${order.artwork.artist.name} is now in your collection.`,
        `Certificate of acquisition ${order.certificateNumber}: ${certificateUrl}`,
        "",
        "We will be in touch shortly to arrange delivery, which is included. If you have any questions, simply reply to this email.",
        "",
        site.name,
      ].join("\n"),
      html: emailLayout({
        heading: "Thank you",
        body: `<p>${escapeHtml(greeting)}</p>
<p><em>${escapeHtml(work)}</em> by ${escapeHtml(order.artwork.artist.name)} is now in your collection.</p>
<p>Your certificate of acquisition is number ${escapeHtml(order.certificateNumber ?? "")}. You can view and print it at any time.</p>
<p>We will be in touch shortly to arrange delivery, which is included. If you have any questions, simply reply to this email.</p>`,
        action: { label: "View your certificate", url: certificateUrl },
      }),
    });
    if (force) await deps.db.order.update({ where: { id: orderId }, data: { confirmationSentAt: new Date() } });
  } catch (error) {
    console.error(`Confirmation email for order ${orderId} failed:`, error);
    if (!force) await deps.db.order.update({ where: { id: orderId }, data: { confirmationSentAt: null } });
    return "failed";
  }

  if (!force) {
    await notifyGallery(deps, {
      subject: `Sold: ${work} — ${formatPrice(order.amountCents)}`,
      lines: [
        `${work} has been acquired by ${order.collectorName ?? "a collector"} (${order.email}) for ${formatPrice(order.amountCents)}.`,
        `Certificate ${order.certificateNumber}. Arrange delivery from the order page:`,
        `${deps.origin}/admin/orders/${order.id}`,
      ],
      action: { label: "Open the order", url: `${deps.origin}/admin/orders/${order.id}` },
    });
  }
  return "sent";
}

/** A payment arrived for a work that had already sold; it has been refunded. */
export async function sendConflictEmails(
  deps: { db: PrismaClient; send: SendEmail; origin: string; galleryEmails: string[] },
  orderId: string,
): Promise<void> {
  const order = await loadOrder(deps.db, orderId);
  if (!order) return;
  const work = `${order.artwork.title}, ${order.artwork.yearLabel}`;

  if (order.email) {
    try {
      await deps.send({
        to: order.email,
        subject: `About your acquisition of ${work}`,
        text: [
          order.collectorName ? `Dear ${order.collectorName},` : "Dear collector,",
          "",
          `We are very sorry: ${work} was acquired by another collector moments before your payment arrived.`,
          `Your payment of ${formatPrice(order.amountCents)} has been refunded in full; it usually reaches your card within 5–10 days.`,
          "",
          "If you would like to hear about similar works, simply reply to this email.",
          "",
          site.name,
        ].join("\n"),
        html: emailLayout({
          heading: "We are very sorry",
          body: `<p><em>${escapeHtml(work)}</em> was acquired by another collector moments before your payment arrived.</p>
<p>Your payment of ${escapeHtml(formatPrice(order.amountCents))} has been refunded in full; it usually reaches your card within 5–10 days.</p>
<p>If you would like to hear about similar works, simply reply to this email.</p>`,
        }),
      });
    } catch (error) {
      console.error(`Apology email for order ${orderId} failed:`, error);
    }
  }
  await notifyGallery(deps, {
    subject: `Refunded automatically: second payment for ${work}`,
    lines: [
      `A payment for ${work} arrived after the work had already sold. It has been refunded automatically.`,
      `${deps.origin}/admin/orders/${order.id}`,
    ],
    action: { label: "Open the order", url: `${deps.origin}/admin/orders/${order.id}` },
  });
}

async function notifyGallery(
  deps: { send: SendEmail; galleryEmails: string[] },
  message: { subject: string; lines: string[]; action: { label: string; url: string } },
) {
  for (const to of deps.galleryEmails) {
    try {
      await deps.send({
        to,
        subject: message.subject,
        text: message.lines.join("\n"),
        html: emailLayout({
          heading: escapeHtml(message.subject),
          body: message.lines
            .slice(0, -1)
            .map((line) => `<p>${escapeHtml(line)}</p>`)
            .join(""),
          action: message.action,
        }),
      });
    } catch (error) {
      console.error(`Gallery notification to ${to} failed:`, error);
    }
  }
}
