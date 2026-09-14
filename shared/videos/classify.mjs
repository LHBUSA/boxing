// Official Video Desk: title classification. Pure.
//
// Boxing-specific families, first match wins; every hit is kept as evidence.
// Titles describe media, never fight facts: nothing here derives a result, an
// injury, a weight or a tactic from a title, description or thumbnail.

export const VIDEO_TYPES = Object.freeze([
  'announcement', 'trailer_promo', 'grand_arrival', 'media_day', 'open_workout', 'media_workout', 'press_conference', 'interview', 'faceoff',
  'weigh_in', 'ceremonial_weigh_in', 'fight_preview', 'full_fight', 'replay', 'highlights', 'knockout', 'post_fight_interview',
  'post_fight_press_conference', 'analysis', 'documentary_feature', 'other',
]);

export const VIDEO_TYPE_LABEL = Object.freeze({
  announcement: 'Announcement', trailer_promo: 'Trailer / promo', grand_arrival: 'Grand arrival', media_day: 'Media day', open_workout: 'Open workout',
  media_workout: 'Media workout', press_conference: 'Press conference', interview: 'Interview', faceoff: 'Face-off', weigh_in: 'Weigh-in',
  ceremonial_weigh_in: 'Ceremonial weigh-in', fight_preview: 'Fight preview', full_fight: 'Full fight', replay: 'Replay', highlights: 'Highlights',
  knockout: 'Knockout', post_fight_interview: 'Post-fight interview', post_fight_press_conference: 'Post-fight press conference', analysis: 'Analysis',
  documentary_feature: 'Documentary / feature', other: 'Official video',
});

// Order matters: post-fight media beats press conference/interview; ceremonial beats weigh-in; a specific
// session (media day, open workout) beats a generic word inside it ("Open Workout highlights").
const FAMILIES = [
  ['post_fight_press_conference', /\bpost[\s-]?fight\s+(press\s+conference|presser)\b|\brueda de prensa post/i],
  ['post_fight_interview', /\bpost[\s-]?fight\s+(interview|reaction|comments)\b|\bin[\s-]?ring interview\b|\b(instant )?reaction after\b|\breacts? (to|after) (knocking|beating|stopping|defeating|winning)\b/i],
  ['ceremonial_weigh_in', /\bceremonial\s+weigh[\s-]?ins?\b/i],
  ['weigh_in', /\bweigh[\s-]?ins?\b|\bpesaje\b/i],
  ['faceoff', /\bface[\s-]?offs?\b|\bstare[\s-]?downs?\b|\bcareos?\b|\bface[\s-]to[\s-]face\b|\bhead[\s-]to[\s-]head\b/i],
  ['grand_arrival', /\bgrand arrivals?\b|\barrivals?\b/i],
  ['media_day', /\bmedia day\b/i],
  ['open_workout', /\b(open|public) workouts?\b/i],
  ['media_workout', /\bmedia workouts?\b/i],
  ['press_conference', /\bpress\s+conference\b|\bpresser\b|\brueda de prensa\b|\bconferencia de prensa\b/i],
  ['full_fight', /\bfull\s+(fight|figh\b|event)\b|\bfree fight\b|\bpelea completa\b|\b\d+\s+live fights\b|\bprelims\b.*\blive\b|\blive\b.*\bprelims\b/i],
  ['replay', /\b(full\s+)?replay\b|\brepeticion\b/i],
  ['knockout', /\bknock(s|ed)?[\s-]?(out|down)s?\b|\bknockouts?\b|\bKO\b|\bKO'?d\b|\bstops\b|\bstoppage\b|\bdrops\b/i],
  ['highlights', /\bhighlights?\b|\bbest (fights|moments)\b|\bresumen\b|\bquick jabs\b/i],
  ['trailer_promo', /\btrailer\b|\bpromo\b|\bteaser\b|\bevent tease\b|\bcountdown\b/i],
  ['fight_preview', /\bpreview\b|\bfight week\b|\bwhat to expect\b|\bin the making\b/i],
  ['analysis', /\banalysis\b|\bbreakdown\b|\bbroke down\b|\brecap\b|\bfilm study\b|\bfight review\b|\bpodcast\b|\bpanel\b|\breacts?\b|\breaction\b|\bverdict\b|\bthoughts on\b/i],
  ['documentary_feature', /\bdocumentary\b|\bafter movie\b|\bbehind the scenes\b|\buncut\b|\bepisode\b|\binside \w+\b|\bOTD\b|\bon this day\b|\bthrowback\b|\brewind\b|\bentire\b.*\b(rivalry|saga)\b|\bin one video\b|\bnever before seen\b|\bjourney\b|\bhistory\b/i],
  ['announcement', /\bannounce(s|d|ment)?\b|\bofficially set\b|\bconfirmed for\b|\btickets on sale\b|\bnext opponent\b|\bis back\b/i],
  ['interview', /\binterview\b|\bsits down\b|\b1[\s-]?on[\s-]?1\b|\bq\s*&\s*a\b|\bexclusive\b|\bentrevista\b|\btells\b|\bsays\b|\bexplains\b|\brelives\b|\brecalls\b/i],
];

export function classifyVideo({ title = '' } = {}) {
  const evidence = [];
  for (const [type, re] of FAMILIES) {
    const m = String(title).match(re);
    if (m) evidence.push({ video_type: type, source: 'title', match: m[0] });
  }
  return { video_type: evidence[0]?.video_type ?? 'other', evidence };
}
