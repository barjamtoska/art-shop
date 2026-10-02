import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import type { Email } from "@/lib/email";
import { cleanupTestRecords, makeArtwork } from "./helpers";

/* The enquiry form on Visit: validation, the bot trap, the hourly limit, and the gallery's notification. */

const visitor = vi.hoisted(() => ({ ip: "198.51.100.1" }));
const outbox = vi.hoisted(() => ({ sent: [] as Email[], fail: false }));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "gallery.example", "x-forwarded-for": visitor.ip }),
}));
vi.mock("@/lib/email", async (original) => ({
  ...(await original<typeof import("@/lib/email")>()),
  sendEmail: async (email: Email) => {
    if (outbox.fail) throw new Error("Mail is down");
    outbox.sent.push(email);
  },
}));

const { sendEnquiry } = await import("@/app/(gallery)/visit/actions");

const EMAIL_DOMAIN = "enquiry.test";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

const valid = () => ({
  name: "Ada Collector",
  email: `ada-${randomUUID().slice(0, 8)}@${EMAIL_DOMAIN}`,
  message: "Could I see this painting in daylight next week?",
});

const saved = (email: string) => db.enquiry.findMany({ where: { email } });

beforeEach(() => {
  visitor.ip = `198.51.100.${Math.floor(Math.random() * 250) + 1}-${randomUUID()}`;
  outbox.sent.length = 0;
  outbox.fail = false;
});

afterAll(async () => {
  await db.enquiry.deleteMany({ where: { email: { endsWith: `@${EMAIL_DOMAIN}` } } });
  await cleanupTestRecords();
});

describe("sendEnquiry", () => {
  it("saves the enquiry, linked to the work it is about, and tells the gallery", async () => {
    const work = await makeArtwork();
    const fields = { ...valid(), work: work.slug };
    expect(await sendEnquiry({ status: "idle" }, form(fields))).toEqual({ status: "sent" });

    const [enquiry] = await saved(fields.email);
    expect(enquiry).toMatchObject({ name: "Ada Collector", artworkId: work.id });
    expect(enquiry.clientIpHash).not.toContain("198.51.100"); // only a keyed hash is kept
    expect(outbox.sent.length).toBeGreaterThan(0);
    expect(outbox.sent[0].subject).toBe(`Enquiry from Ada Collector about ${work.title}`);
  });

  it("escapes what visitors write before it goes into the email", async () => {
    const fields = { ...valid(), name: "<script>alert(1)</script>" };
    await sendEnquiry({ status: "idle" }, form(fields));
    expect(outbox.sent[0].html).not.toContain("<script>");
    expect(outbox.sent[0].html).toContain("&lt;script&gt;");
  });

  it("points out each field that needs attention, and saves nothing", async () => {
    const fields = { name: " ", email: `not-an-email@`, message: "Hi" };
    const result = await sendEnquiry({ status: "idle" }, form(fields));
    expect(result.status).toBe("error");
    expect(Object.keys(result.fieldErrors ?? {}).sort()).toEqual(["email", "message", "name"]);
    expect(await saved(fields.email)).toHaveLength(0);
  });

  it("quietly ignores a bot that fills the hidden field", async () => {
    const fields = { ...valid(), website: "https://spam.example" };
    expect(await sendEnquiry({ status: "idle" }, form(fields))).toEqual({ status: "sent" });
    expect(await saved(fields.email)).toHaveLength(0);
    expect(outbox.sent).toHaveLength(0);
  });

  it("accepts five enquiries an hour from one visitor, then asks them to write instead", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await sendEnquiry({ status: "idle" }, form(valid()))).status).toBe("sent");
    }
    const sixth = valid();
    const result = await sendEnquiry({ status: "idle" }, form(sixth));
    expect(result.status).toBe("error");
    expect(result.message).toMatch(/Please write to/);
    expect(await saved(sixth.email)).toHaveLength(0);
  });

  it("keeps the enquiry when the notification cannot be sent", async () => {
    outbox.fail = true;
    const fields = valid();
    expect(await sendEnquiry({ status: "idle" }, form(fields))).toEqual({ status: "sent" });
    expect(await saved(fields.email)).toHaveLength(1);
  });
});
