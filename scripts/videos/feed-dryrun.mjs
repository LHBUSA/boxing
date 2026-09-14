#!/usr/bin/env node
// READ-ONLY official video dry run through the YouTube Data API v3. Nothing is stored: no channel is rights-approved
// yet, and the database refuses to enable a channel without verified identity + approved rights + a named reviewer.
//
//   YOUTUBE_API_KEY=... node scripts/videos/feed-dryrun.mjs --context=<event-context.json> --out=<dir> [--channels=scripts/videos/channels.json]
//
// The public RSS feed (youtube.com/feeds/videos.xml) is NOT used: youtube.com/robots.txt disallows /feeds/videos.xml
// and the YouTube Terms of Service only allow automated access that follows robots.txt. The Data API is the
// documented path; it needs an owner-provided API key (free quota; key creation is an owner decision).
//
// For every registered channel: read the uploads playlist (channels.list + playlistItems.list, ~2 quota units),
// classify each upload with shared/videos/classify.mjs, resolve it conservatively with shared/videos/resolve.mjs (bout
// only when BOTH corners are named inside a ±45-day window of a card on verified record; fighters by full name only;
// ambiguity -> review), and report type coverage and the links that WOULD be created once a channel is approved.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { classifyVideo } from '../../shared/videos/classify.mjs';
import { resolveVideo } from '../../shared/videos/resolve.mjs';

const KEY = process.env.YOUTUBE_API_KEY;
if (!KEY) { console.error('YOUTUBE_API_KEY is required (owner-provided). The RSS feed is not used: robots.txt disallows it.'); process.exit(2); }
const arg = (k) => process.argv.slice(2).find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=') ?? null;
const out = arg('out');
const context = JSON.parse(readFileSync(arg('context'), 'utf8'));
const registry = JSON.parse(readFileSync(arg('channels') ?? new URL('./channels.json', import.meta.url), 'utf8'));
const UA = 'PropBetEdge-Boxing-video-research/1.0 (https://propbetedge.ai; official channels; metadata only)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function uploads(channelId) {
  const api = async (path) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}&key=${KEY}`, { headers: { 'user-agent': UA } }); if (!r.ok) throw new Error(`http_${r.status}`); return r.json(); };
  const ch = await api(`channels?part=contentDetails&id=${channelId}`);
  const playlist = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlist) return [];
  const items = await api(`playlistItems?part=snippet,contentDetails&maxResults=25&playlistId=${playlist}`);
  return (items.items ?? []).map((i) => ({ provider_video_id: i.contentDetails?.videoId, title: i.snippet?.title ?? '', published_at: i.contentDetails?.videoPublishedAt ?? i.snippet?.publishedAt ?? null, channel_id: channelId })).filter((v) => v.provider_video_id);
}

const report = { generated_at: new Date().toISOString(), note: 'DRY RUN: nothing stored; no channel is rights-approved.', channels: [], totals: { videos: 0, by_type: {}, would_link: { event: 0, bout: 0, fighter: 0 }, review: 0, no_entity: 0 } };
for (const ch of registry.channels) {
  await sleep(1500);
  let videos = [];
  let feed = 'ok';
  try { videos = await uploads(ch.channel_id); } catch (err) { feed = `error:${String(err.message).slice(0, 80)}`; }
  const rows = videos.map((v) => {
    const c = classifyVideo({ title: v.title });
    const r = resolveVideo(v, context);
    const type = c.video_type ?? c.type ?? 'other';
    report.totals.by_type[type] = (report.totals.by_type[type] ?? 0) + 1;
    if (r.link_status === 'published') { if (r.event_id) report.totals.would_link.event += 1; if (r.bout_id) report.totals.would_link.bout += 1; report.totals.would_link.fighter += r.fighter_ids.length; }
    else if (r.review_reason === 'no_entity_named') report.totals.no_entity += 1; else report.totals.review += 1;
    return { ...v, video_type: type, classification: c, event_id: r.event_id, bout_id: r.bout_id, fighter_ids: r.fighter_ids, link_status: r.link_status, review_reason: r.review_reason };
  });
  report.totals.videos += rows.length;
  report.channels.push({ channel_id: ch.channel_id, name: ch.name, source_class: ch.source_class, rights_state: ch.rights_state, feed, videos: rows.length,
    newest: rows.map((r) => r.published_at).sort().pop() ?? null, linked: rows.filter((r) => r.link_status === 'published').length, rows });
}
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'video-dryrun.json'), `${JSON.stringify(report, null, 1)}\n`);
const md = ['# Official video dry run', '', report.note, '', `Videos in feeds: ${report.totals.videos}. Would link (after approval): events ${report.totals.would_link.event}, bouts ${report.totals.would_link.bout}, fighter links ${report.totals.would_link.fighter}. Review: ${report.totals.review}. No entity named: ${report.totals.no_entity}.`, '',
  '| type | videos |', '|---|---|', ...Object.entries(report.totals.by_type).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`), '',
  '| channel | class | rights | feed | videos | newest | would link |', '|---|---|---|---|---|---|---|', ...report.channels.map((c) => `| ${c.name} | ${c.source_class} | ${c.rights_state} | ${c.feed} | ${c.videos} | ${c.newest ?? '—'} | ${c.linked} |`), '',
  '## Would-link examples', '', ...report.channels.flatMap((c) => c.rows.filter((r) => r.link_status === 'published').map((r) => `- ${c.name}: "${r.title}" (${r.published_at.slice(0, 10)}, ${r.video_type}) -> event ${r.event_id ?? '—'}, bout ${r.bout_id ?? '—'}, fighters ${r.fighter_ids.length}`))];
writeFileSync(join(out, 'video-dryrun.md'), `${md.join('\n')}\n`);
console.log(JSON.stringify(report.totals, null, 1));
