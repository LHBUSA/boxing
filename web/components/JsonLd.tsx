import { serializeJsonLd, type JsonLd as Data } from "@/lib/seo";

// schema.org structured data for one page (server-rendered; no client code).
export function JsonLd({ data }: { data: Data | Data[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
