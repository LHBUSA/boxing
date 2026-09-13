// Wikidata identity adapter (source_key 'wikidata', CC0, approved_ingest).
//
// Scope: identity/reference facts only — QID, labels, aliases, DOB (with
// precision), sex, citizenship. Wikidata cannot tell us whether a boxer is
// ACTIVE, and absence from Wikidata is never evidence a boxer does not exist.
// BoxRec ids that Wikidata carries are kept in the raw payload for provenance;
// they are NOT written as boxrec identities (BoxRec is review_required).

export const ADAPTER_VERSION = 'wikidata-identity@1.0.0';
export const SOURCE_KEY = 'wikidata';
export const NAMESPACE = 'wikidata';
const ENDPOINT = 'https://query.wikidata.org/sparql';
export const USER_AGENT = 'PropBetEdge-Boxing-Identity/0.1 (+https://github.com/LHBUSA/boxing)';

const SEX = { Q6581097: 'male', Q6581072: 'female', Q1052281: 'female', Q2449503: 'male' };

// Professional boxers (occupation: boxer) who carry a BoxRec id (a practical
// proxy for a professional record), born in or after `bornFrom`, not recorded
// as deceased. Paged by QID order so pages are stable.
export function buildQuery({ bornFrom = 1975, limit = 500, afterQid = null } = {}) {
  const after = afterQid ? `FILTER(STR(?item) > "http://www.wikidata.org/entity/${afterQid.replace(/[^Q0-9]/g, '')}")` : '';
  return `SELECT ?item ?label ?dob ?dobPrecision ?sex ?boxrec
  (GROUP_CONCAT(DISTINCT ?iso; separator="|") AS ?isos)
  (GROUP_CONCAT(DISTINCT ?alias; separator="|") AS ?aliases)
  (GROUP_CONCAT(DISTINCT ?nativeName; separator="|") AS ?nativeNames)
WHERE {
  ?item wdt:P106 wd:Q11338576 ; wdt:P1967 ?boxrec .
  FILTER NOT EXISTS { ?item wdt:P570 [] }
  ?item p:P569/psv:P569 [ wikibase:timeValue ?dob ; wikibase:timePrecision ?dobPrecision ] .
  FILTER(YEAR(?dob) >= ${Number(bornFrom)})
  ${after}
  ?item rdfs:label ?label . FILTER(LANG(?label) = "en")
  OPTIONAL { ?item wdt:P21 ?sex }
  OPTIONAL { ?item wdt:P27/wdt:P297 ?iso }
  OPTIONAL { ?item skos:altLabel ?alias . FILTER(LANG(?alias) = "en") }
  OPTIONAL { ?item wdt:P1559 ?nativeName }
}
GROUP BY ?item ?label ?dob ?dobPrecision ?sex ?boxrec
ORDER BY STR(?item)
LIMIT ${Number(limit)}`;
}

const qidOf = (uri) => String(uri).split('/').pop();

// WDQS JSON bindings -> identity records. Rows that cannot be parsed are
// returned in `rejected` with a reason; they are never guessed at.
export function parseBindings(json) {
  const records = [];
  const rejected = [];
  const seen = new Map();
  for (const b of json?.results?.bindings ?? []) {
    const qid = qidOf(b.item?.value ?? '');
    if (!/^Q\d+$/.test(qid)) { rejected.push({ reason: 'bad_qid', raw: b }); continue; }
    const label = b.label?.value?.trim();
    if (!label) { rejected.push({ qid, reason: 'no_english_label' }); continue; }
    const precision = Number(b.dobPrecision?.value);
    const iso = (b.dob?.value ?? '').slice(0, 10);
    let dob = null;
    let dobPrecision = null;
    if (precision >= 11 && /^\d{4}-\d{2}-\d{2}$/.test(iso)) { dob = iso; dobPrecision = 'day'; }
    else if (precision === 9 && /^\d{4}/.test(iso)) { dob = iso.slice(0, 4); dobPrecision = 'year'; }

    // A QID with several DOB statements comes back as several rows: that is a
    // conflict in the source, so the record is held back rather than picked.
    if (seen.has(qid)) {
      const prev = seen.get(qid);
      if (prev.dob !== dob) prev.conflict = true;
      continue;
    }
    const record = {
      external_id: qid,
      external_url: `https://www.wikidata.org/wiki/${qid}`,
      display_name: label,
      names: [
        ...(b.aliases?.value ? b.aliases.value.split('|') : []).map((text) => ({ text, kind: 'other' })),
        ...(b.nativeNames?.value ? b.nativeNames.value.split('|') : []).map((text) => ({ text, kind: 'name' })),
      ].filter((n) => n.text && n.text !== label),
      dob: dobPrecision === 'year' ? null : dob,
      dob_precision: dobPrecision === 'year' ? null : dobPrecision,
      sex: SEX[qidOf(b.sex?.value ?? '')] ?? null,
      nationality: b.isos?.value ? b.isos.value.split('|').filter((x) => /^[A-Z]{2}$/.test(x)) : [],
    };
    const payload = {
      qid,
      label,
      dob: b.dob?.value ?? null,
      dob_precision: Number.isFinite(precision) ? precision : null,
      sex: b.sex?.value ?? null,
      citizenship_iso: record.nationality,
      aliases_en: b.aliases?.value ? b.aliases.value.split('|') : [],
      native_names: b.nativeNames?.value ? b.nativeNames.value.split('|') : [],
      boxrec_id_claimed_by_wikidata: b.boxrec?.value ?? null,
    };
    const entry = { record, payload, dob, conflict: false };
    seen.set(qid, entry);
    records.push(entry);
  }
  return {
    records: records.filter((e) => !e.conflict).map(({ record, payload }) => ({ record, payload })),
    rejected: [...rejected, ...records.filter((e) => e.conflict).map((e) => ({ qid: e.record.external_id, reason: 'conflicting_dob_statements' }))],
    lastQid: records.length ? records[records.length - 1].record.external_id : null,
    rowCount: (json?.results?.bindings ?? []).length,
  };
}

export async function fetchPage({ fetchImpl = fetch, bornFrom, limit, afterQid, signal } = {}) {
  const url = `${ENDPOINT}?format=json&query=${encodeURIComponent(buildQuery({ bornFrom, limit, afterQid }))}`;
  const res = await fetchImpl(url, {
    headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
    signal,
  });
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after') ?? '60');
    const err = new Error(`wikidata_rate_limited retry_after=${retryAfter}`);
    err.retryAfter = retryAfter;
    throw err;
  }
  if (!res.ok) throw new Error(`wikidata_http_${res.status}`);
  const json = await res.json();
  if (!json?.head?.vars?.includes('item')) throw new Error('wikidata_schema_changed: expected ?item binding');
  const bindings = json?.results?.bindings ?? [];
  if (bindings.length >= Number(limit)) {
    // A full page may cut one boxer's rows in half (several DOB statements).
    // Defer the trailing QID to the next page so its conflict is still seen.
    const tail = bindings[bindings.length - 1]?.item?.value;
    const kept = bindings.filter((b) => b.item?.value !== tail);
    if (kept.length) {
      const parsed = parseBindings({ ...json, results: { bindings: kept } });
      return { ...parsed, rowCount: bindings.length };
    }
  }
  return parseBindings(json);
}

export const wikidataAdapter = {
  key: 'wikidata',
  sourceKey: SOURCE_KEY,
  namespace: NAMESPACE,
  version: ADAPTER_VERSION,
  sourceUrl: (record) => record.external_url,
  omitFromHash: [],
  fetchPage,
};
