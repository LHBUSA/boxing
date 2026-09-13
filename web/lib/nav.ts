// One navigation registry. "building" items are shown as not-yet-open instead of
// linking to empty pages; flipping one to "live" is the only change needed when
// its surface ships.

export interface NavItem { label: string; href: string; status: "live" | "building"; place: "primary" | "more"; blurb?: string }

export const NAV: NavItem[] = [
  { label: "Fight Week", href: "/fight-week", status: "live", place: "primary" },
  { label: "Events", href: "/events", status: "live", place: "primary" },
  { label: "Fighters", href: "/fighters", status: "live", place: "primary" },
  { label: "Titles", href: "/titles", status: "live", place: "primary" },
  { label: "Rankings", href: "/rankings", status: "live", place: "primary" },
  { label: "Odds", href: "/odds", status: "building", place: "primary", blurb: "Odds Terminal" },
  { label: "News", href: "/news", status: "building", place: "primary", blurb: "Boxing newsroom" },
  { label: "Promotions", href: "/promotions", status: "building", place: "more", blurb: "Promotion hubs" },
  { label: "Videos", href: "/videos", status: "building", place: "more", blurb: "Official video desk" },
  { label: "Scorecards", href: "/scorecards", status: "building", place: "more", blurb: "Scorecard Center" },
  { label: "Judges", href: "/judges", status: "building", place: "more", blurb: "Judge DNA" },
  { label: "Referees", href: "/referees", status: "building", place: "more", blurb: "Referee DNA" },
  { label: "Methodology", href: "/methodology", status: "live", place: "more", blurb: "Sources and rules" },
];

export const SITE = {
  name: "PropBetEdge Boxing",
  short: "PBE Boxing",
  description: "Boxing's whole landscape on one verified record: fight weekends across promotions and commissions, official results and scorecards, Fight DNA, titles and rankings.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://boxing.propbetedge.ai",
};
