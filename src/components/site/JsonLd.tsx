import { jsonLdScript } from "@/lib/structured-data";

/** Structured data for search engines (see src/lib/structured-data.ts). */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />;
}
