#!/usr/bin/env node
// Builds the standard derivative set for every APPROVED portrait in scripts/media/portraits.json and writes the
// manifest the web app reads (web/lib/portrait-derivatives.json).
//
//   node scripts/media/derivatives.mjs            # report what is missing
//   node scripts/media/derivatives.mjs --write    # build the missing derivatives and rewrite the manifest
//
// Derivatives are produced from the stored local asset only — nothing is refetched and no source file is overwritten:
//   hero   4:5  up to 1000x1250   fighter dossier / poster
//   card   4:5  up to  800x1000   fighter cards, faceoff
//   wide  16:9  up to 1200x675    event and fight context strips
//   square 1:1  up to  512        directory tiles, related fighters
//   avatar 1:1  up to  160        table rows, bout lines, small lists
//
// Crops are focus-aware and deterministic: the largest rectangle of the target aspect that fits the source is centred on
// the portrait's focus point (registry `focus`, or `focus_by_variant` when an operator has tuned one), clamped to the
// image. The same input therefore always produces the same output, and a portrait whose face sits high in frame keeps
// its head in every crop instead of being centre-cropped into a forehead.
//
// The manifest is a build-time artifact: the media registry stays the source of truth, boxing_fighter_media is
// untouched, and no migration is involved.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const sharp = createRequire(join(ROOT, 'web/package.json'))('sharp');
const write = process.argv.includes('--write');
const registryPath = join(ROOT, 'scripts/media/portraits.json');
const mediaDir = join(ROOT, 'web/public/media/boxers');
const manifestPath = join(ROOT, 'web/lib/portrait-derivatives.ts');
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const hexOf = (publicId) => publicId.replace(/^pbe_boxer_/, '').slice(0, 12);

export const VARIANTS = {
  hero: { aspect: 4 / 5, width: 1000, height: 1250 },
  card: { aspect: 4 / 5, width: 800, height: 1000 },
  wide: { aspect: 16 / 9, width: 1200, height: 675 },
  square: { aspect: 1, width: 512, height: 512 },
  avatar: { aspect: 1, width: 160, height: 160 },
};
const JPEG = { quality: 82, mozjpeg: true };

// "50% 30%" -> { x: 0.5, y: 0.3 }; anything unparseable falls back to the head-biased default.
export function parseFocus(focus) {
  const m = /^\s*(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%\s*$/.exec(focus ?? '');
  return m ? { x: Number(m[1]) / 100, y: Number(m[2]) / 100 } : { x: 0.5, y: 0.28 };
}

// The largest rectangle of `aspect` inside WxH, centred on the focus point and clamped to the image.
export function cropBox(W, H, aspect, focus) {
  let w = Math.min(W, Math.round(H * aspect));
  let h = Math.round(w / aspect);
  if (h > H) { h = H; w = Math.round(h * aspect); }
  const left = Math.max(0, Math.min(W - w, Math.round(focus.x * W - w / 2)));
  const top = Math.max(0, Math.min(H - h, Math.round(focus.y * H - h / 2)));
  return { left, top, width: w, height: h };
}

const report = { approved: registry.approved.length, built: [], skipped_present: [], missing_source: [], manifest: {} };

for (const entry of registry.approved) {
  const hex = hexOf(entry.public_id);
  const source = join(mediaDir, entry.file ?? `${hex}.jpg`);
  if (!existsSync(source)) { report.missing_source.push({ name: entry.name, source }); continue; }
  const meta = await sharp(source).metadata();
  const focusBase = parseFocus(entry.focus ?? entry.crop_hint);
  const out = {};
  for (const [variant, spec] of Object.entries(VARIANTS)) {
    const file = join(mediaDir, hex, `${variant}.jpg`);
    const url = `/media/boxers/${hex}/${variant}.jpg`;
    const focus = parseFocus(entry.focus_by_variant?.[variant] ?? entry.focus ?? entry.crop_hint) ?? focusBase;
    const box = cropBox(meta.width, meta.height, spec.aspect, focus);
    const width = Math.min(spec.width, box.width);
    const height = Math.round(width / spec.aspect);
    if (existsSync(file) && !process.argv.includes('--force')) {
      const s = statSync(file);
      const m = await sharp(file).metadata();
      out[variant] = { url, width: m.width, height: m.height, bytes: s.size };
      report.skipped_present.push(`${entry.name} ${variant}`);
      continue;
    }
    if (write) {
      mkdirSync(join(mediaDir, hex), { recursive: true });
      await sharp(source, { failOn: 'none' }).rotate().extract(box).resize({ width, height, fit: 'cover' }).jpeg(JPEG).toFile(file);
      const s = statSync(file);
      out[variant] = { url, width, height, bytes: s.size };
      report.built.push(`${entry.name} ${variant} ${width}x${height}`);
    } else {
      out[variant] = { url, width, height, bytes: null };
      report.built.push(`${entry.name} ${variant} ${width}x${height} (dry run)`);
    }
  }
  report.manifest[hex] = {
    name: entry.name,
    source: entry.asset_url ?? `/media/boxers/${entry.file}`,
    source_width: meta.width,
    source_height: meta.height,
    sha256: entry.sha256 ?? createHash('sha256').update(readFileSync(source)).digest('hex'),
    focus: entry.focus ?? entry.crop_hint ?? null,
    variants: out,
  };
}

if (write) {
  const manifest = { generated_at: new Date().toISOString(), variants: VARIANTS, portraits: report.manifest };
  const header = [
    '// GENERATED by scripts/media/derivatives.mjs — do not edit by hand.',
    '//',
    '// Derivative crops of APPROVED portraits only (scripts/media/portraits.json). The registry and',
    '// boxing_fighter_media remain the source of truth for rights; this file only says which local crop exists for',
    '// which shape, so the UI can pick the right one. Every url is a local /media/ path: nothing is hotlinked.',
    '',
    `export const PORTRAIT_MANIFEST = ${JSON.stringify(manifest, null, 1)} as const;`,
    '',
    'export default PORTRAIT_MANIFEST;',
    '',
  ].join('\n');
  writeFileSync(manifestPath, header);
}
console.log(JSON.stringify({
  approved: report.approved,
  built: report.built.length,
  already_present: report.skipped_present.length,
  missing_source: report.missing_source,
  portraits_in_manifest: Object.keys(report.manifest).length,
  wrote_manifest: write ? manifestPath.replace(ROOT, '') : null,
  detail: report.built.slice(0, 12),
}, null, 1));
