# Maison

A museum-style fine art gallery that sells unique paintings. The vision, design system and rules are in [CLAUDE.md](CLAUDE.md).

## Getting started

Requires Node 20.9+ (developed on Node 24) and Docker (for the local database).

```bash
npm install                              # also generates the Prisma client
cp .env.example .env.local               # then set BETTER_AUTH_SECRET and ADMIN_EMAILS
npm run db:up                            # Postgres 17 on :5433, stripe-mock on :12111
npm run db:migrate                       # create the tables
npm run db:seed                          # load the demonstration collection
npx playwright install chromium webkit   # for screenshots and e2e tests
npm run dev                              # http://localhost:3000
```

Open `/lab` in development to see the frame, mat, spotlight and placard components at every size and aspect ratio.

## The admin

Go to `/admin` and sign in with an address listed in `ADMIN_EMAILS`. Sign-in is by emailed link, and nobody else can sign in.

Without `RESEND_API_KEY` (development only), emails are not sent: each one is saved as an HTML file in `.dev-mail/`, and the sign-in link is also printed in the terminal running `npm run dev`. Without Cloudinary keys (development only), uploaded photographs are stored in `public/uploads/`.

What the admin can change: works, the artist's profile and portrait, exhibitions (including their hanging order), mediums, shipping details of paid orders, and enquiries. What it cannot change: whether a work is available, on hold or sold. Only checkout and a verified Stripe payment do that.

Public pages are generated from the database and kept until the catalogue changes. Every admin save refreshes them.

## Acquisitions (payments)

"Acquire this work" holds the work for that visitor (36 minutes) and opens a checkout (31 minutes). Only a verified Stripe webhook marks a work sold; a payment for a work that has already sold is refunded automatically. The collector gets a confirmation email and a printable certificate of acquisition; the gallery gets a notification, and the order appears under Admin → Orders.

**Without Stripe keys (development):** a local test checkout stands in for Stripe's page. Choosing "Complete test payment" sends a signed Stripe-format event to the real webhook, so the sale is recorded exactly as in production. No payment is taken, and this page does not exist in production.

**With Stripe in test mode:**

1. Put your test key in `.env.local`: `STRIPE_SECRET_KEY="sk_test_…"`.
2. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run `stripe listen --forward-to localhost:3000/api/webhooks/stripe --events checkout.session.completed,checkout.session.expired,charge.refunded`.
3. Copy the `whsec_…` secret it prints into `.env.local` as `STRIPE_WEBHOOK_SECRET`, and restart `npm run dev`.
4. Acquire a work and pay with the test card `4242 4242 4242 4242` (any future date, any CVC).

In production, add a webhook endpoint for `https://<your domain>/api/webhooks/stripe` in the Stripe Dashboard with those three events. `GET /api/cron/release-reservations` (protected by `CRON_SECRET`) releases holds whose expiry event never arrived; it is scheduled daily on Vercel.

**Against stripe-mock (tests):** [stripe-mock](https://github.com/stripe/stripe-mock) is Stripe's official mock of its API. It checks every request against Stripe's published API, so a misspelt parameter or an unsupported country fails a test, not a sale. `npm run db:up` starts it on port 12111, where `tests/integration/stripe-contract.test.ts` uses it. CI also runs the whole end-to-end suite with the server's Stripe client pointed at it (`STRIPE_API_BASE`, tests only), with the tests sending Stripe's signed webhooks.

## Deployment

Vercel (Frankfurt) with Neon Postgres. Every step is in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): accounts, environment variables, Stripe, Resend, Cloudinary, the domain, and the go-live checklist.

On every push, CI (`.github/workflows/ci.yml`) runs:

- lint, formatting and types;
- the Vitest suite, against Postgres and stripe-mock;
- a production build, tested end to end in Chromium at desktop and phone sizes.

## Pages, search and sharing

About, Visit (with an enquiry form), Shipping & returns, Terms of sale and Privacy are drafts. Their text is in `src/content/pages.ts`, and contact details are in `src/config/site.ts`. Items in [brackets] still need a decision: delivery times, import duties, the cost of return shipping, governing law, retention periods and the supervisory authority. Until a reviewer has read them, every page shows "Draft text, to be reviewed before launch". Set `pagesReviewed = true` to remove it.

Each page has a title, description and canonical URL. Each work has a link-preview image of the framed painting (`opengraph-image.tsx`) and `VisualArtwork` structured data. `/sitemap.xml` lists every public page, and `/robots.txt` keeps the admin, API, acquisition and certificate pages out of search. Security headers, including the Content Security Policy, are set in `next.config.ts`.

Accessibility is checked in `tests/e2e/accessibility.spec.ts`, which runs axe (WCAG 2.1 AA) on every public page, and in the keyboard walkthroughs in `tests/e2e/gallery.spec.ts`.

**Lighthouse results** (production build, mobile, real throttling), as of Phase 5:

| Page            | Performance | LCP   | CLS  |
| --------------- | ----------- | ----- | ---- |
| Entrance        | 95          | 2.3 s | 0    |
| Artwork         | 90          | 2.6 s | 0.05 |
| Visit           | 98          | 1.7 s | 0    |
| Collection wall | 81          | 2.9 s | 0    |

Accessibility, best practices and SEO score 100 on all four pages. The collection wall's main-thread time is spent styling sixteen lit frames. When running Lighthouse locally, put a proxy in front of the server that strips the `Cross-Origin-Opener-Policy` header. Otherwise Lighthouse cannot record the page load and reports `NO_NAVSTART`. Real visitors are not affected.

## Scripts

| Script                 | What it does                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Start the dev server                                                                                          |
| `npm run build`        | Production build (needs the database: public pages are prerendered from it)                                   |
| `npm run vercel-build` | What Vercel runs: database migrations, then the production build                                              |
| `npm run lint`         | ESLint                                                                                                        |
| `npm run format:check` | Prettier, without changing files (CI)                                                                         |
| `npm run typecheck`    | TypeScript, no emit                                                                                           |
| `npm test`             | Unit tests, plus integration tests against `maison_test` (emptied and re-seeded on every run) and stripe-mock |
| `npm run test:e2e`     | End-to-end tests: the gallery, acquisitions, the admin, accessibility, headers, sitemap, keyboard             |
| `npm run shots`        | Screenshots at 1440px and 390px in Chromium and WebKit into `./screenshots`                                   |
| `npm run db:up`        | Start the local Postgres (Docker)                                                                             |
| `npm run db:migrate`   | Apply migrations in development (and create new ones after a schema change)                                   |
| `npm run db:deploy`    | Apply migrations without prompts (production, CI)                                                             |
| `npm run db:seed`      | Load the demonstration collection. Safe to run again: existing records are left as they are                   |
| `npm run db:studio`    | Browse the database                                                                                           |
| `npm run seed:images`  | Re-download and prepare the public-domain seed paintings (`-- --force` to refresh)                            |

The e2e tests run against the dev server on port 3100 and change the development database, putting back what they change. To test a production build as CI does, set the environment from the `e2e` job in `.github/workflows/ci.yml` (with `PORT`, `SITE_URL` and `E2E_SERVER` on a free port), run `npm run build`, then `npm run test:e2e -- --project=desktop-chromium --project=mobile-chromium`.

## Seed images

The gallery shows one artist, its owner. Until the owner's own works are added, the demo collection is 16 public-domain (CC0) works by a single painter, Winslow Homer, from The Metropolitan Museum of Art's Open Access programme. Credits are recorded in `public/seed/images.json`. Demo prices are fictional. Before launch, remove the demo works (Admin → The artist → Remove the demonstration works), then enter the owner's profile.
