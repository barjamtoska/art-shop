import type { Metadata } from "next";
import { TextPage } from "@/components/site/TextPage";
import { terms } from "@/content/pages";

export const metadata: Metadata = {
  title: terms.title,
  description: terms.description,
  alternates: { canonical: "/terms" },
};

export default function Page() {
  return <TextPage page={terms} />;
}
