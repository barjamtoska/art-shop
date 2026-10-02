import "server-only";
import { createHmac } from "node:crypto";
import { refreshCatalogue } from "@/lib/catalog/refresh";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { env, galleryEmails, localFallbacks } from "@/lib/env";
import { paymentGateway } from "@/lib/payments/gateway";
import type { WebhookDeps } from "./webhook";

/** The real dependencies of the acquisition flow (tests pass their own). */
export function acquisitionDeps(origin: string): WebhookDeps {
  return { db, gateway: paymentGateway(), send: sendEmail, origin, galleryEmails, refresh: refreshCatalogue };
}

/**
 * The site's public address for links (checkout return URLs, emails). In
 * production always SITE_URL — never a request header someone could forge;
 * in development, wherever the site is being served.
 */
export function siteOrigin(headers: Headers): string {
  if (!localFallbacks) return env.SITE_URL;
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) return env.SITE_URL;
  const protocol =
    headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${protocol}://${host}`;
}

/** A keyed hash of the visitor's IP address: enough to limit holds per visitor, without storing the address. */
export function clientIpHash(headers: Headers): string | null {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip");
  if (!ip) return null;
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(`ip:${ip}`).digest("base64url");
}
