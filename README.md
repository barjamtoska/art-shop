# Maison

A museum-style fine art gallery that sells unique paintings. The vision, design system and rules are in [CLAUDE.md](CLAUDE.md).

## Getting started

Requires Node 20.9+ (developed on Node 24).

```bash
npm install
npx playwright install chromium webkit   # for screenshots and e2e tests
npm run dev                              # http://localhost:3000
```

Open `/lab` in development to see the frame, mat, spotlight and placard components at every size and aspect ratio.

## Scripts

| Script                | What it does                                                                       |
| --------------------- | ---------------------------------------------------------------------------------- |
| `npm run dev`         | Start the dev server                                                               |
| `npm run build`       | Production build                                                                   |
| `npm run lint`        | ESLint                                                                             |
| `npm run typecheck`   | TypeScript, no emit                                                                |
| `npm test`            | Unit tests (Vitest), including WCAG AA contrast checks on the colour tokens        |
| `npm run shots`       | Screenshots at 1440px and 390px in Chromium and WebKit into `./screenshots`        |
| `npx playwright test` | End-to-end tests and screenshots                                                   |
| `npm run seed:images` | Re-download and prepare the public-domain seed paintings (`-- --force` to refresh) |

## Seed images

The demo collection uses public-domain (CC0) paintings from The Metropolitan Museum of Art's Open Access programme. Credits are recorded in `public/seed/images.json`. Demo prices are fictional, and the demo works must be replaced before launch.
