-- PREPARED, NOT APPLIED. Batch 06: link body entries of 15 POSSIBLE_EXISTING_FIGHTER subjects to the existing
-- commission-backed fighter named in reviews/identity/p0-batch-06-possible-existing.md. No merge, no new fighter.
-- Includes one OWNER-APPROVED EXCEPTION (ANDRES TERAN -> Jose Andres Teran Santibanez), excluded from batch 05.
-- Replace REVIEWER with the named human reviewer. Ambiguous clusters and already-linked entries are excluded.
begin;
insert into public.boxing_org_identity_candidate_decisions (candidate_id, decision, fighter_id, member_review_ids, reviewer, review_note, evidence)
select v.candidate_id::uuid, 'matched', v.fighter_id::uuid, '{}'::uuid[], 'REVIEWER',
  'Batch 06 body link to an existing fighter: ' || v.label,
  jsonb_build_object('batch', 'p0-batch-06', 'source', 'POSSIBLE_EXISTING_FIGHTER review')
from (values
  ('ae939ed0-c5d6-4938-a4aa-43735153181c', '665eb59b-aaee-41b0-a5f8-b82bb6c26806', 'ARMANDO MARTINEZ RABI (WBA lightweight rank 4) -> Armando Martinez Rabi [name_agreement; 1 commission bouts]'),
  ('6c291e04-b325-4e29-9c56-3a5b14c4cf20', 'faff3bff-2027-4091-9a1f-005c119979d4', 'DAINIER PERO (WBA heavyweight rank 6) -> Dainier Pero [name_agreement; 1 commission bouts]'),
  ('fb281e37-c97e-42a4-ab29-3d33750cc9d4', 'c80f354d-58de-4917-9552-ce041d0a4cc2', 'Daniel Blancas (WBC super_middleweight rank 11) -> Daniel Blancas [name_agreement; 1 commission bouts]'),
  ('771dcbcb-0f5d-449f-96a3-068b32f49268', '0dc6ee42-ff70-4ccf-bde3-7575a0c91a22', 'DEONTE BROWN (WBA super_featherweight rank 10) -> Deonte Brown [name_agreement; 1 commission bouts]'),
  ('eb9fda94-17f9-4c84-88d2-63fbe1c49347', '434676f2-3b73-4dee-9e5f-1179e2846dc7', 'EMANUEL MORENO (WBA bantamweight rank 13) -> Emanuel Moreno [name_agreement; 1 commission bouts]'),
  ('376b63d0-24fe-4256-b73f-c0e807d5483b', '40d78813-0ce6-434e-ba7f-908f8fb9791b', 'GREG OUTLAW (WBA welterweight rank 12) -> Greg Outlaw [name_agreement; 1 commission bouts]'),
  ('3764771f-8a53-42ca-9f0e-2ab9e3047e46', 'b9fc7103-909e-4e52-82af-14b2478ef127', 'GURGEN HOVHANNISYAN (WBA heavyweight rank 8) -> Gurgen Hovhannisyan [name_agreement; 1 commission bouts]'),
  ('f4ffeefd-dd41-48c3-9748-a271bcb10a20', 'f0305469-539c-4ea3-83b1-22d4aa299f63', 'JONATHAN GONZALEZ (WBA flyweight rank 2) -> Jonathan Gonzalez-Ortiz [contained_in_full_name; 1 commission bouts]'),
  ('c54bde74-e4e0-4769-9add-0ca7f86fa361', '2bebe4e6-6b7a-475f-a577-1c941e05bb43', 'Jordan Orozco (WBO bantamweight rank 10) -> Jordan Orozco Hernandez [contained_in_full_name; 1 commission bouts]'),
  ('9eed45ca-cdaa-4ec3-bcdd-8822427e2e91', '2bebe4e6-6b7a-475f-a577-1c941e05bb43', 'JORDAN OROZCO HERNANDEZ (WBA bantamweight rank 7) -> Jordan Orozco Hernandez [name_agreement; 1 commission bouts]'),
  ('2479c9c5-d6e8-4225-9f73-bbfd6214c058', '062eddb4-c1af-4717-9946-6f36f807bf69', 'Lyubomyr Pinchuk (WBC bridgerweight rank 13) -> Lyubomyr Pinchuk [name_agreement; 1 commission bouts]'),
  ('b667964e-f38d-44c9-8307-669caac264bb', '36e1aee1-01e3-4340-aa14-42d8da32d47a', 'Oscar Duarte (IBF super_lightweight rank 13) -> Oscar Duarte Juarado [contained_in_full_name; 1 commission bouts]'),
  ('8da7729e-9cd7-4c67-b557-1041c10b64a5', 'd353580e-1451-4ce2-ba42-b69ef409973e', 'SAMUEL ARNOLD (WBA light_heavyweight rank 8) -> Samuel Arnold [name_agreement; 1 commission bouts]'),
  ('70ffc0ff-f1a5-4ca6-b6ef-3cf03149ab06', '97ee2997-fc40-4669-9105-256ab1b3d7f7', 'TAYVIEN ALPOUGH (WBA light_flyweight rank 13) -> Tayvien Alpough [name_agreement; 1 commission bouts]'),
  ('7cc0f62c-65e6-4a87-be18-7f9ce137a321', '20839aec-38fb-4155-942c-9593cd51f4bc', 'YANKIEL RIVERA FIGUEROA (WBA flyweight rank 4) -> Yankiel Rivera Figueroa [name_agreement; 1 commission bouts]'),
  ('541a2b4a-ef69-4424-b30d-f993963e50e8', 'e03cd4d5-735c-45ba-b490-3708522a36e0', 'ANDRES TERAN (WBA bantamweight rank 2) -> Jose Andres Teran Santibanez [OWNER-APPROVED EXCEPTION 2026-10-03: whole ordered tokens in the stored full name, Mexico agrees, 1 commission bout; global given-name triage rule unchanged]')
) as v(candidate_id, fighter_id, label)
join public.boxing_org_identity_candidates c on c.id = v.candidate_id::uuid and c.state <> 'ambiguous'
where not exists (select 1 from public.boxing_org_identity_candidate_decisions x where x.candidate_id = v.candidate_id::uuid);
commit;
