import { INDEXABLE, PUBLIC_URL } from "@/lib/posture";
import { gateway } from "@/lib/gateway";
import { eventPath, fighterPath, refOf } from "@/lib/slug";

// Production sitemap, launch mode only. In build mode (LAUNCH_APPROVED = false) this answers 404 before reading
// anything, so no crawler is ever handed the site's address list.
export const revalidate = 3600;

const STATIC = ["/", "/fight-week", "/events", "/events?scope=results", "/fighters", "/scorecards", "/judges", "/referees", "/titles", "/rankings", "/promoters", "/news", "/hall-of-fame", "/history", "/methodology"];
const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET(): Promise<Response> {
  if (!INDEXABLE) return new Response("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex, nofollow", "Content-Type": "text/plain; charset=utf-8" } });
  const urls: { loc: string; lastmod?: string }[] = STATIC.map((p) => ({ loc: `${PUBLIC_URL}${p}` }));
  for (let offset = 0; offset < 5000; offset += 100) {
    const page = await gateway.events("all", { limit: 100, offset });
    if (!page.ok) break;
    for (const e of page.data.rows) urls.push({ loc: `${PUBLIC_URL}${eventPath(e)}`, lastmod: e.date });
    if (page.data.rows.length < 100) break;
  }
  for (let offset = 0; offset < 20000; offset += 100) {
    const page = await gateway.fighters({ limit: 100, offset });
    if (!page.ok) break;
    for (const f of page.data.rows) urls.push({ loc: `${PUBLIC_URL}${fighterPath(f)}`, lastmod: f.last_date ?? undefined });
    if (page.data.rows.length < 100) break;
  }
  for (const role of ["judge", "referee"] as const) {
    const page = await gateway.officials(role, { limit: 500 });
    if (page.ok) for (const o of page.data.rows) urls.push({ loc: `${PUBLIC_URL}/officials/${refOf(o.public_id)}` });
  }
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${xml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
