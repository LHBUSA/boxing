import { test } from "node:test";
import assert from "node:assert/strict";
import { bioFacts } from "./fighter-facts.ts";

const EMPTY = /not verified|unknown|n\/a|^—$/i;

test("absent bio attributes are omitted, never rendered as Not verified / Unknown / N/A / —", () => {
  assert.deepEqual(bioFacts({}, null), []);
  assert.deepEqual(bioFacts({ stance: null, height_cm: null, reach_cm: null, nationality: null }, { age_years: null, height_cm: null, nationality: [] }), []);
  for (const [, v] of bioFacts({ nationality: "GB" }, null)) assert.doesNotMatch(v, EMPTY);
});

test("each sourced attribute appears on its own evidence path only", () => {
  assert.deepEqual(bioFacts({ stance: "orthodox" }, null, { orthodox: "Orthodox" }), [["Stance", "Orthodox"]]);
  assert.deepEqual(bioFacts({ height_cm: 198.1 }, null), [["Height · reach", "198 cm"]]);
  assert.deepEqual(bioFacts({ height_cm: 198, reach_cm: 208 }, null), [["Height · reach", "198 cm · 208 cm reach"]]);
  assert.deepEqual(bioFacts({}, { height_cm: 175 }), [["Height", "175 cm (identity-proven)"]]);
  assert.deepEqual(bioFacts({}, { age_years: 33 }), [["Age", "33 (identity-proven)"]]);
  assert.deepEqual(bioFacts({ nationality: "JP" }, { nationality: ["JP", "US"] }), [["Nationality", "JP"]]);
  assert.deepEqual(bioFacts({}, { nationality: ["MX"] }), [["Nationality", "MX (identity-proven)"]]);
});

test("no fact is ever derived from a verified bout: a record-backed fighter with no sourced bio has no bio facts", () => {
  assert.deepEqual(bioFacts({ stance: null, height_cm: null, reach_cm: null, nationality: null }, null), []);
});

test("the fighter profile page never emits Not verified for a fact (scoped to this page only)", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../app/fighters/[slug]/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(src, /Not verified/);
  assert.match(src, /bioFacts\(f, bio, STANCE\)/, "bio facts come only from lib/fighter-facts");
});
