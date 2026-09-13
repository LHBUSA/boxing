// PBE Title Map for one division, gender and date. Pure over the facts
// returned by boxing_title_map_facts().
//
// Everything in `derived` is PropBetEdge interpretation under a versioned
// rule, not a source fact:
//   pbe_undisputed@1 — per organization, the "primary champion" is the holder
//   of the highest-priority belt flagged counts_toward_undisputed (WBA Super
//   before WBA World/Regular). Interim, franchise, silver, diamond, gold,
//   emeritus and regional belts never count. Undisputed = one boxer is the
//   primary champion of all four of WBC, WBA, IBF, WBO. Unified = primary
//   champion of two or three of them.

import { diffRankings } from '../rankings/diff.mjs';

export const UNDISPUTED_RULE = 'pbe_undisputed@1';
export const FOUR_BELT_ORGS = ['wbc', 'wba', 'ibf', 'wbo'];

export function buildTitleMap(facts) {
  const titles = facts.titles ?? [];
  const byOrg = new Map();
  for (const t of titles) {
    if (!byOrg.has(t.organization_slug)) byOrg.set(t.organization_slug, []);
    byOrg.get(t.organization_slug).push(t);
  }

  const organizations = [...byOrg.entries()].map(([slug, list]) => {
    const primary = list
      .filter((t) => t.counts_toward_undisputed && t.holder)
      .sort((a, b) => (a.org_priority ?? 999) - (b.org_priority ?? 999))[0] ?? null;
    const held = list.filter((t) => t.holder);
    const distinctHolders = new Set(held.map((t) => t.holder.fighter_id));
    return {
      organization_slug: slug,
      belts: list.map((t) => ({
        title_id: t.title_id, public_id: t.public_id, tier: t.tier, source_native_label: t.source_native_label,
        status: t.holder ? 'held' : 'vacant', holder: t.holder ?? null, last_change: t.last_change ?? null,
      })),
      primary_champion: primary ? { ...primary.holder, title_id: primary.title_id, tier: primary.tier } : null,
      vacancies: list.filter((t) => !t.holder).map((t) => ({ title_id: t.title_id, tier: t.tier, since: t.last_change?.effective_on ?? null })),
      // e.g. WBA Super + WBA Regular + WBA Interim held by different boxers
      overlapping_champions: distinctHolders.size > 1
        ? held.map((t) => ({ tier: t.tier, source_native_label: t.source_native_label, fighter_id: t.holder.fighter_id, display_name: t.holder.display_name }))
        : [],
    };
  });

  const primaryByFighter = new Map();
  for (const o of organizations) {
    if (!FOUR_BELT_ORGS.includes(o.organization_slug) || !o.primary_champion) continue;
    const id = o.primary_champion.fighter_id;
    if (!primaryByFighter.has(id)) primaryByFighter.set(id, { fighter: o.primary_champion, organizations: [] });
    primaryByFighter.get(id).organizations.push({ organization_slug: o.organization_slug, tier: o.primary_champion.tier, title_id: o.primary_champion.title_id });
  }
  const unification = [...primaryByFighter.values()]
    .filter((x) => x.organizations.length >= 2)
    .map((x) => ({
      fighter_id: x.fighter.fighter_id,
      display_name: x.fighter.display_name,
      state: x.organizations.length === FOUR_BELT_ORGS.length ? 'undisputed' : 'unified',
      organizations: x.organizations.sort((a, b) => a.organization_slug.localeCompare(b.organization_slug)),
    }));

  const rankings = (facts.rankings ?? []).map((r) => ({
    organization_slug: r.organization_slug,
    snapshot: r.current ? {
      snapshot_id: r.current.snapshot_id, published_on: r.current.published_on, effective_on: r.current.effective_on,
      revision: r.current.revision, source_url: r.current.source_url,
    } : null,
    entries: r.current?.entries ?? [],
    // only explicitly sourced mandatory flags; never inferred from rank
    mandatory_challengers: (r.current?.entries ?? []).filter((e) => e.mandatory === true)
      .map((e) => ({ fighter_id: e.fighter_id, name: e.display_name ?? e.source_name, rank_label: e.rank_label, designation: e.designation })),
    changes_since_previous: r.previous && r.current ? diffRankings(r.previous, r.current) : [],
  }));

  return {
    weight_class_key: facts.weight_class_key,
    gender_scope: facts.gender_scope,
    as_of: facts.as_of,
    organizations,
    rankings,
    recent_changes: {
      title_events: (facts.recent_title_events ?? []).filter((e) => !e.superseded),
      ranking_changes: rankings.filter((r) => r.changes_since_previous.length)
        .map((r) => ({ organization_slug: r.organization_slug, changes: r.changes_since_previous })),
    },
    derived: {
      version: UNDISPUTED_RULE,
      label: 'PropBetEdge-derived',
      unification,
      undisputed_champion: unification.find((u) => u.state === 'undisputed') ?? null,
    },
  };
}
