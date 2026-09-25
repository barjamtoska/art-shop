import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

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
    url: env("DATABASE_URL"),
  },
});
