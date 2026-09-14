#!/usr/bin/env node
// READ-ONLY fighter portrait discovery (rule commons_free_license_identity_evidence@1). Writes nothing to any
// database; outputs a candidate report for review and for scripts/media/portrait-import.mjs.
//
//   node scripts/media/portrait-discovery.mjs --fighters=<fighter-export.json> --out=<dir> [--limit=N] [--only=<public_id,...>]
//
// Per canonical fighter, in acquisition-priority order:
//  1. Wikidata search on the canonical name, name variants and stored aliases; keep items whose occupation is
//     boxer (P106 Q11338576) or sport boxing (P641 Q32112). Name similarity is only a SEARCH key.
//  2. BOXER IDENTITY must be proven: a Wikipedia article of that item (en/es sitelink) has a boxing-record table
//     row naming one of our verified opponents on the date of our verified bout (±1 day). Exactly one item may
//     prove it; otherwise the fighter is identity_not_proven / ambiguous.
//  3. IMAGE: the proven item's Wikidata P18 file(s). IMAGE IDENTITY = P18 of that item (plus whether the
//     Commons description/categories name the boxer). RIGHTS from Commons extmetadata: free license only
//     (CC0 / public domain / CC BY / CC BY-SA), author recorded, no deletion/copyvio categories. Red flags
//     (own work by an organization-named account without VRT, unreviewed YouTube/Flickr transfers, very small
//     files, no categories) make the candidate review_required, never approved.
//
// Wikimedia etiquette: one request at a time, identifying User-Agent, maxlag, cached responses.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (k) => process.argv.slice(2).find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=') ?? null;
const fightersPath = arg('fighters');
const out = arg('out');
if (!fightersPath || !out) { console.error('usage: portrait-discovery.mjs --fighters=<file> --out=<dir> [--limit=N] [--only=ids]'); process.exit(2); }
const limit = Number(arg('limit') ?? Infinity);
const only = arg('only') ? new Set(arg('only').split(',')) : null;
const UA = 'PropBetEdge-Boxing-media-research/1.0 (https://propbetedge.ai; editorial identification; low rate)';
export const RULE = 'commons_free_license_identity_evidence@1';
const cacheDir = join(out, 'cache');
mkdirSync(cacheDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const key = createHash('sha1').update(url).digest('hex');
  const file = join(cacheDir, `${key}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  for (let attempt = 0; attempt < 4; attempt++) {
    await sleep(300);
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' } });
    if (res.status === 429 || res.status === 503) { await sleep(5000 * (attempt + 1)); continue; }
    const body = res.ok ? await res.json() : { http_error: res.status };
    if (body?.error?.code === 'maxlag') { await sleep(5000); continue; }
    writeFileSync(file, JSON.stringify(body));
    return body;
  }
  return { http_error: 'retries_exhausted' };
}

const fold = (s) => String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
const tokens = (s) => fold(s).replace(/[“”"][^“”"]*[“”"]/g, ' ').replace(/[^a-z0-9' -]+/g, ' ').split(/\s+/).filter(Boolean);
const SUFFIX = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv']);

export function nameVariants(f) {
  const out = new Set();
  const noNick = String(f.name).replace(/\s*[“"][^”"]*[”"]\s*/g, ' ').replace(/\s+/g, ' ').trim();
  const nick = String(f.name).match(/[“"]([^”"]+)[”"]/)?.[1] ?? f.nickname ?? null;
  const t = noNick.split(' ').filter((w) => !SUFFIX.has(w.toLowerCase()));
  out.add(noNick);
  if (t.length >= 3) { out.add(`${t[0]} ${t[t.length - 1]}`); out.add(`${t[0]} ${t[t.length - 2]}`); out.add(`${t[0]} ${t.slice(-2).join(' ')}`); }
  if (nick && t.length >= 2) { out.add(`${nick} ${t[t.length - 1]}`); if (t.length >= 3) out.add(`${nick} ${t[t.length - 2]}`); }
  for (const a of f.aliases ?? []) out.add(a);
  return [...out].filter((x) => x.split(' ').length >= 2).slice(0, 7);
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function datePatterns(iso) {
  const pats = [];
  for (const delta of [0, -1, 1]) {
    const d = new Date(Date.parse(`${iso}T12:00:00Z`) + delta * 86_400_000);
    const Y = d.getUTCFullYear(); const M = d.getUTCMonth(); const D = d.getUTCDate();
    const mm = String(M + 1).padStart(2, '0'); const dd = String(D).padStart(2, '0');
    const mon = MONTHS[M].slice(0, 3);
    pats.push(`${MONTHS[M]} ${D}, ${Y}`, `${mon} ${D}, ${Y}`, `${D} ${MONTHS[M]} ${Y}`, `${D} ${mon} ${Y}`, `${Y}-${mm}-${dd}`,
      `dts ${Y} ${mm} ${dd}`, `dts ${Y} ${M + 1} ${D}`, `dts ${D} ${MONTHS[M]} ${Y}`, `dts ${MONTHS[M]} ${D} ${Y}`, `${D} de ${MESES[M]} de ${Y}`, `${dd}/${mm}/${Y}`, `${D}.${M + 1}.${Y}`);
  }
  return pats.map((p) => fold(p));
}

// A record-table row (or bullet line) naming one of our opponents on our bout date.
export function findBoutEvidence(wikitext, bouts) {
  const rows = String(wikitext ?? '').split(/\n\|-|\n\*/);
  for (const b of bouts) {
    if (!b.date) continue;
    const dates = datePatterns(b.date);
    const opps = (b.opponents ?? []).map((o) => tokens(o).filter((w) => w.length >= 3 && !SUFFIX.has(w))).filter((t) => t.length);
    for (const row of rows) {
      const flat = fold(row).replace(/\{\{|\}\}|\[\[|\]\]/g, ' ').replace(/\|/g, ' ').replace(/[ \t]+/g, ' ');
      if (!dates.some((p) => flat.includes(p))) continue;
      for (const o of opps) {
        const surname = o[o.length - 1];
        const alt = o.length >= 3 ? o[o.length - 2] : null;
        const hit = [surname, alt].filter(Boolean).find((w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(flat));
        if (hit) return { bout_date: b.date, opponent: (b.opponents ?? []).join(' / '), matched_token: hit, row_excerpt: row.replace(/\s+/g, ' ').trim().slice(0, 300) };
      }
    }
  }
  return null;
}

const strip = (html) => String(html ?? '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/\s+/g, ' ').trim();

export function assessImage(meta, info, fighter) {
  const flags = [];
  const license = strip(meta.LicenseShortName?.value);
  const author = strip(meta.Artist?.value);
  const credit = strip(meta.Credit?.value);
  const description = strip(meta.ImageDescription?.value);
  const categories = String(meta.Categories?.value ?? '').split('|').filter(Boolean);
  const nonFree = /fair use|non-free|nonfree/i.test(license) || meta.NonFree?.value === 'true';
  const free = /^(cc0|public domain|pd\b|pd-|cc[ -]by(-sa)?[ -]\d)/i.test(license);
  if (nonFree || !free) return { state: 'rejected', reason: `license_not_free:${license || 'none'}`, license, author, credit, description, categories, flags };
  if (categories.some((c) => /deletion request|copyright violation|possible copyright|no permission|no source/i.test(c))) return { state: 'rejected', reason: 'deletion_or_copyright_category', license, author, credit, description, categories, flags };
  if (!author) flags.push('no_author');
  if (!categories.length) flags.push('no_categories');
  if (Math.min(info.width ?? 0, info.height ?? 0) < 300) flags.push('very_small_file');
  const ownWork = /own work/i.test(credit);
  const orgAccount = /(promotion|promo|boxing|llc|inc\b|entertainment|official|media|management|productions|studios?)/i.test(`${author} ${info.user ?? ''}`);
  const vrt = categories.some((c) => /VRT|OTRS|permission received|ticket/i.test(c)) || /VRT|OTRS|ticket/i.test(strip(meta.Permission?.value));
  if (ownWork && orgAccount && !vrt) flags.push('own_work_by_organization_account_without_vrt');
  if (/youtube/i.test(`${credit} ${description}`) && !categories.some((c) => /license review|reviewed|YouTube CC-BY/i.test(c))) flags.push('youtube_transfer_without_license_review');
  if (/flickr/i.test(`${credit} ${description}`) && !categories.some((c) => /reviewed|license review|FlickreviewR/i.test(c))) flags.push('flickr_transfer_without_review');
  const surnames = tokens(fighter.name).filter((w) => w.length >= 3 && !SUFFIX.has(w)).slice(-2);
  const namesBoxer = surnames.some((s) => fold(`${description} ${categories.join(' ')}`).includes(s));
  return { state: flags.length ? 'review_required' : 'approvable', reason: flags.join(',') || null, license, license_url: meta.LicenseUrl?.value ?? null, author, credit, description: description.slice(0, 300),
    categories: categories.slice(0, 20), date: strip(meta.DateTimeOriginal?.value) || null, description_or_category_names_boxer: namesBoxer, flags };
}

function priority(f) {
  const recent = (f.bouts ?? []).map((b) => b.date).sort().pop() ?? '0000';
  const main = (f.bouts ?? []).filter((b) => b.main_event).length;
  const title = (f.bouts ?? []).some((b) => b.title_bout) ? 1 : 0;
  const upcoming = (f.bouts ?? []).some((b) => b.date >= new Date().toISOString().slice(0, 10)) ? 1 : 0;
  return upcoming * 1e9 + title * 1e8 + main * 1e7 + (f.bouts?.length ?? 0) * 1e6 + Number(recent.replaceAll('-', '')) / 100;
}

async function discover(f) {
  const rec = { public_id: f.public_id, name: f.name, bouts: f.bouts?.length ?? 0, main_events: (f.bouts ?? []).filter((b) => b.main_event).length, existing_portrait_state: f.portrait_state ?? null };
  const qids = new Set();
  for (const v of nameVariants(f)) {
    const r = await getJson(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&uselang=en&type=item&limit=7&maxlag=5&search=${encodeURIComponent(v)}`);
    for (const s of r.search ?? []) qids.add(s.id);
  }
  if (!qids.size) return { ...rec, status: 'no_wikidata_candidate' };
  const ents = await getJson(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&maxlag=5&props=claims|sitelinks|labels&languages=en&ids=${[...qids].slice(0, 50).join('|')}`);
  const claimIds = (e, p) => (e.claims?.[p] ?? []).map((c) => c.mainsnak?.datavalue?.value?.id ?? c.mainsnak?.datavalue?.value).filter(Boolean);
  const boxers = Object.values(ents.entities ?? {}).filter((e) => claimIds(e, 'P106').includes('Q11338576') || claimIds(e, 'P641').includes('Q32112'));
  if (!boxers.length) return { ...rec, status: 'no_boxer_item', searched_items: qids.size };
  const candidates = [];
  for (const e of boxers) {
    const cand = { qid: e.id, label: e.labels?.en?.value ?? null, sitelinks: Object.keys(e.sitelinks ?? {}).filter((k) => /^(en|es)wiki$/.test(k)), p18: claimIds(e, 'P18'), p373: claimIds(e, 'P373')[0] ?? null, evidence: null };
    for (const wiki of ['enwiki', 'eswiki']) {
      const title = e.sitelinks?.[wiki]?.title;
      if (!title || cand.evidence) continue;
      const lang = wiki.slice(0, 2);
      const page = await getJson(`https://${lang}.wikipedia.org/w/api.php?action=parse&format=json&formatversion=2&prop=wikitext&redirects=1&maxlag=5&page=${encodeURIComponent(title)}`);
      const ev = findBoutEvidence(page.parse?.wikitext, f.bouts ?? []);
      if (ev) cand.evidence = { wiki, title, url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`, ...ev };
    }
    candidates.push(cand);
  }
  const proven = candidates.filter((c) => c.evidence);
  if (proven.length !== 1) return { ...rec, status: proven.length ? 'identity_ambiguous' : 'identity_not_proven', candidates };
  const item = proven[0];
  const identity = { qid: item.qid, label: item.label, rule: 'wikidata_boxer_item_with_wikipedia_record_row_of_our_bout', ...item.evidence };
  const files = item.p18.map((file) => ({ file, via: 'wikidata_p18' }));
  if (item.p373) {
    // the boxer's own Commons category (P373 of the proven item): candidates only when the file description names the boxer
    const cat = await getJson(`https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&maxlag=5&list=categorymembers&cmtype=file&cmlimit=20&cmtitle=${encodeURIComponent(`Category:${item.p373}`)}`);
    for (const m of cat.query?.categorymembers ?? []) {
      const file = m.title.replace(/^File:/, '');
      if (/\.(jpe?g|png|webp|tiff?)$/i.test(file) && !files.some((x) => x.file === file)) files.push({ file, via: 'commons_category_of_item' });
    }
  }
  if (!files.length) return { ...rec, status: 'identity_proven_no_image', identity, commons_category: item.p373 };
  const images = [];
  for (const { file, via } of files.slice(0, 12)) {
    const q = await getJson(`https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&maxlag=5&prop=imageinfo&iiprop=url|size|sha1|extmetadata|user|mime&iiurlwidth=1600&titles=${encodeURIComponent(`File:${file}`)}`);
    const pageInfo = q.query?.pages?.[0];
    const info = pageInfo?.imageinfo?.[0];
    if (!info) { images.push({ file, state: 'rejected', reason: 'file_not_found' }); continue; }
    const a = assessImage(info.extmetadata ?? {}, info, f);
    if (via === 'commons_category_of_item' && a.state === 'approvable') {
      // not the item's chosen image: approvable only as a single-subject file whose description names the boxer in full
      const label = fold(item.label ?? '').replace(/\s*\(.*\)$/, '');
      const desc = fold(`${a.description} ${file}`).replace(/[_]/g, ' ');
      if (!label || !desc.includes(label)) Object.assign(a, { state: 'review_required', reason: 'category_file_description_does_not_name_the_boxer' });
      else if (/\b(and|vs\.?|versus|with|y|con)\b|,/.test(fold(a.description))) Object.assign(a, { state: 'review_required', reason: 'category_file_may_show_more_than_one_person' });
    }
    images.push({ file, via, page_url: info.descriptionurl, original_url: info.url, thumb_url: info.thumburl ?? null, width: info.width, height: info.height, mime: info.mime, sha1: info.sha1, uploader: info.user,
      image_identity: [via, ...(a.description_or_category_names_boxer ? ['commons_description_or_category_names_boxer'] : [])], ...a });
  }
  const best = images.filter((i) => i.state === 'approvable').sort((x, y) => (x.via === 'wikidata_p18' ? 0 : 1) - (y.via === 'wikidata_p18' ? 0 : 1) || (y.width * y.height) - (x.width * x.height))[0];
  const status = best ? 'approvable' : images.some((i) => i.state === 'review_required') ? 'review_required' : 'rejected';
  return { ...rec, status, identity, commons_category: item.p373, images, selected: best?.file ?? null };
}

const data = JSON.parse(readFileSync(fightersPath, 'utf8'));
const fighters = data.fighters.filter((f) => (f.bouts?.length ?? 0) > 0 && (!only || only.has(f.public_id))).sort((a, b) => priority(b) - priority(a)).slice(0, limit);
const results = [];
for (const [i, f] of fighters.entries()) {
  try { results.push(await discover(f)); } catch (err) { results.push({ public_id: f.public_id, name: f.name, status: 'error', error: String(err.message).slice(0, 200) }); }
  if ((i + 1) % 25 === 0) { console.error(`${i + 1}/${fighters.length}`); writeFileSync(join(out, 'portrait-candidates.partial.json'), JSON.stringify(results)); }
}
const counts = results.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {});
writeFileSync(join(out, 'portrait-candidates.json'), `${JSON.stringify({ rule: RULE, generated_at: new Date().toISOString(), fighters_considered: fighters.length, counts, results }, null, 1)}\n`);
console.log(JSON.stringify({ fighters: fighters.length, counts }, null, 1));
