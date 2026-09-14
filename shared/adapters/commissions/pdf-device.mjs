// Device-space extraction for official PDF FORMS whose meaning includes drawn marks (Tennessee result sheets).
//
// Text items and small filled/stroked path boxes are transformed through the page viewport, so a page stored with
// /Rotate 90 and an upright page come out in the same orientation. Coordinates are returned "y up" (top of page =
// larger y, like pdf.mjs), i.e. y = viewport.height - device_y, so pdf.mjs lines() works unchanged.
//
// marks: bounding boxes (x, y, w, h; y = box centre, y up) of drawn paths no larger than maxMark points. A selected
// radio button on a flattened form is exactly such a mark (its inner dot); unselected radios draw only their rings.
// No path content, image or form value beyond those boxes is read.

const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

export async function extractDeviceText(bytes, { maxMark = 4.5, minMark = 1.2 } = {}) {
  const { getDocumentProxy, getResolvedPDFJS } = await import('unpdf');
  const { OPS } = await getResolvedPDFJS();
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const pages = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const vt = vp.transform;
    const tc = await page.getTextContent();
    const items = tc.items.filter((i) => i.str && i.str.trim()).map((i) => {
      const [dx, dy] = apply(vt, i.transform[4], i.transform[5]);
      return { s: i.str.replace(/\s+/g, ' ').trim(), x: Math.round(dx), y: Math.round(vp.height - dy), w: Math.round(i.width) };
    });
    const ol = await page.getOperatorList();
    let ctm = [1, 0, 0, 1, 0, 0];
    const stack = [];
    const marks = [];
    for (let k = 0; k < ol.fnArray.length; k++) {
      const fn = ol.fnArray[k];
      const a = ol.argsArray[k];
      if (fn === OPS.save) stack.push(ctm);
      else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
      else if (fn === OPS.transform) ctm = mul(ctm, a);
      else if (fn === OPS.constructPath) {
        const mm = a?.[2] ?? a?.at?.(-1);
        if (!mm || mm.length < 4 || !mm.every(Number.isFinite)) continue;
        const pts = [[mm[0], mm[1]], [mm[2], mm[3]]].map(([x, y]) => apply(vt, ...apply(ctm, x, y)));
        const [x0, x1] = [Math.min(pts[0][0], pts[1][0]), Math.max(pts[0][0], pts[1][0])];
        const [y0, y1] = [Math.min(pts[0][1], pts[1][1]), Math.max(pts[0][1], pts[1][1])];
        const w = x1 - x0; const h = y1 - y0;
        if (w >= minMark && h >= minMark && w <= maxMark && h <= maxMark) {
          marks.push({ x: Math.round(((x0 + x1) / 2) * 10) / 10, y: Math.round((vp.height - (y0 + y1) / 2) * 10) / 10, w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10 });
        }
      }
    }
    // the same dot is often drawn twice (fill and stroke): keep one box per position
    const seen = new Set();
    pages.push({ page: n, width: Math.round(vp.width), height: Math.round(vp.height), rotate: page.rotate, items,
      marks: marks.filter((m) => { const key = `${Math.round(m.x)}|${Math.round(m.y)}`; if (seen.has(key)) return false; seen.add(key); return true; }) });
  }
  await pdf.destroy?.();
  return pages;
}
