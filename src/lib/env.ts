import "server-only";
import { z } from "zod";

/*
 * Server environment, validated once. Secrets live only in environment
 * variables (.env.local in development, the host's settings in production).
 *
 * Email (Resend), images (Cloudinary) and payments (Stripe) are optional in
 * development, with local fallbacks, and required in production.
 */

/**
 * LOCAL_PRODUCTION_TEST=1 lets a production build run on a laptop or in CI
 * without Resend or Cloudinary (the development fallbacks stay on, and sign-in
 * is not rate limited), so it can be tested end to end. It is ignored on
 * Vercel's production deployment.
 */
const localProductionTest = process.env.LOCAL_PRODUCTION_TEST === "1" && process.env.VERCEL_ENV !== "production";

const optional = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    SITE_URL: z.url().default("http://localhost:3000"),
    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    ADMIN_EMAILS: z
      .string()
      .default("")
      .transform((value) =>
        value
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
    RESEND_API_KEY: optional,
    EMAIL_FROM: z.string().default("Maison <gallery@example.com>"),
    CLOUDINARY_CLOUD_NAME: optional,
    CLOUDINARY_API_KEY: optional,
    CLOUDINARY_API_SECRET: optional,
    CLOUDINARY_FOLDER: z.string().default("maison"),
    STRIPE_SECRET_KEY: optional,
    STRIPE_WEBHOOK_SECRET: optional,
    /** Tests only: send Stripe API calls to stripe-mock (e.g. http://localhost:12111). Refused in production. */
    STRIPE_API_BASE: z
      .url()
      .optional()
      .or(z.literal("").transform(() => undefined)),
    /** Protects the scheduled clean-up of lapsed holds. */
    CRON_SECRET: optional,
    /** Where sale notifications go; defaults to the admin addresses. */
    GALLERY_EMAIL: optional,
  })
  .superRefine((env, ctx) => {
    // The build prerenders pages (it needs only the database); the running
    // production server needs everything — except in a local test of a
    // production build (see `localFallbacks` below).
    if (env.NODE_ENV !== "production" || process.env.NEXT_PHASE === "phase-production-build") return;
    if (localProductionTest) return;
    if (env.STRIPE_API_BASE) {
      ctx.addIssue({ code: "custom", path: ["STRIPE_API_BASE"], message: "STRIPE_API_BASE is for tests only" });
    }
    const required = [
      "RESEND_API_KEY",
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "CRON_SECRET",
    ] as const;
    for (const key of required) {
      if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: `${key} is required in production` });
    }
    if (env.ADMIN_EMAILS.length === 0) {
      ctx.addIssue({ code: "custom", path: ["ADMIN_EMAILS"], message: "ADMIN_EMAILS is required in production" });
    }
  });

/**
 * A Vercel preview deployment is its own site: sign-in links, Stripe's return
 * addresses and canonical URLs point at the preview, never at production.
 * (VERCEL_BRANCH_URL stays the same across a branch's deployments.)
 */
const previewHost = process.env.VERCEL_ENV === "preview" && (process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL);

/** A Vercel preview deployment (kept out of search engines). */
export const isPreview = Boolean(previewHost);

function load() {
  const source = previewHost ? { ...process.env, SITE_URL: `https://${previewHost}` } : process.env;
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}\nSee .env.example.`);
  }
  return parsed.data;
}

export const env = load();

export const cloudinaryConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);

export const emailConfigured = Boolean(env.RESEND_API_KEY);

/**
 * Whether development fallbacks may be used when a service is not configured
 * (sign-in links to .dev-mail, uploads to public/uploads): in development, and
 * in a local test of a production build. Never on the live site.
 */
export const localFallbacks = env.NODE_ENV !== "production" || localProductionTest;

/** Sign-in rate limits apply on every real production server. */
export const rateLimited = env.NODE_ENV === "production" && !localProductionTest;

export const stripeConfigured = Boolean(env.STRIPE_SECRET_KEY);

/** Live payments: real money changes hands (demonstration works are refused). */
export const liveStripe = Boolean(env.STRIPE_SECRET_KEY?.startsWith("sk_live_"));

/**
 * Webhook signing secret. Without Stripe in development, the local test
 * checkout signs its events with this fixed secret, so the webhook still
 * verifies every signature exactly as in production.
 */
export const webhookSecret = env.STRIPE_WEBHOOK_SECRET ?? (localFallbacks ? "whsec_local_development_only" : undefined);

/** Recipients of sale notifications. */
export const galleryEmails = env.GALLERY_EMAIL ? [env.GALLERY_EMAIL] : env.ADMIN_EMAILS;
