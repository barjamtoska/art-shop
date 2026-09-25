import type { Metadata } from "next";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: { template: `%s — ${site.name} admin`, default: `${site.name} admin` },
  robots: { index: false, follow: false },
};

/** The back office: the same palette as the gallery, laid out for work. */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="min-h-svh bg-wall-deep text-[0.9375rem]">{children}</div>;
}
