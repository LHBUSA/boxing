// Ranking change detection between two snapshots of the SAME organization,
// division and gender. Pure.
//
// Entries are keyed by canonical fighter id; unresolved entries fall back to
// their normalized source name and every change that involves one is flagged
// identity_unresolved (the resulting news event then requires review).

import { parseName } from '../identity/normalize.mjs';

const keyOf = (e) => (e.fighter_id ? `fighter:${e.fighter_id}` : e.source_name ? `name:${parseName(e.source_name).full}` : null);
const label = (e) => e.display_name ?? e.source_name ?? null;

function describe(e) {
  return {
    fighter_id: e.fighter_id ?? null,
    public_id: e.public_id ?? null,
    name: label(e),
    source_name: e.source_name ?? null,
    rank: e.rank ?? null,
    rank_label: e.rank_label ?? null,
    position: e.position,
    is_champion: Boolean(e.is_champion),
    designation: e.designation ?? null,
    mandatory: e.mandatory ?? null,
  };
}

export function diffRankings(previous, current) {
  const changes = [];
  if (!current) return changes;
  const prevEntries = (previous?.entries ?? []).filter((e) => !e.is_vacant);
  const curEntries = (current.entries ?? []).filter((e) => !e.is_vacant);
  const prev = new Map(prevEntries.map((e) => [keyOf(e), e]).filter(([k]) => k));
  const cur = new Map(curEntries.map((e) => [keyOf(e), e]).filter(([k]) => k));

  const push = (type, e, extra = {}) => changes.push({
    type, ...describe(e), identity_unresolved: !e.fighter_id, ...extra,
  });

  for (const [k, e] of cur) {
    const p = prev.get(k);
    if (!p) {
      push(e.is_champion ? 'new_champion_listed' : 'new_entrant', e);
      continue;
    }
    if (e.is_champion !== p.is_champion) {
      push(e.is_champion ? 'became_champion' : 'no_longer_champion', e, { previous_rank_label: p.rank_label });
    } else if (!e.is_champion && e.rank != null && p.rank != null && e.rank !== p.rank) {
      push(e.rank < p.rank ? 'moved_up' : 'moved_down', e, { previous_rank: p.rank, previous_rank_label: p.rank_label, places: Math.abs(e.rank - p.rank) });
    }
    if ((e.designation ?? null) !== (p.designation ?? null)) {
      push('designation_changed', e, { previous_designation: p.designation ?? null });
    }
    // Mandatory status is only compared when BOTH lists state it explicitly.
    if (e.mandatory != null && p.mandatory != null && e.mandatory !== p.mandatory) {
      push('mandatory_changed', e, { previous_mandatory: p.mandatory });
    }
  }
  for (const [k, p] of prev) {
    if (!cur.has(k)) push('removed', p);
  }

  // Champion slots: a champion listed before but not now, with a vacant slot now.
  const prevChampions = prevEntries.filter((e) => e.is_champion).map(keyOf);
  const curChampions = curEntries.filter((e) => e.is_champion).map(keyOf);
  const nowVacant = (current.entries ?? []).some((e) => e.is_vacant && /^(c|champion|super champion|sc)$/i.test(String(e.rank_label ?? '')));
  if (prevChampions.length && !curChampions.length && nowVacant) {
    changes.push({ type: 'title_vacant_in_ranking', position: null, identity_unresolved: false, previous_champions: prevChampions });
  } else if (prevChampions.length && curChampions.length && prevChampions.join() !== curChampions.join()) {
    changes.push({ type: 'champion_changed', position: null, identity_unresolved: false, previous_champions: prevChampions, current_champions: curChampions });
  }

  const order = ['champion_changed', 'title_vacant_in_ranking', 'became_champion', 'no_longer_champion', 'new_champion_listed',
    'moved_up', 'moved_down', 'new_entrant', 'removed', 'designation_changed', 'mandatory_changed'];
  return changes.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || (a.position ?? 0) - (b.position ?? 0));
}
