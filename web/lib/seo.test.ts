import { test } from "node:test";
import assert from "node:assert/strict";
import { boutJsonLd, eventJsonLd, fighterJsonLd, launchUrl, serializeJsonLd } from "./seo.ts";
import type { BoutCompact, BoutDetail, EventSummary, FighterDetail } from "./types.ts";

const event: EventSummary = {
  public_id: "pbe_boxevent_0123456789abcdef0123456789abcdef", name: "Synthetic Promotions at Synthetic Arena", date: "2026-09-25", start_at: null, status: "scheduled",
  venue: { name: "Synthetic Arena", city: "Las Vegas", region: "NV", country_code: "US" }, commission: null, promoters: ["Synthetic Promotions"],
  sheet_filed: true, official_source_url: null, bout_count: 1, results_count: 0, awaiting_verification: null, title_bouts: 0, headline: null,
};
const corner = (name: string, id: string) => ({ public_id: `pbe_boxer_${id}`, name, corner: null, weigh_in: null });
const bout = { public_id: "pbe_boxbout_abcdef0123456789abcdef0123456789", order: 1, status: "scheduled", scheduled_rounds: 12, weight: null,
  a: corner("Alpha Synthetic", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"), b: corner("Bravo Synthetic", "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"),
  result: null, scorecards: [], referee: null, titles: [] } as unknown as BoutCompact;

test("build mode: structured data names the entities but carries no URL", () => {
  const ld = eventJsonLd(event, { bouts: [bout] }, false);
  assert.equal(ld["@type"], "SportsEvent");
  assert.equal(ld.name, "Synthetic Promotions at Synthetic Arena");
  assert.equal((ld.location as { name: string }).name, "Synthetic Arena");
  const text = JSON.stringify([ld, boutJsonLd({ bout, event } as unknown as BoutDetail, false)]);
  assert.ok(!/"url"/.test(text), "no url field in build mode");
  assert.ok(!text.includes("propbetedge.ai"));
  assert.equal(launchUrl("/fights/x", false), undefined);
});

test("launch mode: every node carries its canonical address on the public domain", () => {
  const ld = eventJsonLd(event, { bouts: [bout] }, true);
  assert.match(String(ld.url), /^https:\/\/boxing\.propbetedge\.ai\/events\/synthetic-promotions-at-synthetic-arena-2026-09-25-/);
  const sub = (ld.subEvent as { url: string; competitor: { url: string }[] }[])[0];
  assert.match(sub.url, /^https:\/\/boxing\.propbetedge\.ai\/fights\/alpha-synthetic-vs-bravo-synthetic-/);
  assert.ok(sub.competitor.every((c) => c.url.startsWith("https://boxing.propbetedge.ai/fighters/")));
});

test("fighter Person: sameAs only from sourced identity links; serialization cannot close the script tag", () => {
  const f = { fighter: { public_id: "pbe_boxer_cccccccccccccccccccccccccccccccc", name: "Charlie </script> Synthetic", nickname: null }, record: { bouts: 3 } } as unknown as FighterDetail;
  const ld = fighterJsonLd(f, ["https://www.wikidata.org/wiki/Q1", null, undefined], false);
  assert.deepEqual(ld.sameAs, ["https://www.wikidata.org/wiki/Q1"]);
  assert.equal(ld.jobTitle, "Professional boxer");
  assert.ok(!serializeJsonLd(ld).includes("</script>"));
});
