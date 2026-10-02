# Deploying Maison

The gallery runs on **Vercel** in Frankfurt (`fra1`), with **Neon** Postgres in the same region. Payments go through **Stripe**, email through **Resend**, and images through **Cloudinary**. GitHub Actions tests every change.

This guide goes from an empty Vercel account to a live site. The [go-live checklist](#go-live-checklist) at the end lists everything to confirm before the first real sale.

---

## 1. Accounts you need

| Service    | Plan                           | Why                                                                          |
| ---------- | ------------------------------ | ---------------------------------------------------------------------------- |
| GitHub     | Free                           | Holds the code. CI runs on every push.                                       |
| Vercel     | **Pro**                        | Hosting. The Hobby plan is for non-commercial use only, so a shop needs Pro. |
| Neon       | Through the Vercel Marketplace | The database. Each preview deployment gets its own copy.                     |
| Stripe     | Standard                       | Payments. Use test mode until launch.                                        |
| Resend     | Free tier is enough to start   | Sign-in links, purchase confirmations and gallery notifications.             |
| Cloudinary | Free tier is enough to start   | Artwork photographs at full resolution, for the zoom view.                   |
| A domain   | Any registrar                  | For example `maison-gallery.com`.                                            |

## 2. Put the code on GitHub

```sh
git remote add origin git@github.com:<you>/maison.git
git push -u origin master
```

CI (`.github/workflows/ci.yml`) runs three jobs, all of which must pass:

- **Checks:** lint, formatting and types.
- **Tests:** the unit and integration tests, against Postgres and [stripe-mock](https://github.com/stripe/stripe-mock). stripe-mock checks every request the gallery sends to Stripe against Stripe's published API.
- **End-to-end:** a production build, tested in Chromium at desktop and phone sizes. This includes a full purchase: the real Stripe client talks to stripe-mock, and the test sends the signed webhooks Stripe would send.

CI needs no secrets. In **Settings → Branches**, protect the production branch and require the three CI checks to pass, so nothing untested reaches the live site.

## 3. Create the Vercel project

1. In Vercel, choose **Add New → Project** and import the repository. The framework preset is Next.js. `vercel.json` already sets these:
   - **Build command:** `npm run vercel-build`. This applies database migrations, then builds.
   - **Region:** `fra1` (Frankfurt).
   - **Cron:** a daily call to `/api/cron/release-reservations` at 03:15 UTC. It releases any hold whose Stripe "expired" event never arrived.
2. Under **Settings → Git**, set the production branch, either `master` or `main`.

## 4. Add the database (Neon)

1. In the Vercel project, open **Storage → Create → Neon**. Choose the **Frankfurt (aws-eu-central-1)** region.
2. Connect the database to **Production** and **Preview**. Turn on **database branching for previews**. Each preview deployment then gets its own branch of the database, so testing a preview never touches live orders.
3. The integration adds the environment variables. The gallery uses these two:
   - `DATABASE_URL`, which goes through the connection pooler. The app uses it.
   - `DATABASE_URL_UNPOOLED`, a direct connection. Migrations use it (see `prisma.config.ts`).

Migrations run on every deployment, before the build. They only move forward, so a migration is never undone by rolling back a deployment.

## 5. Set the environment variables

Set these in **Settings → Environment Variables**. Use separate values for Production and Preview where the table says so. The app checks them at startup and will not run in production with any of them missing (`src/lib/env.ts`).

| Variable                                             | Production                                                         | Preview                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| `SITE_URL`                                           | `https://<your domain>`                                            | Leave unset. A preview uses its own address automatically. |
| `BETTER_AUTH_SECRET`                                 | 32+ random characters                                              | A different 32+ random characters                          |
| `ADMIN_EMAILS`                                       | The addresses allowed into `/admin`, comma-separated               | Same, or a subset                                          |
| `RESEND_API_KEY`                                     | Resend API key                                                     | Same key is fine                                           |
| `EMAIL_FROM`                                         | `Maison <gallery@<your domain>>`                                   | Same                                                       |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | From the Cloudinary dashboard                                      | Same account                                               |
| `CLOUDINARY_FOLDER`                                  | `maison`                                                           | `maison-preview` (keeps test uploads apart)                |
| `STRIPE_SECRET_KEY`                                  | `sk_live_…` (at launch; `sk_test_…` before)                        | `sk_test_…` always                                         |
| `STRIPE_WEBHOOK_SECRET`                              | The live endpoint's `whsec_…` (step 6)                             | The test endpoint's `whsec_…` (step 6)                     |
| `CRON_SECRET`                                        | 32+ random characters. Vercel sends it with each cron call.        | 32+ random characters                                      |
| `GALLERY_EMAIL`                                      | Optional: where sale notifications go. Defaults to `ADMIN_EMAILS`. | Optional                                                   |

To generate a random secret:
`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`

**Never set `LOCAL_PRODUCTION_TEST` or `STRIPE_API_BASE` on Vercel.** They exist only for testing a production build on a laptop or in CI. The live site ignores the first and refuses to start with the second.

## 6. Stripe

1. **Webhook endpoint (live).** In the Stripe Dashboard, open **Developers → Webhooks → Add endpoint**:
   - **URL:** `https://<your domain>/api/webhooks/stripe`
   - **Events:** `checkout.session.completed`, `checkout.session.expired`, `charge.refunded`

   Copy the signing secret into `STRIPE_WEBHOOK_SECRET` for Production. Only this webhook can mark a work sold. A payment that arrives for a work already sold is refunded automatically.

2. **Webhook endpoint (test, for previews).** In test mode, add the same three events for a stable preview address, such as the branch URL of a `staging` branch. Vercel's Deployment Protection blocks Stripe from preview URLs, so:
   - create a **Protection Bypass for Automation** secret in Vercel (**Settings → Deployment Protection**);
   - add it to the webhook URL as `?x-vercel-protection-bypass=<secret>`.
3. **Checkout appearance.** Open **Settings → Branding**:
   - **Background:** `#501210`
   - **Accent:** `#B8935A`
   - **Business name:** the gallery's name
   - **Icon:** an icon, if you have one
4. **Public details.** Under **Settings → Public details**, set the statement descriptor, the support email and the address of your terms page (`/terms`).
5. **Payment methods.** Checkout offers cards, which includes Apple Pay and Google Pay. Turn on Apple Pay and Google Pay in **Settings → Payment methods**.

## 7. Email (Resend)

1. In Resend, open **Domains → Add domain** and use your domain, or a subdomain such as `mail.<your domain>`.
2. Add the DNS records Resend shows: the SPF and DKIM records. Also add a DMARC record:
   `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:<you>@<your domain>`
3. Once the domain shows as verified, set `EMAIL_FROM` to an address on it.

Until the domain is verified, Resend only delivers to your own account's address.

## 8. Images (Cloudinary)

The admin uploads photographs straight to Cloudinary with a **signed** request, and Cloudinary refuses anything unsigned. In **Settings → Upload**, make sure no **unsigned** upload presets exist. Upload photographs at least 3000px, ideally 4000px, on the long edge, so the zoom view shows the brushwork.

## 9. Domain

In Vercel, open **Settings → Domains** and add the domain, then follow the DNS instructions. HTTPS is set up automatically.

The site sends a two-year HSTS header that includes `preload`. Submitting the domain to [hstspreload.org](https://hstspreload.org) is optional. Once a domain is on that list, it is very hard to take it off, so submit only when you are sure the domain will serve HTTPS for good.

## 10. The first deployment

Push to the production branch, or choose **Redeploy** in Vercel. Then:

1. Sign in at `https://<your domain>/admin`. The sign-in link arrives by email.
2. Under **The artist**, enter the owner's name, biography and portrait.
3. Under **Mediums**, check the list. Then add the works under **Artworks**, and the exhibitions.

A new database starts empty: the demonstration collection is _not_ loaded in production. To load it on a staging database, run `npm run db:seed` with that database's `DATABASE_URL`. You can remove it later under **Admin → The artist → Remove the demonstration works**.

## Day to day

- **Releasing a change.** Merge into the production branch after CI passes. Vercel deploys it, running any new migrations first.
- **Rolling back.** Use **Instant Rollback** in Vercel. The code returns to the earlier version, but database migrations stay applied. This is why migrations only ever add.
- **When something goes wrong:**
  - **Vercel → Logs** shows server errors.
  - **Stripe → Webhooks** shows every delivery. Stripe retries failed deliveries for three days, and the gallery ignores duplicates safely.
- **Backups.** Neon keeps a point-in-time history; the length depends on your Neon plan. Check it covers at least 7 days.

---

## Go-live checklist

**Content**

- [ ] The texts of About, Visit, Shipping & returns, Terms of sale and Privacy are written and reviewed: `src/content/pages.ts`. Fill in every [bracketed] item. Then set `pagesReviewed = true`, which removes the "Draft text" notice.
- [ ] The contact details, address, legal name and company or VAT number in `src/config/site.ts` are real.
- [ ] The demonstration works are removed and the owner's works are added, with colour-accurate photographs, dimensions, prices and descriptions.
- [ ] The artist's profile is complete.
- [ ] An accountant has confirmed how VAT applies, and the shipping exclusions (Russia and Belarus, under EU sanctions) in `src/config/shipping.ts`.

**Services**

- [ ] Every Production environment variable is set (step 5). The deployment starts without errors.
- [ ] Resend's domain is verified. A sign-in link arrives in the inbox, not the spam folder.
- [ ] Cloudinary has no unsigned upload presets.
- [ ] Stripe is in live mode:
  - the live webhook endpoint has all three events;
  - the branding and public details are set;
  - Apple Pay and Google Pay are on.
- [ ] Vercel's cron job appears under **Settings → Cron Jobs**.
- [ ] Neon's backup history is long enough.
- [ ] GitHub branch protection requires CI.

**One real purchase**

1. [ ] Create an inexpensive test work, such as €1, and publish it.
2. [ ] Acquire it with a real card. The confirmation email arrives, and the certificate opens from it.
3. [ ] The work shows _In a private collection_. The order appears under **Admin → Orders**, and the gallery's notification email arrives.
4. [ ] In the Stripe Dashboard, refund the payment. The order becomes _Refunded_, and the work stays sold until you put it back on sale in the admin.
5. [ ] Delete or unpublish the test work.
