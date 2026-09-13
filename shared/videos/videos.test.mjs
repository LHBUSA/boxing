import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyVideo, VIDEO_TYPES, VIDEO_TYPE_LABEL } from './classify.mjs';
import { resolveVideo } from './resolve.mjs';

test('boxing titles classify into boxing media types; post-fight and ceremonial beat their generic forms', () => {
  const cases = [
    ['Ruiz vs Knyba | Post Fight Press Conference', 'post_fight_press_conference'],
    ['Knyba post-fight interview after beating Ruiz', 'post_fight_interview'],
    ['Ceremonial Weigh-In | Ruiz vs Knyba', 'ceremonial_weigh_in'],
    ['Official Weigh In Results: Elliott vs Valencia', 'weigh_in'],
    ['FACE OFF: Ruiz & Knyba go head to head', 'faceoff'],
    ['Grand Arrivals | Newark fight week', 'grand_arrival'],
    ['Open Workout highlights - Ruiz', 'media_workout'],
    ['Final Press Conference | Ruiz vs Knyba', 'press_conference'],
    ['FULL FIGHT | Andy Ruiz vs Damian Knyba', 'full_fight'],
    ['Ruiz vs Knyba Highlights', 'highlights'],
    ['Official Trailer: Ruiz vs Knyba', 'trailer_promo'],
    ['Fight Week Preview: what to expect', 'fight_preview'],
    ['Round-by-round breakdown', 'analysis'],
    ['Ruiz vs Knyba announced for September 4', 'announcement'],
    ['Knyba sits down before the biggest fight of his life', 'interview'],
    ['Behind the scenes in Newark', 'other'],
  ];
  for (const [title, type] of cases) assert.equal(classifyVideo({ title }).video_type, type, title);
  assert.ok(VIDEO_TYPES.every((t) => VIDEO_TYPE_LABEL[t]));
  assert.ok(classifyVideo({ title: 'Open Workout highlights' }).evidence.length >= 2, 'every hit is kept as evidence');
});

const ctx = {
  events: [
    { id: 'e1', date: '2026-09-04', venue_name: 'Prudential Center', bouts: [
      { id: 'b1', fighters: [{ id: 'f1', name: 'Andres “Andy” Ruiz' }, { id: 'f2', name: 'Damian Knyba' }] },
      { id: 'b2', fighters: [{ id: 'f3', name: 'Kahshad Elliott' }, { id: 'f4', name: 'Jean Pierre Valencia' }] },
    ] },
    { id: 'e2', date: '2026-09-05', venue_name: 'Caribe Royale', bouts: [
      { id: 'b3', fighters: [{ id: 'f5', name: 'Jose Lopez' }, { id: 'f6', name: 'Carlos Ruiz' }] },
    ] },
    { id: 'e9', date: '2026-01-10', venue_name: 'Old Arena', bouts: [{ id: 'b9', fighters: [{ id: 'f2', name: 'Damian Knyba' }, { id: 'f8', name: 'Someone Else' }] }] },
  ],
};

test('video resolution links only unambiguous names inside the window', () => {
  const r = resolveVideo({ title: 'Ruiz vs Knyba | Final Press Conference', published_at: '2026-09-02T18:00:00Z' }, ctx);
  assert.equal(r.bout_id, 'b1');
  assert.equal(r.event_id, 'e1');
  assert.equal(r.confidence, 'high');
  assert.equal(r.link_status, 'published');

  const venue = resolveVideo({ title: 'Fight night at Prudential Center', published_at: '2026-09-03T00:00:00Z' }, ctx);
  assert.equal(venue.event_id, 'e1');
  assert.equal(venue.bout_id, null);
  assert.equal(venue.confidence, 'medium');

  const outside = resolveVideo({ title: 'Ruiz vs Knyba Full Fight', published_at: '2027-03-01T00:00:00Z' }, ctx);
  assert.equal(outside.bout_id, null, 'outside the window nothing attaches');
  assert.equal(outside.link_status, 'review');

  const surnameOnly = resolveVideo({ title: 'Ruiz interview', published_at: '2026-09-03T00:00:00Z' }, ctx);
  assert.deepEqual(surnameOnly.fighter_ids, [], 'a lone shared surname attaches nobody');
  assert.equal(surnameOnly.link_status, 'review');

  const dup = { events: [...ctx.events, { id: 'e3', date: '2026-09-06', venue_name: 'Another Hall', bouts: [{ id: 'b4', fighters: [{ id: 'f7', name: 'Kahshad Elliott' }, { id: 'f10', name: 'Other Man' }] }] }] };
  const amb = resolveVideo({ title: 'Kahshad Elliott weigh-in', published_at: '2026-09-04T00:00:00Z' }, dup);
  assert.deepEqual(amb.fighter_ids, []);
  assert.equal(amb.review_reason, 'ambiguous_fighter_name');
});
