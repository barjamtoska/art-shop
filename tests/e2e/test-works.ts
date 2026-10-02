import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { Client } from "pg";

/*
 * Throwaway works in the development database, for tests that acquire them.
 * Their slugs start with PREFIX; removeTestWorks deletes them and their orders.
 */

config({ path: ".env.local", quiet: true });
export const PREFIX = "test-acquisition-";

async function withDb<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

/** A work on view, available, by the gallery's artist. */
export async function makeWork(): Promise<{ slug: string; title: string }> {
  const tag = randomUUID().slice(0, 8);
  const slug = `${PREFIX}${tag}`;
  const title = `Test Acquisition ${tag}`;
  await withDb(async (client) => {
    const id = `tst${tag}`;
    await client.query(
      `insert into "Artwork" (id, slug, title, "artistId", "mediumId", "mediumDescription", "yearLabel", "heightMm", "widthMm",
         "priceCents", published, position, "updatedAt")
       select $1, $2, $3, (select id from "Artist" limit 1), (select id from "Medium" where slug = 'oil'), 'Oil on canvas',
         '2026', 500, 400, 1250000, true, 999999, now()`,
      [id, slug, title],
    );
    await client.query(
      `insert into "ArtworkImage" (id, "artworkId", kind, storage, key, width, height, alt)
       values ($1, $2, 'PRIMARY', 'LOCAL', '/seed/maine-coast.jpg', 2384, 1611, 'A test painting for the acquisition tests.')`,
      [`img${tag}`, id],
    );
  });
  return { slug, title };
}

/** The order most recently opened for a work: its id, amount and checkout session. */
export async function latestOrder(slug: string) {
  return withDb(async (client) => {
    const { rows } = await client.query<{ id: string; amountCents: number; currency: string; stripeSessionId: string }>(
      `select o.id, o."amountCents", o.currency, o."stripeSessionId" from "Order" o
       join "Artwork" a on a.id = o."artworkId" where a.slug = $1 order by o."createdAt" desc limit 1`,
      [slug],
    );
    if (!rows[0]) throw new Error(`No order for ${slug}`);
    return rows[0];
  });
}

export async function removeTestWorks() {
  await withDb(async (client) => {
    const where = `"artworkId" in (select id from "Artwork" where slug like '${PREFIX}%')`;
    await client.query(`update "Artwork" set "reservedOrderId" = null, "reservedUntil" = null, status = 'AVAILABLE', "soldAt" = null
      where slug like '${PREFIX}%'`);
    await client.query(`delete from "Order" where ${where}`);
    await client.query(`delete from "Artwork" where slug like '${PREFIX}%'`);
  });
}

/** Removes only the given test works (safe while other test runs are in progress). */
export async function removeWorks(slugs: string[]) {
  if (slugs.length === 0) return;
  await withDb(async (client) => {
    const ids = `(select id from "Artwork" where slug = any($1))`;
    await client.query(
      `update "Artwork" set "reservedOrderId" = null, "reservedUntil" = null, status = 'AVAILABLE', "soldAt" = null
       where id in ${ids}`,
      [slugs],
    );
    await client.query(`delete from "Order" where "artworkId" in ${ids}`, [slugs]);
    await client.query(`delete from "Artwork" where id in ${ids}`, [slugs]);
  });
}
