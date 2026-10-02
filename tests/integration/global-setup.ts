import { execFileSync } from "node:child_process";
import { Client } from "pg";

/**
 * Before the integration tests: bring the test database's schema up to date,
 * empty its tables and load the demonstration collection.
 *
 * Guarded so it can never touch the development or production database: the
 * database's name must end in "_test".
 */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set (see .env.example). Start it with `docker compose up -d`.");
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith("_test") || url === process.env.DATABASE_URL) {
    throw new Error(`Refusing to empty "${name}": the test database's name must end in _test.`);
  }

  // Both: prisma.config.ts prefers DATABASE_URL_UNPOOLED when it is set.
  const env = { ...process.env, DATABASE_URL: url, DATABASE_URL_UNPOOLED: url };
  const prisma = (args: string[]) =>
    execFileSync(process.execPath, ["node_modules/prisma/build/index.js", ...args], { env, stdio: "pipe" });

  prisma(["migrate", "deploy"]);

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(
      `select tablename from pg_tables where schemaname = 'public' and tablename <> '_prisma_migrations'`,
    );
    if (rows.length > 0) {
      const tables = rows.map((r) => `"public"."${r.tablename}"`).join(", ");
      await client.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
    }
    await client.query(`ALTER SEQUENCE IF EXISTS certificate_number_seq RESTART WITH 1`);
  } finally {
    await client.end();
  }

  prisma(["db", "seed"]);
}
