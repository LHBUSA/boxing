-- APPLIED VERSION. Batch 05 minus the owner strike (ANDRES TERAN -> Jose Andres Teran Santibanez held for manual review).
-- Batch 05: link body entries of 25 POSSIBLE_EXISTING_FIGHTER subjects to the existing
-- commission-backed fighter named in reviews/identity/p0-batch-04-possible-existing.md. No merge, no new fighter.
-- Replace REVIEWER with the named human reviewer. Ambiguous clusters and already-linked entries are excluded.
begin;
insert into public.boxing_org_identity_candidate_decisions (candidate_id, decision, fighter_id, member_review_ids, reviewer, review_note, evidence)
select v.candidate_id::uuid, 'matched', v.fighter_id::uuid, '{}'::uuid[], 'REVIEWER',
  'Batch 05 body link to an existing fighter: ' || v.label,
  jsonb_build_object('batch', 'p0-batch-05', 'source', 'POSSIBLE_EXISTING_FIGHTER review')
from (values
  ('f2bceced-8030-47ba-962b-38e032a297ca', '2f9e20df-4b8b-487b-84b2-cfe9dec6a142', 'Alex Bray (WBO super_welterweight rank 11) -> Alex Bray [name_agreement; 4 commission bouts]'),
  ('dc1fb7c1-47ca-4f54-918c-aa3c30557807', '2f9e20df-4b8b-487b-84b2-cfe9dec6a142', 'ALEX BRAY (WBA super_welterweight rank 9) -> Alex Bray [name_agreement; 4 commission bouts]'),
  ('373aab98-da9b-4ef8-b2ec-669bee9397f0', 'ef980e2e-0b83-4c72-a13f-44163c35db82', 'Andrey Bonilla (WBC bantamweight rank 9) -> Andrey Bonilla [name_agreement; 4 commission bouts]'),
  ('6f85cd03-4fb4-4c1e-80e0-950e8792ca40', 'ef980e2e-0b83-4c72-a13f-44163c35db82', 'ANDREY BONILLA (WBA bantamweight rank 6) -> Andrey Bonilla [name_agreement; 4 commission bouts]'),
  ('90c681ad-08b7-4e8a-aebb-e1cc13d4b7cb', '78139159-c1ad-4388-bf60-5472f82a93aa', 'Corey Marksman (WBO lightweight rank 4) -> Corey Marksman [name_agreement; 3 commission bouts]'),
  ('cef53d33-1a32-44a9-a51a-efcc0ed618f9', '78139159-c1ad-4388-bf60-5472f82a93aa', 'COREY MARKSMAN (WBA lightweight rank 8) -> Corey Marksman [name_agreement; 3 commission bouts]'),
  ('5da03a0c-d29d-4cad-84a9-40671d019a0a', 'b9412cfa-317f-4acf-9e3d-d443f47ae512', 'Alex Vallecillo (WBO super_bantamweight rank 14) -> Alex Vallecillo [name_agreement; 2 commission bouts]'),
  ('063c700d-7ac7-4683-b508-881356257be1', 'b9412cfa-317f-4acf-9e3d-d443f47ae512', 'ALEX VALLECILLO (WBA super_bantamweight rank 12) -> Alex Vallecillo [name_agreement; 2 commission bouts]'),
  ('da8fcc7e-3267-4cc7-af91-9691deb5c25f', 'ccca8e35-c03b-4765-911c-965c12dc806c', 'Katsuma Akitsugi (WBO bantamweight rank 7) -> Katsuma Akitsugi [name_agreement; 2 commission bouts]'),
  ('c7c441af-6e44-44c3-b424-15b824e19551', 'ccca8e35-c03b-4765-911c-965c12dc806c', 'KATSUMA AKITSUGI (WBA bantamweight rank 12) -> Katsuma Akitsugi [name_agreement; 2 commission bouts]'),
  ('d94e3cd8-3aec-46b6-8e21-7e43ac449a51', '2a0ff137-e5a3-40c0-b2fa-63f97ec77f79', 'Omar Cande Trinidad (IBF featherweight rank 2) -> Omar Cande Trinidad [name_agreement; 2 commission bouts]'),
  ('fa2821e3-1760-43b9-a55c-c043a3830e56', '2a0ff137-e5a3-40c0-b2fa-63f97ec77f79', 'Omar Cande Trinidad (WBO featherweight rank 5) -> Omar Cande Trinidad [name_agreement; 2 commission bouts]'),
  ('0a0fc6f8-77f6-45c2-8a25-04368a8546d4', '545652bd-c8ff-4422-a007-d2b40ec79f9c', 'Andy Hiraoka (IBF super_lightweight rank 10) -> Andy Hiraoka [name_agreement; 1 commission bouts]'),
  ('d67cf33e-ef0e-4a1e-813b-249e77aa288e', '545652bd-c8ff-4422-a007-d2b40ec79f9c', 'ANDY HIRAOKA (WBA super_lightweight rank 4) -> Andy Hiraoka [name_agreement; 1 commission bouts]'),
  ('745a9186-6427-4f1f-96e5-d687b747351f', '528e2780-322e-474d-b4cb-7405d971702c', 'Antonio Vargas (WBC bantamweight rank 10) -> Antonio Vargas [name_agreement; 1 commission bouts]'),
  ('9adba699-c81b-4844-ac61-4f214da6aa40', '528e2780-322e-474d-b4cb-7405d971702c', 'ANTONIO VARGAS (WBA bantamweight rank 9) -> Antonio Vargas [name_agreement; 1 commission bouts]'),
  ('a28d4544-3b52-4a5b-b451-2ceb1b5d5ffe', '36a44317-a6dc-4334-b597-9a9621a7bd73', 'Bek Nurmaganbet (IBF super_middleweight rank 8) -> Bek Nurmaganbet [name_agreement; 1 commission bouts]'),
  ('382d12a3-bba5-411d-bdff-cb8e3dd1ad03', '36a44317-a6dc-4334-b597-9a9621a7bd73', 'Bek Nurmaganbet (WBC super_middleweight rank 14) -> Bek Nurmaganbet [name_agreement; 1 commission bouts]'),
  ('5a0b5575-cdec-44f9-bcb5-00fea85f3a89', '1c8bbf09-0af1-40c5-8acc-bb494aba4ceb', 'Carlos Utria (WBC super_lightweight rank 15) -> Carlos Alfonso Utria Lopez [contained_in_full_name; 1 commission bouts]'),
  ('8fb1ee32-1034-490c-9a30-a10b5f71ed2d', '1c8bbf09-0af1-40c5-8acc-bb494aba4ceb', 'CARLOS UTRIA (WBA super_lightweight rank 14) -> Carlos Alfonso Utria Lopez [contained_in_full_name; 1 commission bouts]'),
  ('e1de2075-dbc3-42a3-8b14-1ca52ee3f522', 'b4ee69b9-be29-40cc-bd86-00c0caa83e80', 'Delante Johnson (IBF welterweight rank 9) -> Delante Johnson [name_agreement; 1 commission bouts]'),
  ('84af35d4-9568-44e3-b8c7-35f21c833bec', 'b4ee69b9-be29-40cc-bd86-00c0caa83e80', 'Delante Johnson (WBO welterweight rank 7) -> Delante Johnson [name_agreement; 1 commission bouts]'),
  ('bdea23c3-07a0-41d9-88bf-97bc538e0ea0', 'eb29b21f-14c4-4b1b-a6a6-4effb5b3d08b', 'Emmanuel Rodriguez (IBF bantamweight rank 4) -> Emmanuel Rodriguez [name_agreement; 1 commission bouts]'),
  ('cbfb3cef-8bc8-46d0-ae31-728d5aa6b20a', 'fcd33ba4-1b0c-4d4b-ae61-a44c0f4978b3', 'Jan Paul Rivera-Pizarro (WBO super_featherweight rank 14) -> Jan Paul Rivera-Pizarro [name_agreement; 1 commission bouts]'),
  ('9246723b-94ec-4f1a-bfb7-a4f50c979722', 'fcd33ba4-1b0c-4d4b-ae61-a44c0f4978b3', 'JAN PAUL RIVERA-PIZARRO (WBA featherweight rank 11) -> Jan Paul Rivera-Pizarro [name_agreement; 1 commission bouts]'),
  ('33294212-11a2-45cf-b0b9-f6a15540a90d', '69628310-5b33-466b-b714-d5d996aee772', 'Lucas Bahdi (IBF lightweight rank 11) -> Lucas Bahdi [name_agreement; 1 commission bouts]'),
  ('6316811c-561b-41ac-a87d-50f41127e12e', '69628310-5b33-466b-b714-d5d996aee772', 'LUCAS BAHDI (WBA lightweight rank 2) -> Lucas Bahdi [name_agreement; 1 commission bouts]'),
  ('05e82489-5db5-4dd6-9751-6a5279d42b4b', '69b6f115-d12e-4a3c-943e-a46afae1dc76', 'Mark Magsayo (IBF lightweight rank 7) -> Jessel Mark Araula Magsayo [contained_in_full_name; 1 commission bouts]'),
  ('39e6f995-085f-4053-9235-bf0e0abf88b0', '69b6f115-d12e-4a3c-943e-a46afae1dc76', 'Mark Magsayo (WBO lightweight rank 12) -> Jessel Mark Araula Magsayo [contained_in_full_name; 1 commission bouts]'),
  ('c6cb6378-9d99-4a75-88c0-5769de66f655', '5d3c4241-85e3-406f-a75d-7270263e92e1', 'Raymond Muratalla (WBO super_lightweight rank 1) -> Raymond Muratalla [name_agreement; 1 commission bouts]'),
  ('e29faaa4-511c-46c4-8120-bdc84a420366', '5d3c4241-85e3-406f-a75d-7270263e92e1', 'Raymond Muratalla (WBC super_lightweight rank 5) -> Raymond Muratalla [name_agreement; 1 commission bouts]'),
  ('b8b55a19-b39c-46f4-9918-425f44eafb7e', '02948c4b-ac3d-4a6e-bbc6-88b1226fc5ef', 'Rolando Romero (WBC welterweight rank 4) -> Rolando Florencio Romero Moreno [contained_in_full_name; 1 commission bouts]'),
  ('3a784b11-1e1f-4054-8809-8256abe04692', '02948c4b-ac3d-4a6e-bbc6-88b1226fc5ef', 'ROLANDO ROMERO (WBA welterweight rank 2) -> Rolando Florencio Romero Moreno [contained_in_full_name; 1 commission bouts]'),
  ('0cbd8c08-b5f7-4002-983c-3cf1f1bcd9be', '46467821-b739-4ff9-b50c-e2b9f48a09fa', 'Tsendbaatar Erdenebat (WBC super_featherweight rank 10) -> Tsendbaatar Erdenebat [name_agreement; 1 commission bouts]'),
  ('9179eece-a0b3-4a7b-b65f-b5b3712d7b63', '46467821-b739-4ff9-b50c-e2b9f48a09fa', 'Tsendbaatar Erdenebat (IBF super_featherweight rank 14) -> Tsendbaatar Erdenebat [name_agreement; 1 commission bouts]'),
  ('9d9eccff-2527-4e07-b04d-c07617163a85', 'a67e77ab-d6bc-4634-8581-fff87803fd9e', 'Umar Dzambekov (WBC light_heavyweight rank 13) -> Umar Dzambekov [name_agreement; 1 commission bouts]'),
  ('81807aa6-7126-4bf6-8f7e-679600e89b79', 'a67e77ab-d6bc-4634-8581-fff87803fd9e', 'UMAR DZAMBEKOV (WBA light_heavyweight rank 13) -> Umar Dzambekov [name_agreement; 1 commission bouts]'),
  ('fa7090f8-6779-43eb-8f35-1120f42a91b0', '973d57ef-84f1-4e90-ad45-ec54c6366425', 'Yoenis Tellez (WBO super_welterweight rank 15) -> Yoenis Tellez Silega [contained_in_full_name; 1 commission bouts]'),
  ('8cf761d0-8a80-4727-a462-372df8c42943', '973d57ef-84f1-4e90-ad45-ec54c6366425', 'YOENIS TELLEZ (WBA super_welterweight rank 2) -> Yoenis Tellez Silega [contained_in_full_name; 1 commission bouts]'),
  ('51fe5911-cbab-4d2e-9201-2db853d0c476', '5b256e34-080a-43ea-90cc-35f77a7b978c', 'Gustavo Trujillo (WBO heavyweight rank 13) -> Gustavo Trujillo [name_agreement; 2 commission bouts]'),
  ('7ad72959-91ec-4094-966a-727275d25a0b', '3097fb11-337a-4b53-a82a-c0944c18d8e4', 'Ali Ellis (WBC bridgerweight rank 14) -> Ali Ellis [name_agreement; 1 commission bouts]'),
  ('6d212676-0dcb-4914-8e24-9fa420595040', '681c5d81-009a-4310-b39b-a0d834498ef3', 'ANDREAS KATZOURAKIS (WBA middleweight rank 4) -> Andreas Katzourakis [name_agreement; 1 commission bouts]'),
  ('5a3ab8af-8180-46bd-a79a-6f950c638b61', '7c4db3cd-61ec-4f7f-802b-64312005e51d', 'Angelino Cordova (WBC flyweight rank 5) -> Angelino Cordova [name_agreement; 1 commission bouts]')
) as v(candidate_id, fighter_id, label)
join public.boxing_org_identity_candidates c on c.id = v.candidate_id::uuid and c.state <> 'ambiguous'
where not exists (select 1 from public.boxing_org_identity_candidate_decisions x where x.candidate_id = v.candidate_id::uuid);
commit;
