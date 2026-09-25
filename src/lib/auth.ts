import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { site } from "@/config/site";
import { db } from "./db";
import { emailLayout, sendEmail } from "./email";
import { env, rateLimited } from "./env";

/*
 * Admin sign-in only: an emailed magic link, for addresses in ADMIN_EMAILS.
 * Customers never sign in (they check out as guests).
 *
 * Three locks keep everyone else out:
 * 1. No link is ever sent to an address outside the allowlist (silently, so
 *    the form does not reveal who is an admin).
 * 2. No user record can be created for such an address.
 * 3. Every admin page and server action re-checks the allowlist on each
 *    request (src/lib/admin.ts), so removing an address revokes access.
 */

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email) && env.ADMIN_EMAILS.includes(email!.trim().toLowerCase());
}

export const MAGIC_LINK_MINUTES = 15;

export const auth = betterAuth({
  appName: site.name,
  // Production links always point at SITE_URL, so a forged Host header can
  // never send a sign-in link elsewhere. In development, any local port works.
  baseURL:
    env.NODE_ENV === "production"
      ? env.SITE_URL
      : { allowedHosts: ["localhost:*", "127.0.0.1:*"], fallback: env.SITE_URL },
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // a week
    updateAge: 60 * 60 * 24, // extended daily while in use
  },
  rateLimit: {
    enabled: rateLimited,
    // Shared across serverless instances, unlike the in-memory default.
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/magic-link": { window: 15 * 60, max: 5 },
      "/magic-link/verify": { window: 60, max: 10 },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => (isAdminEmail(user.email) ? { data: user } : false),
      },
    },
  },
  plugins: [
    magicLink({
      expiresIn: MAGIC_LINK_MINUTES * 60,
      storeToken: "hashed",
      sendMagicLink: async ({ email, url }) => {
        if (!isAdminEmail(email)) {
          console.warn(`Sign-in requested for a non-admin address; no link sent.`);
          return;
        }
        await sendEmail({
          to: email,
          subject: `Your sign-in link for ${site.name}`,
          text: `Sign in to the ${site.name} admin:\n${url}\n\nThe link works once and expires in ${MAGIC_LINK_MINUTES} minutes. If you did not ask for it, ignore this email.`,
          html: emailLayout({
            heading: "Your sign-in link",
            body: `<p>Use the link below to sign in to the ${site.name} admin. It works once and expires in ${MAGIC_LINK_MINUTES} minutes.</p><p>If you did not ask for it, you can ignore this email.</p>`,
            action: { label: "Sign in", url },
          }),
        });
      },
    }),
    // Lets server actions set the session cookie. Must be the last plugin.
    nextCookies(),
  ],
});
