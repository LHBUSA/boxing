# Owner packet: merge guard `first_last` cannot see double surnames or recorded aliases (NOT applied)

## What happened (2026-10-03)

Merges approved conditionally ("only if every stored check passes") were run through `boxing_merge_fighters()` and
REFUSED by the guard. Nothing was bypassed and nothing was merged.

| Seeded (Wikidata) | Commission fighter | first_last check | Every other check |
|---|---|---|---|
| Jaime Munguia (Q53310808) | Jaime Aaron Munguia Escobedo | `jaime munguia` vs `jaime escobedo`: FAIL | dob 1996-10-06 pass, era pass, commission bout pass, external ids pass |
| William Zepeda (Q107718357) | William Zepeda Segura | `william zepeda` vs `william segura`: FAIL | dob pass, era pass, commission bout pass, external ids pass |

Cause: `boxing_first_last_key()` takes the LAST token as the surname. Commission sheets print both Spanish surnames
(paternal + maternal), so the surname the world uses is the second-to-last token. The seed rule already knows this
(rule 1.2.1 containment); the merge guard does not.

## Benavidez: independent stored-evidence bridge found (HOLD stands until you decide)

- Commission (Nevada 2026-05-02, 12 rounds, won by KO vs Gilberto Ramirez Sanchez): `Anthony David Benavidez`, hometown `Phoenix, AZ`.
- Wikidata Q35454257 (`David Benavidez`, the seeded WBC/WBA/WBO entries): English alias **`Anthony David Benavidez`**
  (exact), place of birth **Q16556 Phoenix**, DOB 1996-12-17.
- Two facts from two independent sources bridge the given-name difference: the exact full-name alias and the
  birthplace/hometown. The guard is NOT weakened to pass this; the proposal below lets it pass only on such stored evidence.

## Proposal (migration 0058, needs your approval; not written into supabase/migrations)

`first_last` passes when ANY of these holds, each computed from stored rows:

1. the first+last keys are equal (today's rule);
2. **containment**: the shorter name's first and last tokens appear, in order, inside the other full name, with at
   least one extra token in the longer name (double surname / extra given name: Munguia, Zepeda, Espinoza);
3. **recorded alias**: the survivor's full display name equals, exactly after case/accent folding, an alias of the
   merged fighter's verified `wikidata.item`, stored as a seed alias at seed time (Benavidez). This also needs the
   seed to store all Wikidata aliases of the chosen item, not only the ones agreeing with a printed name.

All other checks stay unchanged (dob, nationality, era, commission evidence, external ids, merge-chain), and a named
human reviewer stays mandatory. Rafael Espinoza would still be refused by the commission check until a bout is linked.

## If approved

1. Migration 0058 (guard + seed alias storage), proof, apply, verifier.
2. Re-run: Munguia, Zepeda (approved conditionally) through the guard; Benavidez only with your explicit merge approval.
3. Graph totals + proofs regenerated.
