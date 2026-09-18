#!/usr/bin/env node
// Responsive QA: loads pages in headless Edge/Chrome at each width and reports anything that breaks the layout —
// horizontal overflow, elements wider than the viewport, clipped text, and images with no intrinsic size.
//
//   node web/scripts/viewport-qa.mjs --base=http://localhost:3400 --paths=/,/fighters --widths=390,768,1440
//   node web/scripts/viewport-qa.mjs --paths=/ --widths=390 --shots=D:\tmp\shots   # also save a screenshot per width
//
// Uses the DevTools protocol over Node's built-in WebSocket: no extra dependency, no browser extension. Emulation sets
// the real layout viewport, which a plain `--window-size --screenshot` run does not: that lays the page out wide and
// crops the image, which looks exactly like a mobile overflow bug and is not one.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const BASE = arg('base', 'http://localhost:3400');
const PATHS = arg('paths', '/').split(',').filter(Boolean);
const WIDTHS = arg('widths', '390,768,1440').split(',').map(Number);
const SHOTS = arg('shots', null);
const BROWSERS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
];
const bin = BROWSERS.find((b) => existsSync(b));
if (!bin) { console.error('no Edge/Chrome binary found'); process.exit(2); }

const port = 9222 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'pbe-qa-'));
const child = spawn(bin, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--headless=new', '--disable-gpu',
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('browser did not expose a debugging target');
}

const REPORT = `(() => {
  const vw = document.documentElement.clientWidth;
  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const style = getComputedStyle(el);
    if (style.position === 'fixed') continue;
    const scrolls = el.scrollWidth > el.clientWidth + 1 && ['visible', 'clip'].includes(style.overflowX);
    const past = r.right > vw + 1;
    if (!scrolls && !past) continue;
    const id = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : '');
    bad.push({ el: id, right: Math.round(r.right), width: Math.round(r.width), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth,
      text: (el.textContent || '').trim().slice(0, 40) });
  }
  const imgs = [...document.images].map((i) => ({ src: i.currentSrc || i.src, w: i.getAttribute('width'), h: i.getAttribute('height'),
    natural: i.naturalWidth, rendered: Math.round(i.getBoundingClientRect().width), loading: i.loading, broken: i.complete && i.naturalWidth === 0 }));
  return JSON.stringify({ vw, docScroll: document.documentElement.scrollWidth, bodyScroll: document.body.scrollWidth,
    overflow: bad.slice(0, 12), overflowCount: bad.length, images: imgs });
})()`;

const ws = new WebSocket(await target());
await new Promise((r) => { ws.onopen = r; });
let seq = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
};
const send = (method, params = {}) => new Promise((resolve) => { const id = ++seq; pending.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });

await send('Page.enable');
await send('Runtime.enable');
const findings = [];
for (const width of WIDTHS) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 700 });
  for (const path of PATHS) {
    await send('Page.navigate', { url: `${BASE}${path}` });
    await sleep(2500);
    const res = await send('Runtime.evaluate', { expression: REPORT, returnByValue: true, awaitPromise: false });
    const data = JSON.parse(res.result?.result?.value ?? '{}');
    const overflowing = (data.overflow ?? []).filter((o) => o.right > data.vw + 1);
    const brokenImages = (data.images ?? []).filter((i) => i.broken);
    const remoteImages = (data.images ?? []).filter((i) => /^https?:/.test(i.src) && !i.src.startsWith(BASE));
    const oversized = (data.images ?? []).filter((i) => i.rendered > 0 && i.natural > i.rendered * 3 + 50);
    if (SHOTS) {
      mkdirSync(SHOTS, { recursive: true });
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      const name = `${(path === '/' ? 'home' : path.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, ''))}-${width}.png`;
      if (shot.result?.data) writeFileSync(join(SHOTS, name), Buffer.from(shot.result.data, 'base64'));
    }
    findings.push({ width, path, doc_scroll: data.docScroll, viewport: data.vw, overflowing: overflowing.length, worst: overflowing.slice(0, 4),
      images: data.images?.length ?? 0, broken_images: brokenImages.length, remote_images: remoteImages.map((i) => i.src),
      oversized_images: oversized.map((i) => `${i.src} ${i.natural}px natural into ${i.rendered}px`) });
  }
}
ws.close();
child.kill();
const fail = findings.filter((f) => f.doc_scroll > f.viewport + 1 || f.broken_images || f.remote_images.length);
console.log(JSON.stringify({ base: BASE, findings, failures: fail.length }, null, 1));
process.exit(fail.length ? 1 : 0);
