import type { Metadata } from "next";
import { TextPage } from "@/components/site/TextPage";
import { shipping } from "@/content/pages";

export const metadata: Metadata = {
  title: shipping.title,
  description: shipping.description,
  alternates: { canonical: "/shipping-and-returns" },
};

export default function Page() {
  return <TextPage page={shipping} />;
}
