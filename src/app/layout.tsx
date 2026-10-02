import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Cormorant_SC, Inter } from "next/font/google";
import { LightsController } from "@/components/gallery/LightsController";
import { site } from "@/config/site";
import { env } from "@/lib/env";
import "@/styles/globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  display: "swap",
});

const cormorantSC = Cormorant_SC({
  variable: "--font-cormorant-sc",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.SITE_URL),
  title: { default: site.name, template: `%s — ${site.name}` },
  description: site.description,
  applicationName: site.name,
  openGraph: { siteName: site.name, locale: site.locale.replace("-", "_"), type: "website" },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#2e0908",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${cormorant.variable} ${cormorantSC.variable} ${inter.variable}`}>
      <body>
        <div className="wall" aria-hidden="true" />
        {/* Spotlights spill past works near the page edge. Clip them here, not on
            <body> — body overflow propagates to the viewport, where the page would
            still be pannable sideways on iOS. */}
        <div className="overflow-x-clip">{children}</div>
        <LightsController />
      </body>
    </html>
  );
}
