// Navigation registry. A surface joins the navigation only when its read returns meaningful real data
// (lib/availability.ts decides at request time); nothing unfinished is advertised.

import { BASE_URL } from "./posture.ts";

export type NavKey = "fight-week" | "events" | "fighters" | "titles" | "rankings" | "odds" | "news"
  | "promoters" | "videos" | "scorecards" | "judges" | "referees" | "history" | "hall-of-fame" | "methodology";

export interface NavItem { key: NavKey; label: string; href: string; blurb?: string }

export const PRIMARY_NAV: NavItem[] = [
  { key: "fight-week", label: "Fight Week", href: "/fight-week" },
  { key: "events", label: "Events", href: "/events" },
  { key: "fighters", label: "Fighters", href: "/fighters" },
  { key: "titles", label: "Titles", href: "/titles" },
  { key: "rankings", label: "Rankings", href: "/rankings" },
  { key: "odds", label: "Odds", href: "/odds" },
  { key: "news", label: "News", href: "/news" },
];

export const MORE_NAV: NavItem[] = [
  { key: "promoters", label: "Promotions", href: "/promoters", blurb: "Cards by promotion, as listed on official sheets" },
  { key: "videos", label: "Videos", href: "/videos", blurb: "Official channels, embeds and metadata only" },
  { key: "scorecards", label: "Scorecards", href: "/scorecards", blurb: "Official judges' cards and panel spread" },
  { key: "judges", label: "Judges", href: "/judges", blurb: "Judge DNA, always with its sample" },
  { key: "referees", label: "Referees", href: "/referees", blurb: "Referee DNA, always with its sample" },
  { key: "history", label: "History", href: "/history", blurb: "Decade by decade, from the record" },
  { key: "hall-of-fame", label: "Hall of Fame", href: "/hall-of-fame", blurb: "Recognized Halls and their own induction records" },
  { key: "methodology", label: "Methodology", href: "/methodology", blurb: "Sources, verified records and how we measure" },
];

// Network destinations that are not sports. First-party PropBetEdge links: canonical, same-tab.
export const NETWORK_LINKS = [
  { key: "learn", label: "Learn", href: "https://learn.propbetedge.ai/" },
];

export const NETWORK = [
  { key: "mlb", label: "MLB", href: "https://mlb.propbetedge.ai/" },
  { key: "nfl", label: "NFL", href: "https://nfl.propbetedge.ai/" },
  { key: "ufc", label: "UFC", href: "https://ufc.propbetedge.ai/" },
  { key: "nba", label: "NBA", href: "https://nba.propbetedge.ai/" },
  { key: "wnba", label: "WNBA", href: "https://wnba.propbetedge.ai/" },
  { key: "nhl", label: "NHL", href: "https://nhl.propbetedge.ai/" },
];

export const filterNav = (items: NavItem[], available: Set<NavKey>) => items.filter((n) => available.has(n.key));

export const SITE = {
  name: "PropBetEdge Boxing",
  description: "Boxing fight intelligence: every card on official record, fighter dossiers, judges' scorecards, officials, Fight DNA, titles, Hall of Fame and markets.",
  url: BASE_URL,
  // stored locally like every other asset: no page depends on another origin to draw its own brand
  mark: "/brand/pbe-mark-160.png",
};
