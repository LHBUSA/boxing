// Portrait asset selection. Pure and testable: the component layer only renders what this returns.
//
// Rights rule, unchanged: only a portrait the gateway returns may be shown, and the gateway returns one only when the
// registry row is approved, credited, licensed and identity-evidenced. This module never invents a source — it picks the
// right CROP of an already approved local asset (scripts/media/derivatives.mjs), so a 40px table avatar does not download
// a 768px card and a dossier hero does not get centre-cropped into a forehead.

import { PORTRAIT_MANIFEST } from "./portrait-derivatives.ts";
import type { Portrait } from "./types.ts";

export type ArtVariant = "hero" | "card" | "wide" | "square" | "avatar" | "thumb";

type Derivative = { url: string; width: number; height: number; bytes: number | null };
type Entry = { name: string; source: string; source_width: number; source_height: number; sha256: string; focus: string | null; variants: Record<string, Derivative> };

const PORTRAITS = PORTRAIT_MANIFEST.portraits as unknown as Record<string, Entry>;
// a table thumb and an avatar are the same crop at the same size
const VARIANT_FILE: Record<ArtVariant, string> = { hero: "hero", card: "card", wide: "wide", square: "square", avatar: "avatar", thumb: "avatar" };

// /media/boxers/9856a86deb1e.jpg -> 9856a86deb1e
export function portraitKey(src: string | null | undefined): string | null {
  const m = /\/media\/boxers\/([0-9a-f]{12})(?:\.jpg|\/)/.exec(src ?? "");
  return m ? m[1] : null;
}

export type PortraitAsset = {
  src: string;
  width: number;
  height: number;
  /** object-position for the rendered box; a focus-cropped derivative is already centred, so it stays centre. */
  focus: string | undefined;
  credit: string;
  license: string;
  license_url: string | null;
  source_url: string;
  /** true when this is one of the generated crops rather than the stored original */
  derivative: boolean;
  /** same-aspect candidates so a 40px row never downloads a 1000px crop */
  srcSet?: string;
  sizes?: string;
};

// crops that share an aspect ratio can serve each other at different sizes
const FAMILY: Record<string, string[]> = { hero: ["card", "hero"], card: ["card", "hero"], square: ["avatar", "square"], avatar: ["avatar", "square"], wide: ["wide"] };
const SIZES: Record<string, string> = {
  hero: "(max-width: 640px) 45vw, (max-width: 1000px) 40vw, 380px",
  card: "(max-width: 640px) 45vw, 320px",
  square: "(max-width: 640px) 33vw, 200px",
  avatar: "40px",
  wide: "(max-width: 1000px) 100vw, 640px",
};

// Returns the asset to render for a variant, or null when there is no approved portrait (the caller draws a silhouette).
export function portraitAsset(portrait: Portrait | null | undefined, variant: ArtVariant = "card"): PortraitAsset | null {
  if (!portrait?.src) return null;
  const common = {
    credit: portrait.credit,
    license: portrait.license,
    license_url: portrait.license_url ?? null,
    source_url: portrait.source_url,
  };
  const entry = PORTRAITS[portraitKey(portrait.src) ?? ""];
  const file = VARIANT_FILE[variant];
  const derivative = entry?.variants?.[file];
  if (derivative) {
    const family = (FAMILY[file] ?? [file])
      .map((f) => entry.variants[f])
      .filter((v): v is Derivative => Boolean(v))
      .map((v) => `${v.url} ${v.width}w`);
    return {
      ...common, src: derivative.url, width: derivative.width, height: derivative.height, focus: undefined, derivative: true,
      srcSet: family.length > 1 ? family.join(", ") : undefined,
      sizes: family.length > 1 ? SIZES[variant === "thumb" ? "avatar" : variant] : undefined,
    };
  }
  // no generated crop on file: fall back to the stored asset and let the curated focus point do the work
  return {
    ...common,
    src: portrait.src,
    width: portrait.width ?? 800,
    height: portrait.height ?? 1000,
    focus: portrait.focus ?? undefined,
    derivative: false,
  };
}

// Every asset this module can ever return must be a local, PropBetEdge-stored file: nothing is hotlinked.
export function isLocalAsset(src: string): boolean {
  return src.startsWith("/media/");
}

export const PORTRAIT_KEYS = Object.keys(PORTRAITS);
