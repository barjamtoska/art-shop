# Project: Maison — a museum-style fine art shop

## Vision
This is a luxury art gallery that happens to sell paintings, not a shop that looks like a gallery.
Every page should feel like walking through a quiet, warmly lit museum at night.
When in doubt, choose restraint, space, and calm over density and urgency.

## Design system
- Background: deep burgundy walls — base #4A0E1A, darker #2E0710 for depth, subtle wall texture/noise.
- Accents: aged gold #B8935A (frames, dividers, hover states). Never bright yellow.
- Text: warm ivory #F3EBDD; secondary #CBBFA8. All text must pass WCAG AA contrast on burgundy.
- Typography: headings in Cormorant Garamond (light/regular, generous letter-spacing, small caps for labels);
  body/UI in Inter or similar, small and quiet.
- Lighting: each painting sits under a soft warm spotlight (radial gradient from above, warm #FFE8C2 glow at low opacity),
  with a gentle vignette at page edges. Paintings are the brightest thing on screen.
- Frames: gilded frame built with layered borders, inset/outset box-shadows and a subtle gold gradient,
  plus an ivory mat (passe-partout) between frame and painting. Frames must look physical, not flat.
- Placards: every artwork has a small museum placard (artist, title, year, medium, dimensions, price in small type).
- Motion: slow fades and gentle reveals (400–800ms, ease-out). No bounce, no parallax gimmicks, respect prefers-reduced-motion.
- Language: "Acquire" instead of "Buy", "Collection" instead of "Products", "Exhibitions" instead of "Categories".
- Forbidden: loud CTAs, discount badges, pop-ups, carousels that auto-spin, stock-photo vibes, pure white backgrounds.

## Stack
- Next.js (App Router, TypeScript), Tailwind CSS with design tokens from this file
- PostgreSQL + Prisma
- Stripe Checkout + webhooks for payments
- Cloudinary (or similar) for artwork images; next/image for responsive delivery
- Auth for the admin area only (customers check out as guests)

## Rules
- Each painting is unique: stock = 1. A sold painting stays visible with a discreet "In a private collection" placard.
- Never mark a painting sold except from a verified Stripe webhook; prevent double sales.
- Secrets only in environment variables; never commit them.
- After any UI change, use Playwright to screenshot desktop (1440px) and mobile (390px) and check against this design system.
- Commit after each completed phase.

## Next.js
@AGENTS.md
