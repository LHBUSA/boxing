// Structured data (schema.org JSON-LD) for the pages that matter to search: cards, fights, fighters.
//
// Facts only, from the same reads the page renders. In build mode (LAUNCH_APPROVED = false) no URL is emitted: the
// graph names the entities but never advertises an address, so nothing invites discovery. In launch mode every
// node gets its canonical address on PUBLIC_URL. Flipping the launch switch changes URLs only, not the builders.

import { INDEXABLE, PUBLIC_URL } from "./posture.ts";
import { boutPath, eventPath, fighterPath } from "./slug.ts";
import type { BoutDetail, EventDetail, EventSummary, FighterDetail, Venue } from "./types.ts";

export type JsonLd = Record<string, unknown>;

export const launchUrl = (path: string, indexable: boolean = INDEXABLE): string | undefined => (indexable ? `${PUBLIC_URL}${path}` : undefined);

const clean = <T extends JsonLd>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && !v.length))) as T;

function place(v: Venue | null | undefined): JsonLd | undefined {
  if (!v?.name && !v?.city) return undefined;
  return clean({ "@type": "Place", name: v?.name ?? v?.city ?? undefined,
    address: clean({ "@type": "PostalAddress", addressLocality: v?.city ?? undefined, addressRegion: v?.region ?? undefined, addressCountry: v?.country_code ?? undefined }) });
}

const STATUS: Record<string, string> = { cancelled: "https://schema.org/EventCancelled", postponed: "https://schema.org/EventPostponed" };

export function eventJsonLd(e: EventSummary, detail?: Pick<EventDetail, "bouts"> | null, indexable: boolean = INDEXABLE): JsonLd {
  return clean({
    "@context": "https://schema.org", "@type": "SportsEvent", sport: "Boxing", name: e.name, startDate: e.start_at ?? e.date,
    eventStatus: STATUS[e.status] ?? "https://schema.org/EventScheduled", location: place(e.venue), url: launchUrl(eventPath(e), indexable),
    organizer: e.promoters.length ? e.promoters.map((name) => ({ "@type": "Organization", name })) : undefined,
    subEvent: (detail?.bouts ?? []).filter((b) => b.a && b.b).slice(0, 30).map((b) => clean({
      "@type": "SportsEvent", sport: "Boxing", name: `${b.a!.name} vs ${b.b!.name}`, startDate: e.date, url: launchUrl(boutPath(b), indexable),
      competitor: [b.a!, b.b!].map((c) => clean({ "@type": "Person", name: c.name, url: launchUrl(fighterPath(c), indexable) })),
    })),
  });
}

export function boutJsonLd(d: BoutDetail, indexable: boolean = INDEXABLE): JsonLd {
  const b = d.bout;
  const corners = [b.a, b.b].filter((c): c is NonNullable<typeof c> => Boolean(c));
  return clean({
    "@context": "https://schema.org", "@type": "SportsEvent", sport: "Boxing",
    name: corners.length === 2 ? `${corners[0].name} vs ${corners[1].name}` : d.event.name, startDate: d.event.start_at ?? d.event.date,
    eventStatus: STATUS[b.status] ?? STATUS[d.event.status] ?? "https://schema.org/EventScheduled", location: place(d.event.venue), url: launchUrl(boutPath(b), indexable),
    competitor: corners.map((c) => clean({ "@type": "Person", name: c.name, url: launchUrl(fighterPath(c), indexable) })),
    superEvent: clean({ "@type": "SportsEvent", name: d.event.name, startDate: d.event.date, url: launchUrl(eventPath(d.event), indexable) }),
  });
}

export function fighterJsonLd(f: FighterDetail, sameAs: (string | null | undefined)[] = [], indexable: boolean = INDEXABLE): JsonLd {
  return clean({
    "@context": "https://schema.org", "@type": "Person", name: f.fighter.name, alternateName: f.fighter.nickname ?? undefined,
    // an athlete's page describes their boxing: "Boxer" is a fact of the verified record
    jobTitle: f.record.bouts > 0 ? "Professional boxer" : undefined,
    url: launchUrl(fighterPath(f.fighter), indexable), sameAs: sameAs.filter((u): u is string => Boolean(u)),
  });
}

// Serialized for a <script type="application/ld+json">: "<" is escaped so no value can close the tag.
export const serializeJsonLd = (data: JsonLd | JsonLd[]): string => JSON.stringify(data).replace(/</g, "\\u003c");
