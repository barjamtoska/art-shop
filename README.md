# Maison

A museum-style fine art gallery that sells unique paintings. The vision, design system and rules are in [CLAUDE.md](CLAUDE.md).

## Getting started

Requires Node 20.9+ (developed on Node 24) and Docker (for the local database).

```bash
npm install                              # also generates the Prisma client
cp .env.example .env.local               # then set BETTER_AUTH_SECRET and ADMIN_EMAILS
npm run db:up                            # Postgres 17 on localhost:5433
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

## Scripts

| Script                | What it does                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run dev`         | Start the dev server                                                                           |
| `npm run build`       | Production build (needs the database: public pages are prerendered from it)                    |
| `npm run lint`        | ESLint                                                                                         |
| `npm run typecheck`   | TypeScript, no emit                                                                            |
| `npm test`            | Unit tests, plus integration tests against `maison_test` (emptied and re-seeded on every run)  |
| `npm run test:e2e`    | End-to-end tests: the gallery, the admin (sign-in, editing, uploads), 404s, keyboard, alt text |
| `npm run shots`       | Screenshots at 1440px and 390px in Chromium and WebKit into `./screenshots`                    |
| `npm run db:up`       | Start the local Postgres (Docker)                                                              |
| `npm run db:migrate`  | Apply migrations in development (and create new ones after a schema change)                    |
| `npm run db:deploy`   | Apply migrations without prompts (production, CI)                                              |
| `npm run db:seed`     | Load the demonstration collection. Safe to run again: existing records are left as they are    |
| `npm run db:studio`   | Browse the database                                                                            |
| `npm run seed:images` | Re-download and prepare the public-domain seed paintings (`-- --force` to refresh)             |

The e2e tests run against the dev server on port 3100 and change the development database, putting back what they change. To test a production build, run `npm run build`, then `LOCAL_PRODUCTION_TEST=1 SITE_URL=http://localhost:3200 npx next start --port 3200`, then `PORT=3200 npm run test:e2e`.

## Seed images

The gallery shows one artist, its owner. Until the owner's own works are added, the demo collection is 16 public-domain (CC0) works by a single painter, Winslow Homer, from The Metropolitan Museum of Art's Open Access programme. Credits are recorded in `public/seed/images.json`. Demo prices are fictional. Before launch, remove the demo works (Admin → The artist → Remove the demonstration works), then enter the owner's profile.
