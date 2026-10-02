import { site } from "@/config/site";

/**
 * Text of the gallery's supporting pages: About, Visit, Shipping & returns,
 * Terms of sale and Privacy.
 *
 * DRAFTS. Written to be close to right for an EU gallery selling unique works
 * online, but they are not legal advice: have the terms and privacy notice
 * reviewed, fill in every [bracketed] item, then set `reviewed: true`. Until
 * then each page shows a discreet "draft" notice.
 */
export const pagesReviewed = false;

export type Section = { heading?: string; paragraphs: string[] };
export type TextPage = { title: string; intro: string; description: string; sections: Section[] };

const { contact } = site;

export const about: TextPage = {
  title: "About",
  intro: "A gallery for one painter’s work, hung and lit as it would be in a museum at night.",
  description: `About ${site.name}: a private gallery showing and selling the work of one artist.`,
  sections: [
    {
      paragraphs: [
        `${site.name} is the gallery of a single artist. Every work here is an original, made by hand and offered once; when a painting finds its collector, it stays on the wall with a quiet note that it is now in a private collection.`,
        "We built the gallery to be looked at slowly. There are no offers, no countdowns and nothing to scroll past: just the paintings, their stories, and enough space around each one to see it properly.",
      ],
    },
    {
      heading: "Acquiring a work",
      paragraphs: [
        "Each work’s price includes VAT and insured delivery anywhere we ship. When you choose to acquire a painting, it is held for you while you complete payment, so no one else can buy it in the meantime. You receive a numbered certificate of acquisition.",
        "If you would like to see a work in person, ask about framing, or discuss a commission, we are always glad to hear from you.",
      ],
    },
  ],
};

export const visit: TextPage = {
  title: "Visit",
  intro: "Viewings are by appointment, so that you can spend as long as you like with the work.",
  description: `Visit ${site.name}, or send an enquiry about a work.`,
  sections: [
    {
      paragraphs: [
        "Tell us which works you would like to see and when suits you, and we will arrange a time. If you cannot visit, we can send further photographs, details of the frame, or a short video of a painting in daylight.",
      ],
    },
  ],
};

export const shipping: TextPage = {
  title: "Shipping & returns",
  intro: "Delivery is included in every price, insured, to almost every country.",
  description: `How ${site.name} packs, ships and insures works, and how returns work.`,
  sections: [
    {
      heading: "Delivery",
      paragraphs: [
        "Every work is wrapped, crated where needed, and sent by a specialist fine-art courier, insured for its full value until it reaches you. We will contact you after your acquisition to agree a delivery date.",
        "Most deliveries arrive within [two to four] weeks. Works shipped outside the European Union may be subject to import duties and taxes in the destination country, which are the collector’s responsibility. [Confirm: who pays import duties.]",
        "For legal reasons we cannot ship works of art to Russia or Belarus.",
      ],
    },
    {
      heading: "Your right to change your mind",
      paragraphs: [
        "If you live in the European Union and buy from us online, you may cancel your purchase within 14 days of receiving the work, without giving a reason. To do so, tell us clearly — by email to " +
          `${contact.email} is simplest — before the 14 days have passed.`,
        "You then have a further 14 days to return the work to us, in the condition you received it and in its original packaging. [Confirm: whether the gallery or the collector pays for insured return shipping; we can arrange the courier either way.]",
        "We refund the full price, including the original delivery cost, within 14 days of your cancellation, using the same payment method. We may wait to refund until the work has arrived back with us.",
      ],
    },
    {
      heading: "If something is wrong",
      paragraphs: [
        "If a work arrives damaged, please photograph the packaging and the work before unpacking further, and contact us within 48 hours. The work is insured in transit, and we will arrange its repair, return or a full refund.",
      ],
    },
  ],
};

export const terms: TextPage = {
  title: "Terms of sale",
  intro: "The terms on which the gallery sells its works online.",
  description: `${site.name}’s terms of sale.`,
  sections: [
    {
      heading: "Who we are",
      paragraphs: [
        `Works on this site are sold by ${contact.legalName}, ${contact.address.join(", ")} (${contact.registration}). Contact: ${contact.email}, ${contact.phone}.`,
      ],
    },
    {
      heading: "The works",
      paragraphs: [
        "Every work is unique. We describe and photograph each one as accurately as we can; colours on a screen can differ slightly from the painting itself. Dimensions are of the work unless stated otherwise.",
        "Prices are in euros and include VAT and insured delivery. The price shown when you acquire a work is the price you pay.",
      ],
    },
    {
      heading: "How a purchase is made",
      paragraphs: [
        "When you choose “Acquire this work”, the work is held for you for about 30 minutes while you pay. Payment is taken by Stripe; we never see or store your card details. The contract is formed when your payment is confirmed, and we send you a confirmation by email together with your certificate of acquisition.",
        "In the rare case that a payment reaches us for a work that has just been sold to someone else, we refund that payment in full at once.",
      ],
    },
    {
      heading: "Delivery, risk and ownership",
      paragraphs: [
        "We deliver as described in Shipping & returns. The work is at our risk until it is delivered to you; ownership passes to you on payment.",
        "Copyright in each work remains with the artist. Owning a work does not include the right to reproduce it, other than for private, non-commercial purposes.",
      ],
    },
    {
      heading: "Cancellation",
      paragraphs: [
        "Consumers in the European Union may cancel within 14 days of receiving the work, as set out in Shipping & returns. This does not affect your statutory rights.",
      ],
    },
    {
      heading: "Law",
      paragraphs: [
        "These terms are governed by the law of [country]. If you are a consumer, you also keep the protection of the mandatory laws of the country where you live. The European Commission’s online dispute resolution platform is at ec.europa.eu/consumers/odr.",
      ],
    },
  ],
};

export const privacy: TextPage = {
  title: "Privacy",
  intro: "What we collect, why, and what you can ask us to do with it.",
  description: `How ${site.name} handles personal information.`,
  sections: [
    {
      heading: "Who is responsible",
      paragraphs: [
        `${contact.legalName}, ${contact.address.join(", ")}, is responsible for your personal data. Contact us at ${contact.email} about anything in this notice.`,
      ],
    },
    {
      heading: "What we collect",
      paragraphs: [
        "When you acquire a work: your name, email address, phone number and delivery address, so that we can complete the sale, deliver the work and issue your certificate. Your payment is handled by Stripe; we receive confirmation of payment, never your card details.",
        "When you send an enquiry: your name, email address and message, so that we can reply.",
        "To prevent abuse, we keep a scrambled (hashed) form of your IP address with an acquisition hold or an enquiry; it cannot be read back as the address.",
        "We do not use advertising or analytics cookies. The only cookie is the one that keeps the gallery’s own staff signed in to the administration area.",
      ],
    },
    {
      heading: "Who processes it for us",
      paragraphs: [
        "Stripe (payments), Resend (email), Vercel (hosting), Neon (database) and Cloudinary (images). Each processes data only on our instructions. Some are based outside the EU and transfer data under the European Commission’s standard contractual clauses or an adequacy decision.",
      ],
    },
    {
      heading: "How long we keep it",
      paragraphs: [
        "Records of sales are kept for as long as tax and accounting law requires, normally [six to ten] years. Enquiries are deleted after [two] years unless they lead to a sale.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        "You may ask to see, correct or delete your data, to restrict or object to its use, or to receive a copy of it. Write to us at the address above. You can also complain to the data protection authority, [name of the supervisory authority].",
      ],
    },
  ],
};

export const textPages = { about, shipping, terms, privacy } as const;
