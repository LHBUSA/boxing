#!/usr/bin/env node
// Imports APPROVABLE portrait candidates (scripts/media/portrait-discovery.mjs) into PropBetEdge storage and the
// registry scripts/media/portraits.json. Dry run by default.
//
//   node scripts/media/portrait-import.mjs --candidates=<portrait-candidates.json> [--write]
//
// For each approvable candidate whose fighter has no approved portrait yet:
//   * downloads the Commons original once (identifying User-Agent) and verifies it against the Commons SHA-1
//   * stores derivatives under web/public/media/boxers: <hex>.jpg (card 768x768), <hex>/hero.jpg (original aspect,
//     max 1600 wide), <hex>/wide.jpg (1200x675), <hex>/square.jpg (512), <hex>/avatar.jpg (160). Nothing is hotlinked.
//   * records license, license URL, author, credit, source page, original URL, SHA-1/SHA-256, dimensions,
//     retrieval time, boxer identity evidence and image identity evidence under rule commons_free_license_identity_evidence@1.
// review_required / rejected candidates are recorded in the registry's held/rejected lists (never rendered).

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const sharp = createRequire(join(ROOT, 'web/package.json'))('sharp');
const arg = (k) => process.argv.slice(2).find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=') ?? null;
const write = process.argv.includes('--write');
const UA = 'PropBetEdge-Boxing-media-research/1.0 (https://propbetedge.ai; editorial identification; low rate)';
const RULE = 'commons_free_license_identity_evidence@1';
const registryPath = join(ROOT, 'scripts/media/portraits.json');
const mediaDir = join(ROOT, 'web/public/media/boxers');
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const candidates = JSON.parse(readFileSync(arg('candidates'), 'utf8'));
const now = new Date().toISOString();
const hexOf = (publicId) => publicId.replace(/^pbe_boxer_/, '').slice(0, 12);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const has = (list, id) => (list ?? []).some((x) => x.public_id === id);

const plan = { import: [], held: [], rejected: [], skipped_existing: [] };
for (const r of candidates.results) {
  if (!['approvable', 'review_required', 'rejected'].includes(r.status)) continue;
  if (has(registry.approved, r.public_id)) { plan.skipped_existing.push(r.name); continue; }
  const identityEvidence = `Wikidata ${r.identity.qid} (${r.identity.label}) is a boxer item; ${r.identity.wiki} article '${r.identity.title}' has a record row naming ${r.identity.opponent} on ${r.identity.bout_date}, our verified bout. Row: ${r.identity.row_excerpt}`;
  if (r.status === 'approvable') {
    const img = r.images.find((i) => i.file === r.selected);
    plan.import.push({ r, img, identityEvidence });
  } else {
    const entry = { name: r.name, public_id: r.public_id, wikidata_qid: r.identity.qid, identity_evidence: identityEvidence, researched_at: now,
      candidates: r.images.map((i) => ({ commons_file: `File:${i.file}`, commons_page_url: i.page_url, original_url: i.original_url, width: i.width, height: i.height, license: i.license, author: i.author, credit: i.credit, via: i.via, state: i.state, reason: i.reason })) };
    (r.status === 'review_required' ? plan.held : plan.rejected).push(entry);
  }
}

if (!write) {
  console.log(JSON.stringify({ dry_run: true, import: plan.import.map((p) => `${p.r.name} <- ${p.img.file} (${p.img.license}, ${p.img.width}x${p.img.height})`), held: plan.held.map((h) => h.name), rejected: plan.rejected.map((h) => h.name), skipped_existing: plan.skipped_existing }, null, 1));
  process.exit(0);
}

const imported = [];
for (const { r, img, identityEvidence } of plan.import) {
  await sleep(1000);
  const res = await fetch(img.original_url, { headers: { 'user-agent': UA } });
  if (!res.ok) { console.error(`download failed ${res.status} ${img.original_url}`); continue; }
  const bytes = Buffer.from(await res.arrayBuffer());
  const sha1 = createHash('sha1').update(bytes).digest('hex');
  if (img.sha1 && sha1 !== img.sha1) { console.error(`sha1 mismatch for ${img.file}; skipped`); continue; }
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const hex = hexOf(r.public_id);
  mkdirSync(join(mediaDir, hex), { recursive: true });
  const base = sharp(bytes, { failOn: 'none' }).rotate();
  const jpeg = { quality: 82, mozjpeg: true };
  await base.clone().resize({ width: 768, height: 768, fit: 'cover', position: 'north' }).jpeg(jpeg).toFile(join(mediaDir, `${hex}.jpg`));
  const hero = await base.clone().resize({ width: 1600, withoutEnlargement: true }).jpeg(jpeg).toFile(join(mediaDir, hex, 'hero.jpg'));
  await base.clone().resize({ width: 1200, height: 675, fit: 'cover', position: 'north' }).jpeg(jpeg).toFile(join(mediaDir, hex, 'wide.jpg'));
  await base.clone().resize({ width: 512, height: 512, fit: 'cover', position: 'north' }).jpeg(jpeg).toFile(join(mediaDir, hex, 'square.jpg'));
  await base.clone().resize({ width: 160, height: 160, fit: 'cover', position: 'north' }).jpeg(jpeg).toFile(join(mediaDir, hex, 'avatar.jpg'));
  const entry = {
    public_id: r.public_id, name: r.name, file: `${hex}.jpg`, width: 768, height: 768,
    license: img.license, license_url: img.license_url, author: img.author, credit: img.credit || `Wikimedia Commons: ${img.file}`,
    source_url: img.page_url, original_url: img.original_url, original_width: img.width, original_height: img.height, mime: img.mime,
    sha1, sha256, retrieved_at: now, wikidata_qid: r.identity.qid, identity_evidence: identityEvidence,
    image_identity_evidence: `${img.image_identity.join('; ')}; Commons description: ${img.description || '(none)'}`, commons_categories: img.categories,
    year: img.date ? String(img.date).match(/\d{4}/)?.[0] ?? null : null, asset_url: `/media/boxers/${hex}.jpg`, focus: '50% 30%',
    derivatives: { card: `/media/boxers/${hex}.jpg`, hero: `/media/boxers/${hex}/hero.jpg`, hero_width: hero.width, hero_height: hero.height, wide: `/media/boxers/${hex}/wide.jpg`, square: `/media/boxers/${hex}/square.jpg`, avatar: `/media/boxers/${hex}/avatar.jpg` },
    rule: RULE,
  };
  registry.approved.push(entry);
  imported.push(entry.name);
}
const upsert = (list, entries) => { for (const e of entries) { const i = list.findIndex((x) => x.public_id === e.public_id); if (i >= 0) list[i] = { ...list[i], ...e }; else list.push(e); } };
registry.held_for_owner_review ??= [];
registry.rejected ??= [];
upsert(registry.held_for_owner_review, plan.held.filter((h) => !has(registry.approved, h.public_id)));
upsert(registry.rejected, plan.rejected.filter((h) => !has(registry.approved, h.public_id) && !has(registry.held_for_owner_review, h.public_id)));
registry.researched_at = now;
writeFileSync(registryPath, `${JSON.stringify(registry, null, 1)}\n`);
console.log(JSON.stringify({ imported, held: plan.held.length, rejected: plan.rejected.length, approved_total: registry.approved.length }, null, 1));
