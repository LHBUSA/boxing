// Official Video Desk: title classification. Pure.
//
// Boxing-specific families, first match wins; every hit is kept as evidence.
// Titles describe media, never fight facts: nothing here derives a result, an
// injury, a weight or a tactic from a title, description or thumbnail.

export const VIDEO_TYPES = Object.freeze([
  'announcement', 'trailer_promo', 'grand_arrival', 'media_workout', 'press_conference', 'interview', 'faceoff', 'weigh_in',
  'ceremonial_weigh_in', 'fight_preview', 'highlights', 'full_fight', 'post_fight_interview', 'post_fight_press_conference', 'analysis', 'other',
]);

export const VIDEO_TYPE_LABEL = Object.freeze({
  announcement: 'Announcement', trailer_promo: 'Trailer / promo', grand_arrival: 'Grand arrival', media_workout: 'Media workout',
  press_conference: 'Press conference', interview: 'Interview', faceoff: 'Face-off', weigh_in: 'Weigh-in', ceremonial_weigh_in: 'Ceremonial weigh-in',
  fight_preview: 'Fight preview', highlights: 'Highlights', full_fight: 'Full fight', post_fight_interview: 'Post-fight interview',
  post_fight_press_conference: 'Post-fight press conference', analysis: 'Analysis', other: 'Official video',
});

// Order matters: post-fight media beats press conference/interview; ceremonial beats weigh-in.
const FAMILIES = [
  ['post_fight_press_conference', /\bpost[\s-]?fight\s+(press\s+conference|presser)\b|\brueda de prensa post/i],
  ['post_fight_interview', /\bpost[\s-]?fight\s+(interview|reaction|comments)\b|\bin[\s-]?ring interview\b/i],
  ['ceremonial_weigh_in', /\bceremonial\s+weigh[\s-]?ins?\b/i],
  ['weigh_in', /\bweigh[\s-]?ins?\b|\bpesaje\b/i],
  ['faceoff', /\bface[\s-]?offs?\b|\bstare[\s-]?downs?\b|\bcareos?\b/i],
  ['grand_arrival', /\bgrand arrivals?\b|\barrivals?\b/i],
  ['media_workout', /\b(media|open|public) workouts?\b|\bmedia day\b/i],
  ['press_conference', /\bpress\s+conference\b|\bpresser\b|\brueda de prensa\b|\bconferencia de prensa\b/i],
  ['full_fight', /\bfull\s+(fight|replay|event)\b|\bfree fight\b|\bfight replay\b|\bpelea completa\b/i],
  ['highlights', /\bhighlights?\b|\bevery knockout\b|\bbest (knockouts|moments)\b|\bresumen\b/i],
  ['trailer_promo', /\btrailer\b|\bpromo\b|\bteaser\b|\bcountdown\b/i],
  ['fight_preview', /\bpreview\b|\bfight week\b|\bwhat to expect\b/i],
  ['analysis', /\banalysis\b|\bbreakdown\b|\brecap\b|\bfilm study\b/i],
  ['announcement', /\bannounce(s|d|ment)?\b|\bofficially set\b|\bconfirmed for\b/i],
  ['interview', /\binterview\b|\bsits down\b|\b1[\s-]?on[\s-]?1\b|\bq\s*&\s*a\b|\bexclusive\b|\bentrevista\b/i],
];

export function classifyVideo({ title = '' } = {}) {
  const evidence = [];
  for (const [type, re] of FAMILIES) {
    const m = String(title).match(re);
    if (m) evidence.push({ video_type: type, source: 'title', match: m[0] });
  }
  return { video_type: evidence[0]?.video_type ?? 'other', evidence };
}
