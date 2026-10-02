import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { localCheckoutAvailable } from "@/lib/payments/gateway";

export const metadata: Metadata = { title: "Test checkout", robots: { index: false, follow: false } };

const field = "block w-full border border-gold/30 bg-wall-deep/70 px-3 py-2 text-ivory focus-visible:border-gold";

/**
 * Stands in for Stripe's checkout page in development without Stripe keys.
 * No payment is taken: the buttons send signed test events to the webhook.
 * Unavailable whenever Stripe is configured, and never on the live site.
 */
export default async function TestCheckoutPage({ searchParams }: PageProps<"/acquisition/test-checkout">) {
  const { session_id: sessionId } = await searchParams;
  if (!localCheckoutAvailable()) notFound();
  if (typeof sessionId !== "string") notFound();
  const order = await db.order.findUnique({
    where: { stripeSessionId: sessionId },
    select: {
      status: true,
      amountCents: true,
      reservationExpiresAt: true,
      artwork: { select: { title: true, yearLabel: true } },
    },
  });
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <p className="border border-notice/50 px-4 py-3 text-sm text-notice">
        Test checkout — development only. Stripe is not configured, so this page stands in for Stripe’s. No payment is
        taken; choosing an option sends a signed test event to the site’s webhook, exactly as Stripe would.
      </p>
      <h1 className="mt-10 text-4xl">
        <cite>{order.artwork.title}</cite>, {order.artwork.yearLabel}
      </h1>
      <p className="mt-2 text-2xl text-ivory">{formatPrice(order.amountCents)}</p>

      {order.status !== "PENDING" ? (
        <p className="mt-8 text-ivory-muted">This checkout has ended ({order.status.toLowerCase()}).</p>
      ) : (
        <form method="post" action="/api/acquisition/test-checkout" className="mt-10 space-y-5">
          <input type="hidden" name="session_id" value={sessionId} />
          <fieldset className="space-y-4 border border-gold/15 p-5">
            <legend className="px-2 font-caps text-label tracking-caps text-ivory-muted">
              Collector (test details)
            </legend>
            {[
              ["name", "Name", "Ada Collector"],
              ["email", "Email", "collector@example.com"],
              ["phone", "Phone", "+353 1 555 0100"],
              ["line1", "Address", "1 Harbour Road"],
              ["line2", "Address (line 2)", ""],
              ["postal_code", "Postcode", "D02 X285"],
              ["city", "City", "Dublin"],
              ["country", "Country code", "IE"],
            ].map(([name, label, value]) => (
              <label key={name} className="block text-sm text-ivory">
                {label}
                <input name={name} defaultValue={value} className={`mt-1 ${field}`} />
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap gap-4">
            <button name="choice" value="pay" className="border border-gold/60 px-5 py-2 text-ivory hover:bg-gold/10">
              Complete test payment
            </button>
            <button name="choice" value="cancel" className="border border-gold/30 px-5 py-2 text-ivory-muted">
              Cancel (back to the gallery)
            </button>
            <button name="choice" value="expire" className="border border-gold/30 px-5 py-2 text-ivory-muted">
              Let the session expire
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
