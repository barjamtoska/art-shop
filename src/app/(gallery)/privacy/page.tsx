import type { Metadata } from "next";
import { TextPage } from "@/components/site/TextPage";
import { privacy } from "@/content/pages";

export const metadata: Metadata = {
  title: privacy.title,
  description: privacy.description,
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  return <TextPage page={privacy} />;
}
