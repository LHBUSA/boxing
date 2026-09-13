// Navigation registry. Only surfaces a fan can use today are listed; nothing
// unfinished is advertised. Add an entry when its page has real coverage.

export interface NavItem { label: string; href: string; blurb?: string }

export const PRIMARY_NAV: NavItem[] = [
  { label: "Fight Week", href: "/fight-week" },
  { label: "Events", href: "/events" },
  { label: "Fighters", href: "/fighters" },
  { label: "Scorecards", href: "/scorecards" },
  { label: "Officials", href: "/officials" },
  { label: "Titles", href: "/titles" },
  { label: "Rankings", href: "/rankings" },
];

export const MORE_NAV: NavItem[] = [
  { label: "Promoters", href: "/promoters", blurb: "Cards by promoter, as listed on official sheets" },
  { label: "Methodology", href: "/methodology", blurb: "Sources, verified records and how we measure" },
];

export const NETWORK = [
  { key: "mlb", label: "MLB", href: "https://mlb.propbetedge.ai/" },
  { key: "nfl", label: "NFL", href: "https://nfl.propbetedge.ai/" },
  { key: "ufc", label: "UFC", href: "https://ufc.propbetedge.ai/" },
  { key: "nba", label: "NBA", href: "https://nba.propbetedge.ai/" },
  { key: "wnba", label: "WNBA", href: "https://wnba.propbetedge.ai/" },
  { key: "nhl", label: "NHL", href: "https://nhl.propbetedge.ai/" },
];

export const SITE = {
  name: "PropBetEdge Boxing",
  description: "Boxing fight intelligence: every card on official record, fighter dossiers, judges' scorecards, officials, Fight DNA, titles and markets.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://boxing.propbetedge.ai",
  mark: "https://propbetedge.ai/logo/pbe-mark-160.png",
};
