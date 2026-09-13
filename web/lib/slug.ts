// URLs carry a readable slug plus the first 12 hex chars of the immutable public
// id. Lookups use only the id part; a changed display name redirects to the
// canonical slug instead of breaking.

export function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[“”"'’‘]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "");
}

export const refOf = (publicId: string): string => publicId.slice(-32).slice(0, 12);

export function parseRef(slug: string): string | null {
  const m = decodeURIComponent(slug).toLowerCase().match(/(?:^|-)([0-9a-f]{12,32})$/);
  return m ? m[1] : null;
}

export const eventPath = (e: { public_id: string; name: string; date: string }) => `/events/${slugify(e.name)}-${e.date}-${refOf(e.public_id)}`;
export const fighterPath = (f: { public_id: string; name: string }) => `/fighters/${slugify(f.name)}-${refOf(f.public_id)}`;
export function boutPath(b: { public_id: string; a?: { name: string } | null; b?: { name: string } | null }): string {
  const names = [b.a?.name, b.b?.name].filter(Boolean).map((n) => slugify(n as string));
  return `/fights/${names.length === 2 ? `${names[0]}-vs-${names[1]}-` : ""}${refOf(b.public_id)}`;
}
