-- APPLIED 2026-10-03 (reviewer Justin Erickson; REVIEWER placeholder substituted at apply time, guarded 25/8 transaction).
-- Batch 07 (tier B): 25 MATCH links + 8 DISTINCT decisions.
-- See reviews/identity/p0-tier-b-review.md. Replace REVIEWER with the named human reviewer. No fighter created, no merge.
begin;
insert into public.boxing_org_identity_candidate_decisions (candidate_id, decision, fighter_id, member_review_ids, reviewer, review_note, evidence)
select v.candidate_id::uuid, 'matched', v.fighter_id::uuid, '{}'::uuid[], 'REVIEWER', 'Tier B review: ' || v.label,
  jsonb_build_object('batch', 'p0-batch-07', 'tier', 'B', 'candidate_fighter', v.fighter_id)
from (values
  ('43d91b8e-f95f-40b9-a04f-be7d6d6ed348', '5bf8bf75-d746-4842-b0d2-675af229a6ba', 'Jai Opetaia (IBF cruiserweight rank 3) vs Jai Tapu Opetaia: weight and home consistent with the body entry (cruiserweight; AUS)'),
  ('625cec14-6197-46b6-acc1-72287eeb8049', 'f16b0107-0663-4a81-82ce-31f126c4c26c', 'Jose Tito Sanchez (WBC super_bantamweight rank 10) vs Jose Tito Juan Sanchez: weight and home consistent with the body entry (super_bantamweight; US/USA)'),
  ('369c8aa5-ad98-4c94-8024-74adf9b4410d', 'f16b0107-0663-4a81-82ce-31f126c4c26c', 'Jose Tito Sanchez (IBF super_bantamweight rank 14) vs Jose Tito Juan Sanchez: weight and home consistent with the body entry (super_bantamweight; US/USA)'),
  ('4e472e9c-cbc4-4c7c-a4fd-7ae61ffd8c21', 'f16b0107-0663-4a81-82ce-31f126c4c26c', 'JOSE TITO SANCHEZ (WBA super_bantamweight rank 14) vs Jose Tito Juan Sanchez: weight and home consistent with the body entry (super_bantamweight; US/USA)'),
  ('0f00c004-9760-4908-b2ad-6a4d78a4929c', '36e1aee1-01e3-4340-aa14-42d8da32d47a', 'Oscar Duarte Jurado (WBC super_lightweight rank 8) vs Oscar Duarte Juarado: weight and home consistent with the body entry (super_lightweight, welterweight; MEX/Mexico/US)'),
  ('6080a716-495b-4488-8d7e-e4ab6f471828', '36e1aee1-01e3-4340-aa14-42d8da32d47a', 'Oscar Duarte Jurado (WBO welterweight rank 4) vs Oscar Duarte Juarado: weight and home consistent with the body entry (super_lightweight, welterweight; MEX/Mexico/US)'),
  ('60a8a4a3-9e6e-400a-9539-830aa0ab8d85', '36e1aee1-01e3-4340-aa14-42d8da32d47a', 'OSCAR DUARTE JURADO (WBA super_lightweight rank 3) vs Oscar Duarte Juarado: weight and home consistent with the body entry (super_lightweight, welterweight; MEX/Mexico/US)'),
  ('d6ec098c-218c-4ae2-a242-7ebf1517ec04', '0af62648-5f0a-41f7-98bb-a550f18de713', 'Angel Barrientes (WBO super_bantamweight rank 15) vs Angel Lawrence Barrientes: weight and home consistent with the body entry (super_bantamweight; USA)'),
  ('1eafaf61-301a-4662-a269-4584c69d7751', '0af62648-5f0a-41f7-98bb-a550f18de713', 'ANGEL BARRIENTES (WBA super_bantamweight rank 7) vs Angel Lawrence Barrientes: weight and home consistent with the body entry (super_bantamweight; USA)'),
  ('048d5d02-23fd-4504-85d8-6c22c1adbdf3', 'ec76ebc5-3816-4184-8848-66addbc7b9c8', 'Charles Conwell (WBO super_welterweight rank 12) vs Charles Albert Shone Conwell: weight and home consistent with the body entry (super_welterweight; US/USA)'),
  ('77baf2c0-2929-4282-b847-af34c4c29be0', 'ec76ebc5-3816-4184-8848-66addbc7b9c8', 'Charles Conwell (WBC super_welterweight rank 14) vs Charles Albert Shone Conwell: weight and home consistent with the body entry (super_welterweight; US/USA)'),
  ('cbeacb55-a045-47a6-accc-9f692e2a7b1d', '473b8393-d671-4adb-a834-7708a3fc4140', 'Frank Martin (WBO super_lightweight rank 8) vs Frank Lamar Martin: weight and home consistent with the body entry (super_lightweight; USA)'),
  ('4f8ec328-f31d-4192-8460-7ed2c36f550a', '473b8393-d671-4adb-a834-7708a3fc4140', 'FRANK MARTIN (WBA super_lightweight rank 9) vs Frank Lamar Martin: weight and home consistent with the body entry (super_lightweight; USA)'),
  ('2bb09628-92be-48de-b88b-5811548bd3c9', '8449a02d-8f99-41de-86b9-f154d82c23e0', 'Jarrell Miller (IBF heavyweight rank 12) vs Jarrell King Miller: weight and home consistent with the body entry (heavyweight; USA)'),
  ('a45daf60-3276-4b88-9c0c-26c9fbd96219', '8449a02d-8f99-41de-86b9-f154d82c23e0', 'JARRELL MILLER (WBA heavyweight rank 1) vs Jarrell King Miller: weight and home consistent with the body entry (heavyweight; USA)'),
  ('0589117b-a641-480c-94c0-b0ad8998c646', '2a0ff137-e5a3-40c0-b2fa-63f97ec77f79', 'Omar Trinidad (WBC featherweight rank 4) vs Omar Cande Trinidad: weight and home consistent with the body entry (featherweight; US)'),
  ('7bf1f333-e129-44e8-808d-17f408723784', '4e5f53d0-93f0-4286-aad6-95716629b2e3', 'Alan Abel Chavez (IBF lightweight rank 5) vs Alan Abel Chaves: weight and home consistent with the body entry (lightweight; ARG)'),
  ('8cfda131-f540-4f86-8f7e-7b43acd238c4', 'b4ee69b9-be29-40cc-bd86-00c0caa83e80', 'Delante Tiger Johnson (WBC welterweight rank 15) vs Delante Johnson: weight and home consistent with the body entry (welterweight; US)'),
  ('3b75cd3c-fce1-48ad-9f54-1931466ddc57', 'eb29b21f-14c4-4b1b-a6a6-4effb5b3d08b', 'Emannuel Rodriguez (WBC bantamweight rank 14) vs Emmanuel Rodriguez: weight and home consistent with the body entry (bantamweight; Puerto Rico)'),
  ('4a78efd3-c440-4755-8464-26111aed92c9', '30215e0b-ca6b-449c-a7f1-7c95af318bc7', 'Ilunga Makabu (WBC cruiserweight rank 11) vs Ilunga Junior Makabu: weight and home consistent with the body entry (cruiserweight; Congo)'),
  ('b1b5e9bb-b99e-43be-b509-81e8d17ca373', '4bdab9c5-8c15-4038-9936-aa8b9ba8c72b', 'KAIPO GALLEGOS (WBA super_featherweight rank 8) vs Kaipo Ethan Gallegos: weight and home consistent with the body entry (super_featherweight; USA)'),
  ('f93b1cda-6c15-45eb-ac3b-c9e79395623a', '8d0551b1-51fb-499b-a5fc-73479e74c23a', 'Lamont Roach (WBC lightweight rank 2) vs Lamont Roach Jr.: weight and home consistent with the body entry (lightweight; US)'),
  ('0f587488-a4f0-4dc2-b96a-6daf0db68cce', '1aa82f07-f446-4c62-ad02-01142737486b', 'Mario Barrios (WBC super_welterweight rank 13) vs Mario Thomas Barrios: weight and home consistent with the body entry (super_welterweight; US)'),
  ('d6fa1175-ac85-43e4-b4d5-0e78b6b649a1', '5d3c4241-85e3-406f-a75d-7270263e92e1', 'Raymund Muratalla (IBF super_lightweight rank 7) vs Raymond Muratalla: weight and home consistent with the body entry (super_lightweight; USA)'),
  ('11ce449d-8451-4f6f-a828-225eda0a9e5d', 'fdfa806f-4c97-4ea7-a190-6cac5816c9ec', 'Teremoana Teremoana (IBF heavyweight rank 15) vs Teremooana Teremoana: weight and home consistent with the body entry (heavyweight; AUS)')
) as v(candidate_id, fighter_id, label)
join public.boxing_org_identity_candidates c on c.id = v.candidate_id::uuid and c.state <> 'ambiguous'
where not exists (select 1 from public.boxing_org_identity_candidate_decisions x where x.candidate_id = v.candidate_id::uuid);
insert into public.boxing_org_identity_candidate_decisions (candidate_id, decision, fighter_id, member_review_ids, reviewer, review_note, evidence)
select v.candidate_id::uuid, 'distinct', null, '{}'::uuid[], 'REVIEWER', 'Tier B review: ' || v.label,
  jsonb_build_object('batch', 'p0-batch-07', 'tier', 'B', 'candidate_fighter', v.fighter_id)
