-- PREPARED, NOT APPLIED. P0 champion body links for fighters seeded by p0-identity-seed@1.0.0 batch p0-champions-seed-01.
-- Replace REVIEWER with the named human reviewer before running; boxing_org_identity_candidate_decisions refuses
-- automated reviewers. Each row links one body cluster to the fighter the seed created for that same printed entry.
begin;
insert into public.boxing_org_identity_candidate_decisions (candidate_id, decision, fighter_id, member_review_ids, reviewer, review_note, evidence)
select c.id, 'matched', v.fighter_id::uuid, '{}'::uuid[], 'REVIEWER',
  'P0 seed body link: ' || v.label || ' was seeded from this exact body entry (name, country, era corroborated on Wikidata).',
  jsonb_build_object('batch', 'p0-champions-02', 'seed_rule', 'p0-identity-seed@1.0.0')
from (values
  ('ibf', 'name:aaron mckenna', 'efb5079c-8a1d-4cd3-a720-fcff197a6416', 'Aaron McKenna (Q130667766)'),
  ('wbo', 'name:abdullah mason', '4310fab5-402d-4c52-bbef-00c77ae5db5d', 'Abdullah Mason (Q127315638)'),
  ('wbc', 'name:agit kabayel', '4cdce00a-8449-4589-abfe-62f1ee3df9ad', 'Agit Kabayel (Q28864444)'),
  ('wba', 'id:9166', '98dd96d5-abb8-434a-bc76-fdd2609ccbce', 'Albert Ramírez (Q23639362)'),
  ('wba', 'name:albert ramirez', '98dd96d5-abb8-434a-bc76-fdd2609ccbce', 'Albert Ramírez (Q23639362)'),
  ('ibf', 'name:andrew moloney', 'de253a10-0d12-479a-8072-4fdce8432ec0', 'Andrew Moloney (Q17517239)'),
  ('wbo', 'name:anthony olascuaga', '46bab60b-c964-4d9a-aa3d-94ef8f128bca', 'Anthony Olascuaga (Q127614013)'),
  ('wba', 'name:brandon figueroa', '54d69a0e-b17d-44a4-ba5d-0cf076e4a530', 'Brandon Figueroa (Q63244740)'),
  ('wba', 'id:5384', '54d69a0e-b17d-44a4-ba5d-0cf076e4a530', 'Brandon Figueroa (Q63244740)'),
  ('wbo', 'name:callum smith', '53c934a8-4cca-40a3-ba87-6acc385f4cd8', 'Callum Smith (Q16233579)'),
  ('wbo', 'name:christian medina', '6e6afa7b-8cab-4d30-bad5-fc6401f65ea3', 'Christian Medina (Q136276553)'),
  ('wbc', 'name:david benavidez', 'f08e6451-538a-4dd7-a0e9-03aa5a058092', 'David Benavidez (Q35454257)'),
  ('wba', 'id:3935', 'f08e6451-538a-4dd7-a0e9-03aa5a058092', 'David Benavidez (Q35454257)'),
  ('wbo', 'name:david benavidez', 'f08e6451-538a-4dd7-a0e9-03aa5a058092', 'David Benavidez (Q35454257)'),
  ('wba', 'name:david benavidez', 'f08e6451-538a-4dd7-a0e9-03aa5a058092', 'David Benavidez (Q35454257)'),
  ('wba', 'name:david jimenez', '3fb6abed-70b4-48c2-965f-61a62c8e83f6', 'David Jimenez (Q15619353)'),
  ('wba', 'id:10634', '3fb6abed-70b4-48c2-965f-61a62c8e83f6', 'David Jimenez (Q15619353)'),
  ('wbo', 'name:devin haney', '832eb4bf-efd4-48de-9ed9-7fb6a44bb06b', 'Devin Haney (Q64009596)'),
  ('wba', 'name:dmitry bivol', 'e3807ee7-b1f7-4f7e-a58e-68155ad7ada3', 'Dmitry Bivol (Q18236558)'),
  ('wba', 'id:4056', 'e3807ee7-b1f7-4f7e-a58e-68155ad7ada3', 'Dmitry Bivol (Q18236558)'),
  ('ibf', 'name:emanuel navarrete', '2755b9af-298b-46c9-8c52-c26e0b01811f', 'Emanuel Navarrete (Q59576453)'),
  ('wbo', 'name:emanuel navarrete', '2755b9af-298b-46c9-8c52-c26e0b01811f', 'Emanuel Navarrete (Q59576453)'),
  ('ibf', 'name:filip hrgovic', '56ae2a8c-aff8-42c0-be77-93741d07223c', 'Filip Hrgović (Q12630993)'),
  ('wbc', 'name:galal yafai', 'c98210ca-165e-428e-9480-1ff01dd41cdf', 'Galal Yafai (Q24033418)'),
  ('wbc', 'name:isaac cruz jr', '6518b1e9-34f8-4139-b45d-c37845e5308d', 'Isaac Cruz (Q109426256)'),
  ('wba', 'name:jaime munguia', 'af14a3eb-ebac-40ab-b6b9-f236d59f5a5c', 'Jaime Munguia (Q53310808)'),
  ('wba', 'id:5276', 'af14a3eb-ebac-40ab-b6b9-f236d59f5a5c', 'Jaime Munguia (Q53310808)'),
  ('wba', 'id:16572', 'd24456a8-3e4a-4a51-b04b-526aa3b94b22', 'Jesse Rodriguez (Q110275941)'),
  ('wba', 'name:jesse rodriguez', 'd24456a8-3e4a-4a51-b04b-526aa3b94b22', 'Jesse Rodriguez (Q110275941)'),
  ('ibf', 'name:josh kelly', 'f34a87c1-311c-45b8-aa19-e9f74da92ac7', 'Josh Kelly (Q20751996)'),
  ('wbo', 'name:kenshiro teraji', '6bdfb99a-1e9c-40ef-a956-ffc0655d501e', 'Kenshirō Teraji (Q30014532)'),
  ('wbc', 'name:lester martinez', '9f7a94e8-a7a6-4dad-8ea3-5cd2bc302262', 'Léster Martínez (Q65156119)'),
  ('ibf', 'name:liam paro', '2941f144-195a-463b-81ee-cc25ef5e70f4', 'Liam Paro (Q110191903)'),
  ('ibf', 'name:masamichi yabuki', '6f922130-10c5-4be1-82d9-593094c3acc8', 'Masamichi Yabuki (Q81033502)'),
  ('wbc', 'name:michal cieslak', '93640a04-4f86-4130-bed4-76c848926f42', 'Michał Cieślak (Q19745914)'),
  ('wba', 'id:17139', '82910c2c-0cea-4b74-b142-b3c105cf1624', 'Muslim Gadzhimagomedov (Q30880648)'),
  ('ibf', 'name:naoya inoue', 'a948a0e1-bd57-4566-a8b3-1a91a310ba3c', 'Naoya Inoue (Q11372978)'),
  ('wbo', 'name:naoya inoue', 'a948a0e1-bd57-4566-a8b3-1a91a310ba3c', 'Naoya Inoue (Q11372978)'),
  ('wbc', 'name:naoya inoue', 'a948a0e1-bd57-4566-a8b3-1a91a310ba3c', 'Naoya Inoue (Q11372978)'),
  ('wba', 'id:2835', 'a948a0e1-bd57-4566-a8b3-1a91a310ba3c', 'Naoya Inoue (Q11372978)'),
  ('wba', 'name:naoya inoue', 'a948a0e1-bd57-4566-a8b3-1a91a310ba3c', 'Naoya Inoue (Q11372978)'),
  ('wbo', 'name:oscar collazo', 'fcfbc12a-49d7-4015-9f4e-2b1ee2a514ad', 'Oscar Collazo (Q66144957)'),
  ('wba', 'id:11916', 'fcfbc12a-49d7-4015-9f4e-2b1ee2a514ad', 'Oscar Collazo (Q66144957)'),
  ('wba', 'name:oscar collazo', 'fcfbc12a-49d7-4015-9f4e-2b1ee2a514ad', 'Oscar Collazo (Q66144957)'),
  ('ibf', 'name:pedro taduran', 'eaa57949-7e58-4e2c-a640-5fe85f4a1562', 'Pedro Taduran (Q67183667)'),
  ('wbo', 'name:rafael espinoza', 'db813c9e-a40e-4b06-9042-dd4552e48efe', 'Rafael Espinoza (Q123739030)'),
  ('wbc', 'name:ricardo malajika', 'd8987d84-4187-4e32-a3ae-4719dd7c85a4', 'Ricardo Malajika (Q133317507)'),
  ('wbc', 'name:ryad merhy', '2f281733-6d5e-421c-95e6-3fc76b82e07a', 'Ryad Merhy (Q24082653)'),
  ('wbo', 'name:shakur stevenson', '376743be-0fa3-46f7-a00a-5b5f293e4e82', 'Shakur Stevenson (Q19823740)'),
  ('wbc', 'name:shokichi iwata', 'e1786415-9088-4cb3-ab04-28c35c973f69', 'Shokichi Iwata (Q64783112)'),
  ('wbc', 'name:siyakholwa kuse', '03cc32ae-e689-4642-be56-88ac660c2677', 'Siyakholwa Kuse (Q136092802)'),
  ('wba', 'name:takeshi ishii', '0f3bd3d6-d66c-47a7-be12-18ad294e420d', 'Takeshi Ishii (Q116936233)'),
  ('wba', 'id:19203', '0f3bd3d6-d66c-47a7-be12-18ad294e420d', 'Takeshi Ishii (Q116936233)'),
  ('wbc', 'name:takuma inoue', '1cf594a3-25ce-4cb6-a892-da944f03aebc', 'Takuma Inoue (Q27139351)'),
  ('ibf', 'name:thanongsak simsri', 'f5061169-47cc-4146-acee-ec8aeb772092', 'Thanongsak Simsri (Q133830099)'),
  ('wbc', 'name:vergil ortiz jr.', '7146c8b2-6435-4d93-8cdd-b19456f153ff', 'Vergil Ortiz Jr. (Q66391755)'),
  ('wbc', 'name:william zepeda', 'eac51442-ccc2-441b-b78f-0118e6be8c29', 'William Zepeda (Q107718357)')
) as v(body, cluster_key, fighter_id, label)
join public.boxing_organizations o on o.slug = v.body
join public.boxing_org_identity_candidates c on c.organization_id = o.id and c.cluster_key = v.cluster_key
where c.state <> 'ambiguous' -- ambiguous clusters need a human to name the member rows; listed in the seed review
  and not exists (select 1 from public.boxing_org_identity_candidate_decisions x where x.candidate_id = c.id);
commit;
