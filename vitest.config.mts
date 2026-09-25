import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Same env files as Next.js and the Prisma CLI: .env.local first, then .env.
config({ path: ".env.local", quiet: true });
config({ quiet: true });

const alias = {
  "@": path.resolve(import.meta.dirname, "src"),
  "server-only": path.resolve(import.meta.dirname, "tests/stubs/empty.ts"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    environment: "node",
    projects: [
      {
        resolve: { alias },
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"] },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          // Resets and seeds the test database (never the development one) first.
          globalSetup: ["tests/integration/global-setup.ts"],
          env: {
            DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
            BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "test-secret-test-secret-test-secret-00",
          },
          // One database: test files run one after another.
          fileParallelism: false,
        },
      },
    ],
  },
});