from (values
  ('442a753e-4388-4e03-9d73-f80527c2fc77', '6f28f81f-7eb6-44fa-8bfa-dcc6e0d9176c', 'Rashidi Ellis (WBC super_welterweight rank 11) vs Rashida Shakilya Ellis: existing fighter is a woman boxing at 130 lb (Rashida); printed Rashidi is a male super welterweight'),
  ('d114cfb1-7e4d-4463-8d78-1b9f85a44e27', '6f28f81f-7eb6-44fa-8bfa-dcc6e0d9176c', 'Rashidi Ellis (WBO super_welterweight rank 8) vs Rashida Shakilya Ellis: existing fighter is a woman boxing at 130 lb (Rashida); printed Rashidi is a male super welterweight'),
  ('fda5b4e0-b941-498d-b25d-8f6e909e259d', '94ad9cc4-7ba7-4a9b-b820-5b9ff3ea07be', 'GARY ANTONIO RUSSELL (WBA super_bantamweight interim) vs Gary Antuanne Russell: existing Gary Antuanne Russell fights at 140 lb; printed Gary Antonio Russell is a super bantamweight (brothers)'),
  ('d36096ca-d982-40f0-843d-8589bc3228f3', '6a1bdc0e-8c6c-415a-bbee-41a4a0c947fe', 'Eric Rosa (IBF light_flyweight rank 5) vs Eric Ross: existing Eric Ross weighs 237.6 lb (Chicago); printed Eric Rosa is a Dominican light flyweight'),
  ('4848ef8d-96b3-495c-aaff-075b509a399f', '98cae4ee-3b26-4d2c-b3f8-56758f463da9', 'Francisco Rodriguez Jr. (WBC flyweight rank 1) vs Francisco Rodriguez: existing Francisco Rodriguez weighs 138 lb (New Jersey); printed Jr. is a Mexican flyweight'),
  ('655be29a-5873-476f-97a4-847ac9cf73ca', '94ad9cc4-7ba7-4a9b-b820-5b9ff3ea07be', 'GARY ALLEN RUSSELL JR (WBA lightweight rank 9) vs Gary Antuanne Russell: existing Gary Antuanne Russell fights at 140 lb; printed Gary Allen Russell Jr is a different brother'),
  ('e1b1b2ac-6ddf-488e-ba5f-73b92d7e4c79', '94ad9cc4-7ba7-4a9b-b820-5b9ff3ea07be', 'Gary Russell (WBC super_featherweight rank 3) vs Gary Antuanne Russell: existing Gary Antuanne Russell fights at 140 lb; printed Gary Russell is a super featherweight (a brother)'),
  ('c45ab9b8-f396-4f1b-a5d4-169e42a4987d', '2057aa64-b4ff-4a8f-90c0-a1915101a30b', 'JONATHAN CABRERA SANCHEZ (WBA featherweight rank 13) vs Jonathan Sanchez: existing Jonathan Sanchez weighs 222.6 lb (Tampa); printed is a Dominican featherweight')
) as v(candidate_id, fighter_id, label)
join public.boxing_org_identity_candidates c on c.id = v.candidate_id::uuid and c.state <> 'ambiguous'
where not exists (select 1 from public.boxing_org_identity_candidate_decisions x where x.candidate_id = v.candidate_id::uuid);
commit;
