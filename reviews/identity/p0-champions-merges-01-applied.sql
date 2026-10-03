-- P0 champion duplicate merges (owner approved 2026-10-03, reviewer Justin Erickson). The seeded short-name fighter
-- merges INTO the commission fighter that owns the verified bout history. boxing_merge_fighters() refuses any merge
-- whose first/last, dob, nationality, era, commission or external-id check fails. Exactly the four pairs from
-- reviews/identity/p0-champions-seed-01.md; no other merges.
select public.boxing_merge_fighters(jsonb_build_object(
  'merged_fighter_id', 'ce401cc6-e7c3-4676-b988-3ae95c677c04', 'survivor_fighter_id', 'd2eabdd7-86d1-4cc5-9253-0a7140280689',
  'reviewer', 'Justin Erickson',
  'review_note', 'Owner approved 2026-10-03: seeded Bruce Carrington (Wikidata Q124301363, WBC featherweight) is the Florida commission fighter Bruce Carrington Jr.',
  'evidence', jsonb_build_object('wikidata_qid', 'Q124301363', 'commission', 'Florida 2023-12-09 Top Rank card, Pembroke Pines, vs Jason Sanchez; hometown Brooklyn')));
select public.boxing_merge_fighters(jsonb_build_object(
  'merged_fighter_id', '78860fc6-ad91-4254-8861-cecbb5a86ec6', 'survivor_fighter_id', '5bf8bf75-d746-4842-b0d2-675af229a6ba',
  'reviewer', 'Justin Erickson',
  'review_note', 'Owner approved 2026-10-03: seeded Jai Opetaia (Wikidata Q2029085, WBA cruiserweight) is the Nevada commission fighter Jai Tapu Opetaia.',
  'evidence', jsonb_build_object('wikidata_qid', 'Q2029085', 'commission', 'Nevada 2026-03-08, 12 rounds vs Brandon Glanton')));
select public.boxing_merge_fighters(jsonb_build_object(
  'merged_fighter_id', '8639a7a4-85fb-47b6-9c73-8e42b1be61ec', 'survivor_fighter_id', '388a4995-602c-4a0e-b935-5c7614157690',
  'reviewer', 'Justin Erickson',
  'review_note', 'Owner approved 2026-10-03: seeded Sebastian Fundora (Wikidata Q110977051, WBC super welterweight) is the Nevada commission fighter Sebastian Alexander Fundora.',
  'evidence', jsonb_build_object('wikidata_qid', 'Q110977051', 'commission', 'Nevada 2026-03-28, 12 rounds vs Keith Thurman')));
select public.boxing_merge_fighters(jsonb_build_object(
  'merged_fighter_id', '67d18096-0969-4be2-a29e-dbb5f7e15ed6', 'survivor_fighter_id', '3aa8d529-b29b-4e2f-9e0b-6a8468ca397a',
  'reviewer', 'Justin Erickson',
  'review_note', 'Owner approved 2026-10-03: seeded Teófimo López (Wikidata Q26250597, WBA welterweight) is the Nevada commission fighter Teofimo Andres Lopez.',
  'evidence', jsonb_build_object('wikidata_qid', 'Q26250597', 'commission', 'Nevada 2026-08-22, 12 rounds vs Rolando Romero')));
