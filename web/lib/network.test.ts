// Learn (learn.propbetedge.ai) is a first-party PropBetEdge network destination in the Boxing footer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { NETWORK, NETWORK_LINKS } from "./nav.ts";

test("network links carry canonical Learn; sports list unchanged", () => {
  assert.deepEqual(NETWORK_LINKS, [{ key: "learn", label: "Learn", href: "https://learn.propbetedge.ai/" }]);
  assert.deepEqual(NETWORK.map((s) => s.key), ["mlb", "nfl", "ufc", "nba", "wnba", "nhl", "tennis"]);
});

test("network sports include Tennis at tennis.propbetedge.ai", () => {
  assert.deepEqual(NETWORK.find((s) => s.key === "tennis"), { key: "tennis", label: "Tennis", href: "https://tennis.propbetedge.ai/" });
  const shell = readFileSync(new URL("../components/Shell.tsx", import.meta.url), "utf8");
  assert.ok(!/tennis\.propbetedge\.ai/.test(shell), "the URL lives only in lib/nav.ts");
});

test("footer PropBetEdge column renders network links (same-tab) before the sports", () => {
  const shell = readFileSync(new URL("../components/Shell.tsx", import.meta.url), "utf8");
  const col = shell.slice(shell.indexOf("<h4>PropBetEdge</h4>"));
  const links = col.indexOf("NETWORK_LINKS.map"), sports = col.indexOf("NETWORK.map");
  assert.ok(links > 0 && sports > links);
  assert.ok(!/target=|nofollow/.test(col.slice(0, col.indexOf("</div>"))), "same-tab first-party links");
  assert.ok(!/learn\.propbetedge\.ai/.test(shell), "the URL lives only in lib/nav.ts");
});
