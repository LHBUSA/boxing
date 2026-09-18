// Portrait rendering rules. The rights posture is enforced upstream (only an approved, credited, licensed,
// identity-evidenced row reaches the gateway); these tests cover what the UI does with what it is given.

import { test } from "node:test";
import assert from "node:assert/strict";
import { portraitAsset, portraitKey, isLocalAsset, PORTRAIT_KEYS } from "./media.ts";
import { PORTRAIT_MANIFEST as manifest } from "./portrait-derivatives.ts";
import type { Portrait } from "./types.ts";

const approved: Portrait = {
  src: "/media/boxers/9856a86deb1e.jpg",
  width: 768,
  height: 768,
  focus: "50% 30%",
  credit: "Author name, CC BY-SA 4.0, via Wikimedia Commons",
  license: "CC BY-SA 4.0",
  license_url: "https://creativecommons.org/licenses/by-sa/4.0",
  source_url: "https://commons.wikimedia.org/wiki/File:Example.jpg",
};

test("an approved portrait renders, and every shape gets the crop built for it", () => {
  for (const variant of ["hero", "card", "wide", "square", "avatar"] as const) {
    const a = portraitAsset(approved, variant);
    assert.ok(a, variant);
    assert.equal(a.src, `/media/boxers/9856a86deb1e/${variant}.jpg`, variant);
    assert.ok(a.width > 0 && a.height > 0, variant);
    assert.equal(a.derivative, true, variant);
    // a pre-cropped derivative is centred, so no object-position override is emitted
    assert.equal(a.focus, undefined, variant);
  }
  // a table thumb is the avatar crop: an approved portrait is never wasted as a silhouette
  assert.equal(portraitAsset(approved, "thumb")?.src, "/media/boxers/9856a86deb1e/avatar.jpg");
});

test("no portrait means no photo: the caller draws the silhouette", () => {
  assert.equal(portraitAsset(null, "card"), null);
  assert.equal(portraitAsset(undefined, "hero"), null);
  assert.equal(portraitAsset({ ...approved, src: "" } as Portrait, "card"), null);
});

test("credit, licence and source survive every shape", () => {
  for (const variant of ["hero", "card", "square", "avatar", "thumb"] as const) {
    const a = portraitAsset(approved, variant)!;
    assert.equal(a.credit, approved.credit);
    assert.equal(a.license, approved.license);
    assert.equal(a.license_url, approved.license_url);
    assert.equal(a.source_url, approved.source_url);
  }
});

test("a portrait with no generated crop falls back to the stored asset and keeps its curated focus", () => {
  const unknown: Portrait = { ...approved, src: "/media/boxers/ffffffffffff.jpg" };
  const a = portraitAsset(unknown, "hero")!;
  assert.equal(a.src, "/media/boxers/ffffffffffff.jpg");
  assert.equal(a.derivative, false);
  assert.equal(a.focus, "50% 30%");
});

test("every asset the UI can render is a local PropBetEdge file: nothing is hotlinked", () => {
  const urls: string[] = [];
  for (const entry of Object.values(manifest.portraits as Record<string, { source: string; variants: Record<string, { url: string }> }>)) {
    urls.push(entry.source, ...Object.values(entry.variants).map((v) => v.url));
  }
  assert.ok(urls.length >= 60, `${urls.length} asset urls`);
  for (const u of urls) {
    assert.ok(isLocalAsset(u), u);
    assert.doesNotMatch(u, /^https?:|^\/\//, u);
  }
  assert.equal(isLocalAsset("https://upload.wikimedia.org/x.jpg"), false);
});

test("the manifest covers every approved portrait and each one has the full shape set", () => {
  assert.ok(PORTRAIT_KEYS.length >= 11, `${PORTRAIT_KEYS.length} portraits`);
  for (const [key, entry] of Object.entries(manifest.portraits as Record<string, { variants: Record<string, { width: number; height: number }> }>)) {
    assert.match(key, /^[0-9a-f]{12}$/);
    for (const variant of ["hero", "card", "wide", "square", "avatar"]) {
      const v = entry.variants[variant];
      assert.ok(v, `${key} ${variant}`);
      assert.ok(v.width > 0 && v.height > 0, `${key} ${variant} dimensions`);
    }
    // the avatar must be small: a 40px row may not download a card
    assert.ok(entry.variants.avatar.width <= 160, `${key} avatar ${entry.variants.avatar.width}px`);
  }
});

test("portraitKey reads the stored asset path and rejects anything else", () => {
  assert.equal(portraitKey("/media/boxers/9856a86deb1e.jpg"), "9856a86deb1e");
  assert.equal(portraitKey("/media/boxers/9856a86deb1e/hero.jpg"), "9856a86deb1e");
  assert.equal(portraitKey("https://example.invalid/x.jpg"), null);
  assert.equal(portraitKey(null), null);
});
