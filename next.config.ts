import type { NextConfig } from "next";

const cloudinaryCloud = process.env.CLOUDINARY_CLOUD_NAME;
const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy. Scripts, styles and fonts come only from this
 * site; images also from Cloudinary; forms post only here or to Stripe
 * Checkout; no one may frame the site. ('unsafe-inline' covers the inline
 * scripts Next.js uses to start the page and React's inline styles; a nonce
 * would make every page render per request, losing static pages.)
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self'",
  // The admin uploads photographs straight to Cloudinary; dev reloads over a socket.
  `connect-src 'self' https://api.cloudinary.com${isDev ? " ws: wss:" : ""}`,
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  // The dev badge sits over the artwork in screenshots used for design review.
  devIndicators: false,
  poweredByHeader: false,
  experimental: {
    // The stylesheet is small (Tailwind); arriving with the HTML, the first
    // room paints without waiting on a second request.
    inlineCss: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // The gallery shows one artist; the old artists' directory led here.
  async redirects() {
    return [
      { source: "/artists", destination: "/artist", permanent: true },
      { source: "/artists/:slug", destination: "/artist", permanent: true },
    ];
  },
  images: {
    // 90 is reserved for artworks, where compression artefacts are visible
    // in brushwork; everything else uses the default 75.
    qualities: [75, 90],
    localPatterns: [
      { pathname: "/seed/**", search: "" },
      // Development uploads, when Cloudinary is not configured.
      { pathname: "/uploads/**", search: "" },
    ],
    // Only this site's own Cloudinary account.
    remotePatterns: cloudinaryCloud
      ? [{ protocol: "https", hostname: "res.cloudinary.com", pathname: `/${cloudinaryCloud}/image/upload/**` }]
      : [],
  },
};

export default nextConfig;
