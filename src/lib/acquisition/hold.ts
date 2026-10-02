import "server-only";
import { randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

/*
 * Holds: while a collector is in checkout, the work is theirs alone.
 *
 * One conditional UPDATE decides who gets the hold — "set RESERVED where the
 * work is available, or its hold has lapsed". Postgres re-checks that
 * condition after any concurrent update commits, so of any number of
 * simultaneous attempts exactly one succeeds. Nothing here marks a work sold.
 */

/** The Stripe session lasts 31 minutes (Stripe's minimum is 30). */
export const SESSION_MINUTES = 31;
/** The hold outlives the session by five minutes, so a payable session never outlives its hold. */
export const HOLD_MINUTES = SESSION_MINUTES + 5;
/** How many works one visitor may hold at once. */
export const MAX_HOLDS_PER_VISITOR = 2;

export type HoldRefusal = "not-found" | "sold" | "reserved" | "demo" | "too-many-holds";

export type Held = {
  ok: true;
  order: { id: string; amountCents: number; currency: string; certificateToken: string };
  artwork: {
    id: string;
    slug: string;
    title: string;
    yearLabel: string;
    mediumDescription: string;
    artistName: string;
    imageKey: { storage: "LOCAL" | "CLOUDINARY"; key: string } | null;
  };
};

export type HoldResult = Held | { ok: false; reason: HoldRefusal };

class Refused extends Error {
  constructor(readonly reason: HoldRefusal) {
    super(reason);
  }
}

/** Places a hold for a new order, or explains why it cannot. */
export async function holdWork(
  db: PrismaClient,
  input: { slug: string; clientIpHash: string | null; liveMode: boolean; now?: Date },
): Promise<HoldResult> {
  const now = input.now ?? new Date();
  const holdUntil = new Date(now.getTime() + HOLD_MINUTES * 60_000);

  const artwork = await db.artwork.findFirst({
    where: { slug: input.slug, published: true },
    select: {
      id: true,
      slug: true,
      title: true,
      yearLabel: true,
      mediumDescription: true,
      priceCents: true,
      status: true,
      isDemo: true,
      artist: { select: { name: true } },
      images: { where: { kind: "PRIMARY" }, take: 1, select: { storage: true, key: true } },
    },
  });
  if (!artwork) return { ok: false, reason: "not-found" };
  if (artwork.status === "SOLD") return { ok: false, reason: "sold" };
  // Demonstration works (public-domain paintings) are never sold for real money.
  if (artwork.isDemo && input.liveMode) return { ok: false, reason: "demo" };

  if (input.clientIpHash) {
    const holds = await db.order.count({
      where: { clientIpHash: input.clientIpHash, status: "PENDING", reservationExpiresAt: { gt: now } },
    });
    if (holds >= MAX_HOLDS_PER_VISITOR) return { ok: false, reason: "too-many-holds" };
  }

  try {
    const order = await db.$transaction(
      async (tx) => {
        const created = await tx.order.create({
          data: {
            artworkId: artwork.id,
            amountCents: artwork.priceCents, // always the price on record, never the browser's
            currency: "eur",
            reservationExpiresAt: holdUntil,
            certificateToken: randomBytes(32).toString("base64url"),
            clientIpHash: input.clientIpHash,
          },
          select: { id: true, amountCents: true, currency: true, certificateToken: true },
        });

        const { count } = await tx.artwork.updateMany({
          where: {
            id: artwork.id,
            published: true,
            OR: [{ status: "AVAILABLE" }, { status: "RESERVED", reservedUntil: { lt: now } }],
          },
          data: { status: "RESERVED", reservedUntil: holdUntil, reservedOrderId: created.id },
        });
        if (count === 0) {
          const current = await tx.artwork.findUnique({ where: { id: artwork.id }, select: { status: true } });
          throw new Refused(current?.status === "SOLD" ? "sold" : "reserved");
        }

        // A lapsed hold's order is closed now that someone else holds the work.
        await tx.order.updateMany({
          where: {
            artworkId: artwork.id,
            status: "PENDING",
            id: { not: created.id },
            reservationExpiresAt: { lt: now },
          },
          data: { status: "EXPIRED", closedAt: now },
        });
        return created;
      },
      { maxWait: 10_000, timeout: 20_000 },
    );

    return {
      ok: true,
      order,
      artwork: {
        id: artwork.id,
        slug: artwork.slug,
        title: artwork.title,
        yearLabel: artwork.yearLabel,
        mediumDescription: artwork.mediumDescription,
        artistName: artwork.artist.name,
        imageKey: artwork.images[0] ?? null,
      },
    };
  } catch (error) {
    if (error instanceof Refused) return { ok: false, reason: error.reason };
    throw error;
  }
}

/**
 * Ends a hold that will not become a sale: the order closes with `status`,
 * and the work becomes available again if this order still holds it.
 * Returns whether the work was released. Never touches a paid order or a sold work.
 */
export async function releaseHold(
  db: PrismaClient | Prisma.TransactionClient,
  orderId: string,
  status: "EXPIRED" | "CANCELLED",
  now = new Date(),
): Promise<boolean> {
  await db.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status, closedAt: now } });
  const { count } = await db.artwork.updateMany({
    where: { reservedOrderId: orderId, status: "RESERVED" },
    data: { status: "AVAILABLE", reservedUntil: null, reservedOrderId: null },
  });
  return count > 0;
}

/**
 * Backstop for holds whose expiry event never arrived: releases every lapsed
 * hold and closes its order. Returns how many works became available again.
 */
export async function releaseLapsedHolds(db: PrismaClient, now = new Date()): Promise<number> {
  const lapsed = await db.order.findMany({
    where: { status: "PENDING", reservationExpiresAt: { lt: now } },
    select: { id: true },
  });
  let released = 0;
  for (const { id } of lapsed) if (await releaseHold(db, id, "EXPIRED", now)) released++;
  // A hold can also outlive a closed order (e.g. a failed release): free it too.
  const { count } = await db.artwork.updateMany({
    where: { status: "RESERVED", reservedUntil: { lt: now } },
    data: { status: "AVAILABLE", reservedUntil: null, reservedOrderId: null },
  });
  return released + count;
}
