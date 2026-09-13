// Positioned text from official PDF documents (pdf.js via unpdf; runs in Node
// and Cloudflare Workers). Returns pages of { s, x, y, w } items, top of page
// = larger y. Callers drop sensitive columns before anything is persisted.

export async function extractPositionedText(bytes) {
  const { getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    pages.push({
      page: n,
      width: Math.round(vp.width),
      height: Math.round(vp.height),
      items: tc.items.filter((i) => i.str && i.str.trim())
        .map((i) => ({ s: i.str.replace(/\s+/g, ' ').trim(), x: Math.round(i.transform[4]), y: Math.round(i.transform[5]), w: Math.round(i.width) })),
    });
  }
  await pdf.destroy?.();
  return pages;
}

// Groups items into visual lines (same y within tolerance), left to right.
export function lines(items, { tolerance = 2 } = {}) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const out = [];
  for (const it of sorted) {
    const line = out.find((l) => Math.abs(l.y - it.y) <= tolerance);
    if (line) line.items.push(it);
    else out.push({ y: it.y, items: [it] });
  }
  for (const l of out) {
    l.items.sort((a, b) => a.x - b.x);
    l.text = l.items.map((i) => i.s).join(' ').replace(/\s+([,.])/g, '$1').replace(/\s{2,}/g, ' ').trim();
  }
  return out.sort((a, b) => b.y - a.y);
}

export async function sha256Bytes(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
