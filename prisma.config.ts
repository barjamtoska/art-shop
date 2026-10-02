import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma CLI does not read .env files itself. Next.js uses .env.local, so load
// that first (it wins), then .env for anything else.
config({ path: ".env.local", quiet: true });
config({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations need a direct connection. On Neon, DATABASE_URL goes through
    // the connection pooler (right for the app) and DATABASE_URL_UNPOOLED does not.
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "",
  },
});
