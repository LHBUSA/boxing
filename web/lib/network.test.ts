// The PropBetEdge family footer in Boxing: network links, the ten family sports, and Predictions as its
// own non-sport group. lib/family.json is vendored from LHBUSA/propbetedge-workers shared/network/family.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NETWORK, NETWORK_LINKS, NETWORK_PRODUCTS } from "./nav.ts";

type FamilyEntry = { key: string; label: string; name: string; url: string };
const family = JSON.parse(readFileSync(new URL("./family.json", import.meta.url), "utf8")) as {
  sports: FamilyEntry[]; products: FamilyEntry[]; network: FamilyEntry[]; retired_hosts: string[];
};
const shell = readFileSync(new URL("../components/Shell.tsx", import.meta.url), "utf8");
const nav = readFileSync(new URL("./nav.ts", import.meta.url), "utf8");

test("network links carry canonical Learn", () => {
  assert.deepEqual(NETWORK_LINKS.find((l) => l.key === "learn"), { key: "learn", label: "Learn", href: "https://learn.propbetedge.ai/" });
});

test("network sports include Tennis at tennis.propbetedge.ai", () => {
  assert.deepEqual(NETWORK.find((s) => s.key === "tennis"), { key: "tennis", label: "Tennis", href: "https://tennis.propbetedge.ai/" });
  assert.ok(!/tennis\.propbetedge\.ai/.test(shell), "the URL lives only in lib/nav.ts");
});

test("family parity: sports set, order and URLs; boxing is not a family sport", () => {
  assert.deepEqual(NETWORK.map((s) => [s.key, s.href]), family.sports.map((s) => [s.key, s.url]));
  assert.equal(NETWORK.length, 10);
  assert.ok(!NETWORK.some((s) => s.key === "boxing"));
});

test("family parity: Predictions is a product, never a sport", () => {
  assert.deepEqual(NETWORK_PRODUCTS.map((p) => [p.key, p.label, p.href]), family.products.map((p) => [p.key, p.name, p.url]));
  assert.ok(!NETWORK.some((s) => (s.key as string) === "predictions" || /predictions\./.test(s.href)));
});

test("family parity: network URLs (PropBetEdge, All Access, Learn)", () => {
  assert.deepEqual(NETWORK_LINKS.map((l) => [l.key, l.href]), family.network.map((n) => [n.key, n.url]));
});

test("footer PropBetEdge column: network links, then sports, then Predictions; same-tab; one of each", () => {
  const col = shell.slice(shell.indexOf("<h4>PropBetEdge</h4>"));
  const links = col.indexOf("NETWORK_LINKS.map"), sports = col.indexOf("NETWORK.map"), products = col.indexOf("NETWORK_PRODUCTS.map");
  assert.ok(links > 0 && sports > links && products > sports);
  assert.ok(!/target=|nofollow/.test(col.slice(0, col.indexOf("</div>"))), "same-tab first-party links");
  for (const m of ["NETWORK_LINKS.map", "NETWORK.map(", "NETWORK_PRODUCTS.map"]) assert.equal(shell.split(m).length - 1, 1, m);
  assert.ok(!/propbetedge\.ai\//.test(shell), "URLs live only in lib/nav.ts");
  assert.equal(nav.split('"https://f1.propbetedge.ai/"').length - 1, 1);
  assert.equal(nav.split('"https://predictions.propbetedge.ai/"').length - 1, 1);
  for (const h of family.retired_hosts) assert.ok(!nav.includes(h) && !shell.includes(h), h);
  assert.ok(!/http:\/\//.test(nav));
});
