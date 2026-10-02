import { afterAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { cleanupTestRecords, makeArtwork, makeOrder } from "./helpers";

/* The daily backstop that releases holds whose expiry event never arrived. Vercel Cron calls it with the secret. */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// Before any import reads the environment.
const previous = vi.hoisted(() => {
  const value = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "cron-test-secret";
  return value;
});

const { GET } = await import("@/app/api/cron/release-reservations/route");

afterAll(async () => {
  if (previous === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = previous;
  await cleanupTestRecords();
});

const call = (authorization?: string) =>
  GET(
    new Request("http://localhost/api/cron/release-reservations", {
      headers: authorization ? { authorization } : {},
    }),
  );

async function lapsedHold() {
  const work = await makeArtwork();
  const past = new Date(Date.now() - 60_000);
  const order = await makeOrder(work.id, { reservationExpiresAt: past });
  await db.artwork.update({
    where: { id: work.id },
    data: { status: "RESERVED", reservedUntil: past, reservedOrderId: order.id },
  });
  return { work, order };
}

describe("GET /api/cron/release-reservations", () => {
  it("refuses callers without the secret, and changes nothing", async () => {
    const { work } = await lapsedHold();
    expect((await call()).status).toBe(401);
    expect((await call("Bearer guess")).status).toBe(401);
    expect((await db.artwork.findUniqueOrThrow({ where: { id: work.id } })).status).toBe("RESERVED");
  });

  it("with the secret, releases lapsed holds and closes their orders", async () => {
    const { work, order } = await lapsedHold();
    const response = await call("Bearer cron-test-secret");
    expect(response.status).toBe(200);
    expect((await response.json()).released).toBeGreaterThanOrEqual(1);
    expect((await db.artwork.findUniqueOrThrow({ where: { id: work.id } })).status).toBe("AVAILABLE");
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("EXPIRED");
  });

  it("leaves a hold that is still running", async () => {
    const work = await makeArtwork();
    const order = await makeOrder(work.id);
    const later = new Date(Date.now() + 30 * 60_000);
    await db.artwork.update({
      where: { id: work.id },
      data: { status: "RESERVED", reservedUntil: later, reservedOrderId: order.id },
    });
    await call("Bearer cron-test-secret");
    expect((await db.artwork.findUniqueOrThrow({ where: { id: work.id } })).status).toBe("RESERVED");
  });
});
