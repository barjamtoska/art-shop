import type { Metadata } from "next";
import { TextPage } from "@/components/site/TextPage";
import { about } from "@/content/pages";

export const metadata: Metadata = {
  title: about.title,
  description: about.description,
  alternates: { canonical: "/about" },
};

export default function Page() {
  return <TextPage page={about} literary />;
}
