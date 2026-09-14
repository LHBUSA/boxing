-- Boxing STAGING behavioural verification.
--
-- Every check runs inside its own PL/pgSQL block that ALWAYS ends by raising
-- 'BXTST', which rolls back everything the check wrote. Nothing persists.
-- Returns one jsonb array of {check, ok, detail}.

create or replace function pg_temp.boxing_staging_verify(p_expected_tables text[])
returns jsonb language plpgsql as $fn$
declare
  results jsonb := '[]'::jsonb;
  v_ok boolean;
  v_detail text;
  v_src uuid;
  v_a uuid; v_b uuid; v_evt uuid; v_bout uuid; v_judge uuid; v_card uuid; v_title uuid; v_org uuid; v_wc uuid;
  v_snap jsonb; v_rev jsonb; v_prov uuid; v_book uuid; v_mkt uuid; v_sel uuid; v_tick bigint; v_obs uuid; v_ne uuid; v_fb uuid;
  v_missing text[]; v_extra text[];
  n int;
  n_fighters_before int;
begin
  select count(*) into n_fighters_before from public.boxing_fighters;
  -- ---- 1. schema shape
  select array_agg(t order by t) into v_missing from unnest(p_expected_tables) t
    where not exists (select 1 from pg_tables where schemaname = 'public' and tablename = t);
  select array_agg(tablename::text order by tablename) into v_extra from pg_tables
    where schemaname = 'public' and tablename like 'boxing\_%' and not (tablename = any (p_expected_tables));
  results := results || jsonb_build_object('check', 'expected_tables_exist', 'ok', v_missing is null and v_extra is null,
    'detail', jsonb_build_object('expected', cardinality(p_expected_tables), 'missing', v_missing, 'unexpected', v_extra));

  -- ---- 2. RLS + grants
  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace
    where s.nspname = 'public' and c.relkind = 'r' and c.relname like 'boxing\_%' and not c.relrowsecurity;
  results := results || jsonb_build_object('check', 'rls_enabled_on_every_boxing_table', 'ok', n = 0, 'detail', n || ' without RLS');
  select count(*) into n from pg_policies where schemaname = 'public' and tablename like 'boxing\_%';
  results := results || jsonb_build_object('check', 'no_rls_policies_open_access', 'ok', n = 0, 'detail', n || ' policies');
  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace, unnest(array['anon','authenticated']) r
    where s.nspname = 'public' and c.relkind in ('r','v') and c.relname like 'boxing\_%'
      and (has_table_privilege(r, c.oid, 'SELECT') or has_table_privilege(r, c.oid, 'INSERT')
           or has_table_privilege(r, c.oid, 'UPDATE') or has_table_privilege(r, c.oid, 'DELETE') or has_table_privilege(r, c.oid, 'TRUNCATE'));
  results := results || jsonb_build_object('check', 'anon_authenticated_have_no_table_privileges', 'ok', n = 0, 'detail', n || ' grants found');
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace, unnest(array['anon','authenticated']) r
    where s.nspname = 'public' and p.proname like 'boxing\_%' and has_function_privilege(r, p.oid, 'EXECUTE');
  results := results || jsonb_build_object('check', 'anon_authenticated_cannot_execute_boxing_functions', 'ok', n = 0, 'detail', n || ' executable');
  results := results || jsonb_build_object('check', 'service_role_can_write_and_execute', 'ok',
    has_table_privilege('service_role', 'public.boxing_fighters', 'INSERT')
    and has_function_privilege('service_role', 'public.boxing_apply_identity_decision(jsonb)', 'EXECUTE'), 'detail', null);
  select count(*) into n from pg_constraint where contype = 'f' and connamespace = 'public'::regnamespace and confdeltype not in ('r','a');
  results := results || jsonb_build_object('check', 'no_cascading_foreign_keys', 'ok', n = 0, 'detail', n || ' cascading');

  -- ---- 3. anon cannot mutate canonical tables even if it tries (role switch)
  begin
    begin
      set local role anon;
      insert into public.boxing_fighters (display_name) values ('anon probe');
      v_ok := false;
    exception when insufficient_privilege then v_ok := true;
    end;
    reset role;
    raise exception using errcode = 'BXTST', message = v_ok::text;
  exception when sqlstate 'BXTST' then
    reset role;
    results := results || jsonb_build_object('check', 'anon_insert_refused_in_database', 'ok', sqlerrm = 'true', 'detail', null);
  end;

  -- ---- 4. source policy gates
  begin
    begin
      update public.boxing_sources set enabled = true where source_key = 'boxrec';
      v_ok := false;
    exception when check_violation then v_ok := true;
    end;
    begin
      insert into public.boxing_source_observations (source_id, entity_type, external_key, payload, content_hash)
      values ((select id from public.boxing_sources where source_key = 'compubox'), 'punch_stats', 'x', '{}', 'h');
      v_ok := false;
    exception when sqlstate 'BX010' then v_ok := v_ok and true;
    end;
    raise exception using errcode = 'BXTST', message = v_ok::text;
  exception when sqlstate 'BXTST' then
    results := results || jsonb_build_object('check', 'source_policy_gates_enforced', 'ok', sqlerrm = 'true',
      'detail', 'boxrec cannot be enabled; unapproved compubox observations refused');
  end;

  -- ---- 4b. The Odds API rights decision (migration 0010) and provider ledger guards
  select count(*) into n from public.boxing_sources s join public.boxing_source_rights_reviews r on r.id = s.latest_rights_review_id
    where s.source_key = 'the_odds_api' and s.enabled and s.access_mode = 'approved_ingest' and s.rights_state = 'approved'
      and s.persistence_allowed and s.derivative_allowed and s.display_allowed and not s.redistribution_allowed
      and r.decision = 'approved_with_restrictions' and r.terms_url = 'https://the-odds-api.com/terms-and-conditions.html' and not r.account_agreement_found;
  results := results || jsonb_build_object('check', 'the_odds_api_approved_without_raw_redistribution', 'ok', n = 1, 'detail', n || ' matching source/review');
  select count(*) into n from public.boxing_sources where enabled and source_key not in ('the_odds_api','wikidata','pbe_boxing_internal','pbe_manual_review',
    'nsac_nevada','florida_athletic_commission','nj_sacb','mo_office_of_athletics','pa_state_athletic_commission','tn_athletic_commission',
    'wba_official','ibf_official','wbo_official','wbc_official');
  results := results || jsonb_build_object('check', 'no_other_external_feed_enabled', 'ok', n = 0
      and exists (select 1 from public.boxing_sources where source_key = 'boxrec' and access_mode = 'blocked' and not enabled)
      and exists (select 1 from public.boxing_sources where source_key = 'compubox' and access_mode = 'blocked' and not enabled)
      and exists (select 1 from public.boxing_sources where source_key = 'tdlr_texas' and access_mode = 'reference_only' and not enabled),
    'detail', n || ' sources enabled outside {the_odds_api, wikidata, internal, nevada/florida/new jersey/missouri/pennsylvania/tennessee commissions, wbc/wba/ibf/wbo sanctioning bodies}; boxrec+compubox blocked; texas reference_only');
  select count(*) into n from public.boxing_sources s join public.boxing_source_rights_reviews r on r.id = s.latest_rights_review_id
    where s.source_key in ('nsac_nevada','florida_athletic_commission','nj_sacb','mo_office_of_athletics','pa_state_athletic_commission','tn_athletic_commission') and s.enabled and s.access_mode = 'approved_ingest' and not s.redistribution_allowed;
  results := results || jsonb_build_object('check', 'commission_sources_approved_with_reviews', 'ok', n = 6, 'detail', n || ' of 6 commission sources approved with a recorded review');
  begin
    v_ok := false;
    begin
      insert into public.boxing_source_document_revisions (document_id, revision, sha256, fetched_at)
      values (gen_random_uuid(), 1, repeat('a', 64), now());
    exception when foreign_key_violation then v_ok := true;
    end;
    select count(*) into n from pg_trigger where tgname = 'boxing_append_only_row' and tgrelid = 'public.boxing_source_document_revisions'::regclass;
    select count(*) into v_detail from pg_trigger where tgname = 'boxing_ingest_runs_provenance_guard';
    raise exception using errcode = 'BXTST', message = (v_ok and n = 1 and v_detail::int = 1)::text;
  exception when sqlstate 'BXTST' then
    results := results || jsonb_build_object('check', 'document_revisions_append_only_and_run_provenance_guarded', 'ok', sqlerrm = 'true', 'detail', null);
  end;
  begin
    v_ok := false;
    begin
      perform public.boxing_ingest_provider_quotes(jsonb_build_object('provider_slug', 'the_odds_api', 'observation_id', gen_random_uuid(), 'events', '[]'::jsonb));
    exception when sqlstate 'BX052' then v_ok := true;
    end;
    insert into public.boxing_source_observations (source_id, entity_type, external_key, payload, content_hash)
      values ((select id from public.boxing_sources where source_key = 'the_odds_api'), 'odds_snapshot', 'verify|probe', '[]', 'verify-probe') returning id into v_obs;
    v_rev := public.boxing_ingest_provider_quotes(jsonb_build_object('provider_slug', 'the_odds_api', 'observation_id', v_obs, 'region', 'us',
      'events', jsonb_build_array(jsonb_build_object('provider_event_id', 'verify-probe-evt', 'sport_key', 'boxing_boxing', 'commence_time', now() + interval '5 days',
        'home_name', 'Verify Probe Home', 'away_name', 'Verify Probe Away', 'quotes', jsonb_build_array(
          jsonb_build_object('bookmaker_key', 'verify_book', 'market_key', 'h2h', 'outcome_name', 'Verify Probe Home', 'american', -150, 'decimal', 1.666667, 'implied', 0.6, 'is_live', false),
          jsonb_build_object('bookmaker_key', 'verify_book', 'market_key', 'h2h', 'outcome_name', 'Verify Probe Home', 'american', -150, 'decimal', 1.666667, 'implied', 0.6, 'is_live', false))))));
    begin
      update public.boxing_provider_quotes set price_american = 100 where observation_id = v_obs;
      v_ok := false;
    exception when sqlstate 'BX001' then v_ok := v_ok and true;
    end;
    v_ok := v_ok and (v_rev ->> 'quotes_inserted')::int = 1 and (v_rev ->> 'quotes_unchanged')::int = 1
      and not exists (select 1 from public.boxing_fighters where display_name like 'Verify Probe%');
    raise exception using errcode = 'BXTST', message = v_ok::text;
  exception when sqlstate 'BXTST' then
    results := results || jsonb_build_object('check', 'provider_ledger_requires_raw_observation_dedupes_and_is_immutable', 'ok', sqlerrm = 'true',
      'detail', 'BX052 without observation; unchanged price not re-inserted; quotes append-only; no fighters created');
  end;

  -- shared fixture builder used by the history checks (always rolled back)
  -- ---- 5. append-only history: observations, ticks, ledger, rankings, scorecards, titles, fact blocks
  begin
    insert into public.boxing_sources (source_key, source_name, source_kind, access_mode, rights_state, enabled, persistence_allowed, reviewed_at, display_allowed)
      values ('staging_verify_probe', 'probe', 'internal', 'approved_ingest', 'internal', true, true, now(), true) returning id into v_src;
    insert into public.boxing_fighters (display_name) values ('Verify Probe A') returning id into v_a;
    insert into public.boxing_fighters (display_name) values ('Verify Probe B') returning id into v_b;
    insert into public.boxing_events (source_id, name, event_date) values (v_src, 'Verify Card', '2026-01-01') returning id into v_evt;
    insert into public.boxing_bouts (event_id, source_id, scheduled_rounds) values (v_evt, v_src, 12) returning id into v_bout;
    insert into public.boxing_bout_participants (bout_id, fighter_id, side) values (v_bout, v_a, 'a'), (v_bout, v_b, 'b');

    -- observations
    insert into public.boxing_source_observations (source_id, entity_type, external_key, payload, content_hash)
      values (v_src, 'probe', 'k', '{}', 'h1') returning id into v_obs;
    v_ok := false;
    begin update public.boxing_source_observations set payload = '{"x":1}' where id = v_obs;
    exception when sqlstate 'BX001' then v_ok := true; end;
    results := results || jsonb_build_object('check', 'raw_observations_immutable', 'ok', v_ok, 'detail', null);

    -- odds ticks
    select id into v_prov from public.boxing_odds_providers where slug = 'the_odds_api';
    insert into public.boxing_bookmakers (slug, name) values ('verify_book', 'verify') returning id into v_book;
    insert into public.boxing_markets (bout_id, provider_id, bookmaker_id, market_type, market_key) values (v_bout, v_prov, v_book, 'moneyline', 'moneyline|fight|-|pre') returning id into v_mkt;
    insert into public.boxing_market_selections (market_id, selection_key, fighter_id) values (v_mkt, 'fighter_a', v_a) returning id into v_sel;
    insert into public.boxing_market_ticks (selection_id, american_odds, decimal_odds, implied_probability, provider_timestamp)
      values (v_sel, -150, 1.666667, 0.6, '2026-01-01T00:00:00Z') returning id into v_tick;
    v_ok := false;
    begin update public.boxing_market_ticks set american_odds = -110 where id = v_tick;
    exception when sqlstate 'BX001' then v_ok := true; end;
    select count(*) into n from public.boxing_market_ticks where selection_id = v_sel;
    insert into public.boxing_market_ticks (selection_id, american_odds, decimal_odds, implied_probability, provider_timestamp)
      values (v_sel, -150, 1.666667, 0.6, '2026-01-02T00:00:00Z');
    results := results || jsonb_build_object('check', 'odds_ticks_cannot_be_rewritten', 'ok',
      v_ok and n = (select count(*) from public.boxing_market_ticks where selection_id = v_sel),
      'detail', 'update refused; unchanged re-delivery is not a new tick');

    -- fight-state ledger
    insert into public.boxing_fight_state_ledger (bout_id, boxing_event_id, checkpoint, bout_state) values (v_bout, v_evt, 'verify', '{"s":1}');
    v_ok := false;
    begin update public.boxing_fight_state_ledger set bout_state = '{}' where bout_id = v_bout;
    exception when sqlstate 'BX001' then v_ok := true; end;
    begin delete from public.boxing_fight_state_ledger where bout_id = v_bout; v_ok := false;
    exception when sqlstate 'BX001' then v_ok := v_ok and true; end;
    results := results || jsonb_build_object('check', 'fight_state_ledger_immutable', 'ok', v_ok, 'detail', null);

    -- scorecard correction preserves history
    insert into public.boxing_officials (display_name, official_type) values ('Verify Judge', 'judge') returning id into v_judge;
    insert into public.boxing_bout_officials (bout_id, official_id, role, slot, source_id) values (v_bout, v_judge, 'judge', 1, v_src);
    v_rev := public.boxing_record_scorecard(jsonb_build_object('bout_id', v_bout, 'judge_id', v_judge, 'fighter_a_id', v_a, 'fighter_b_id', v_b,
      'fighter_a_total', 115, 'fighter_b_total', 113, 'source_key', 'staging_verify_probe', 'rounds', '[]'::jsonb));
    v_rev := public.boxing_record_scorecard(jsonb_build_object('bout_id', v_bout, 'judge_id', v_judge, 'fighter_a_id', v_a, 'fighter_b_id', v_b,
      'fighter_a_total', 116, 'fighter_b_total', 112, 'source_key', 'staging_verify_probe', 'rounds', '[]'::jsonb));
    select count(*) into n from public.boxing_scorecards where bout_id = v_bout;
    results := results || jsonb_build_object('check', 'scorecard_correction_preserves_history', 'ok',
      n = 2 and v_rev ->> 'status' = 'revised' and (select fighter_a_total from public.boxing_scorecards_current where bout_id = v_bout) = 116,
      'detail', v_rev);

    -- title-event history
    v_title := public.boxing_ensure_title('wbc', 'welterweight', 'male', 'world', null);
    perform public.boxing_record_title_event(jsonb_build_object('title_id', v_title, 'event_type', 'awarded', 'fighter_id', v_a, 'effective_on', '2025-01-01', 'source_key', 'staging_verify_probe', 'event_key', 'verify:1'));
    perform public.boxing_record_title_event(jsonb_build_object('title_id', v_title, 'event_type', 'vacated', 'fighter_id', v_a, 'effective_on', '2025-06-01', 'source_key', 'staging_verify_probe', 'event_key', 'verify:2'));
    results := results || jsonb_build_object('check', 'title_event_history_derives_reigns', 'ok',
      (select count(*) from public.boxing_title_reigns_derived(v_title) where fighter_id = v_a and started_on = '2025-01-01' and ended_on = '2025-06-01') = 1,
      'detail', null);

    -- ranking snapshots
    v_snap := public.boxing_import_ranking_snapshot(jsonb_build_object('source_key', 'staging_verify_probe', 'organization_slug', 'wbc', 'weight_class_key', 'welterweight',
      'published_on', '2025-02-01', 'content_hash', 'r1', 'entries', jsonb_build_array(jsonb_build_object('position', 1, 'rank_label', 'C', 'fighter_id', v_a, 'is_champion', true))));
    v_rev := public.boxing_import_ranking_snapshot(jsonb_build_object('source_key', 'staging_verify_probe', 'organization_slug', 'wbc', 'weight_class_key', 'welterweight',
      'published_on', '2025-02-01', 'content_hash', 'r2', 'entries', jsonb_build_array(jsonb_build_object('position', 1, 'rank_label', 'C', 'fighter_id', v_b, 'is_champion', true))));
    v_ok := false;
    begin update public.boxing_ranking_entries set fighter_id = v_b where snapshot_id = (v_snap ->> 'snapshot_id')::uuid;
    exception when sqlstate 'BX001' then v_ok := true; end;
    results := results || jsonb_build_object('check', 'ranking_snapshots_immutable_with_revisions', 'ok',
      v_ok and v_rev ->> 'status' = 'revised' and (v_rev ->> 'revision')::int = 2, 'detail', v_rev);

    -- news fact blocks
    insert into public.boxing_news_events (event_type, dedupe_key, payload, sources) values ('OTHER', 'verify:news', '{}', '[{"source_key":"staging_verify_probe"}]') returning id into v_ne;
    insert into public.boxing_fact_blocks (news_event_id, block, block_hash, builder_version, sensitivity) values (v_ne, '{"schema":"boxing-fact-block@1","facts":[]}', 'hash', 'verify', 'normal') returning id into v_fb;
    v_ok := false;
    begin update public.boxing_fact_blocks set block = '{"schema":"x","facts":[]}' where id = v_fb;
    exception when sqlstate 'BX001' then v_ok := true; end;
    results := results || jsonb_build_object('check', 'news_fact_blocks_immutable', 'ok', v_ok, 'detail', null);

    -- Fight DNA (issue #6): metric values only when available; snapshots immutable; definitions frozen per version
    perform public.boxing_register_metric_definition(jsonb_build_object('metric_key', 'verify.probe_rate', 'version', '1.0.0', 'subject_kind', 'fighter',
      'category', 'results', 'name', 'probe', 'description', 'probe', 'formula_text', 'a / b', 'value_kind', 'rate', 'minimum_sample', '{"bouts": 5}'::jsonb,
      'required_inputs', '["result.outcome"]'::jsonb));
    v_ok := false;
    begin
      insert into public.boxing_fighter_metric_snapshots (fighter_id, metric_key, metric_version, as_of, value_number, sample_size, status)
        values (v_a, 'verify.probe_rate', '1.0.0', now(), 0.5, 2, 'insufficient_sample');
    exception when check_violation then v_ok := true; end;
    insert into public.boxing_fighter_metric_snapshots (fighter_id, metric_key, metric_version, as_of, value_number, sample_size, status, inputs_hash)
      values (v_a, 'verify.probe_rate', '1.0.0', now(), null, 2, 'insufficient_sample', 'verify') returning id into v_card;
    begin update public.boxing_fighter_metric_snapshots set value_number = 1 where id = v_card; v_ok := false;
    exception when sqlstate 'BX001' then v_ok := v_ok and true; end;
    v_detail := null;
    begin perform public.boxing_register_metric_definition(jsonb_build_object('metric_key', 'verify.probe_rate', 'version', '1.0.0', 'subject_kind', 'fighter',
      'category', 'results', 'name', 'probe', 'description', 'probe', 'formula_text', 'CHANGED', 'value_kind', 'rate', 'minimum_sample', '{"bouts": 5}'::jsonb,
      'required_inputs', '["result.outcome"]'::jsonb)); v_ok := false;
    exception when sqlstate 'BX100' then v_detail := 'BX100'; end;
    results := results || jsonb_build_object('check', 'fight_dna_null_unless_available_immutable_versioned', 'ok', v_ok and v_detail is not distinct from 'BX100', 'detail', null);

    -- matchup snapshots cannot look past the bout start; an untrained model publishes nothing
    v_ok := false;
    begin
      insert into public.boxing_matchup_snapshots (bout_id, model_key, model_version, as_of, input_cutoff, fighter_a_id, fighter_b_id, features)
        values (v_bout, 'pbe_matchup_dna', '1.0.0', public.boxing_bout_starts_at(v_bout) + interval '1 day', public.boxing_bout_starts_at(v_bout) + interval '1 day', v_a, v_b, '{}');
    exception when sqlstate 'BX120' then v_ok := true; end;
    insert into public.boxing_matchup_snapshots (bout_id, model_key, model_version, as_of, input_cutoff, fighter_a_id, fighter_b_id, features, inputs_hash)
      values (v_bout, 'pbe_matchup_dna', '1.0.0', public.boxing_bout_starts_at(v_bout) - interval '1 day', public.boxing_bout_starts_at(v_bout) - interval '1 day', v_a, v_b, '{}', 'verify')
      returning id into v_fb;
    begin
      insert into public.boxing_model_outputs (model_key, model_version, bout_id, matchup_snapshot_id, feature_model_version, input_cutoff, selection_key, probability, fair_decimal, fair_american)
        values ('pbe_bout_winner', '0.1.0', v_bout, v_fb, '1.0.0', public.boxing_bout_starts_at(v_bout) - interval '1 day', 'fighter_a', 0.6, 1.666667, -150);
      v_ok := false;
    exception when sqlstate 'BX111' then v_ok := v_ok and true; end;
    results := results || jsonb_build_object('check', 'matchup_cutoff_guard_and_untrained_model_refused', 'ok', v_ok,
      'detail', (select status from public.boxing_models where model_key = 'pbe_bout_winner' and version = '0.1.0'));

    raise exception using errcode = 'BXTST', message = 'rollback';
  exception when sqlstate 'BXTST' then null;
  end;

  -- identity graph / provider identities / promoters / news time (migration 0016)
  select count(*) into n from pg_trigger where tgname = 'boxing_append_only_row'
    and tgrelid in ('public.boxing_identity_appearance_decisions'::regclass, 'public.boxing_provider_participant_identities'::regclass);
  results := results || jsonb_build_object('check', 'identity_decisions_and_provider_identities_append_only', 'ok', n = 2, 'detail', n || ' of 2 append-only triggers');
  select count(*) into n from public.boxing_provider_participant_identities i
    where not exists (select 1 from public.boxing_bout_participants p where p.bout_id = i.bout_id and p.fighter_id = public.boxing_canonical_fighter_id(i.fighter_id))
       or not exists (select 1 from public.boxing_bout_identities b where b.bout_id = i.bout_id and b.external_id = i.provider_event_id);
  results := results || jsonb_build_object('check', 'provider_identities_only_from_mapped_bout_corners', 'ok', n = 0, 'detail', n || ' provider identities without a mapped bout corner');
  select count(*) into n from public.boxing_sources where source_kind = 'promotion' and (enabled or access_mode = 'approved_ingest');
  results := results || jsonb_build_object('check', 'no_promoter_source_enabled', 'ok', n = 0, 'detail', n || ' promoter sources enabled or approved');
  select count(*) into n from public.boxing_identity_appearance_decisions d
    where d.decided_by = 'resolver' and ((d.decision = 'matched' and d.tier not in ('A','B')) or (d.decision = 'created' and d.tier not in ('A','D')) or d.evidence_hash = '');
  results := results || jsonb_build_object('check', 'resolver_decisions_tiered_and_evidenced', 'ok', n = 0, 'detail', n || ' resolver decisions without a valid tier or evidence hash');
  select count(*) into n from public.boxing_news_events ne join public.boxing_events e on e.id = coalesce(ne.boxing_event_id, (select b.event_id from public.boxing_bouts b where b.id = ne.bout_id))
    where ne.state in ('new','needs_review') and ne.event_type not in ('RESULT_CORRECTED','RESULT_OVERTURNED','MARKET_MOVED')
      and e.event_date < (ne.detected_at at time zone 'UTC')::date - 45;
  results := results || jsonb_build_object('check', 'no_newsworthy_news_about_old_events', 'ok', n = 0, 'detail', n || ' open news events more than 45 days after their event');
  select jsonb_array_length(public.boxing_possible_duplicate_bouts(1000)) into n;
  results := results || jsonb_build_object('check', 'no_possible_duplicate_canonical_bouts', 'ok', n = 0,
    'detail', n || ' same-pair bouts within a day that are not a distinct repeat pairing on one card');

  -- officials canonicalization (migration 0024)
  select count(*) into n from pg_trigger where tgname = 'boxing_append_only_row'
    and tgrelid in ('public.boxing_official_canonicalizations'::regclass, 'public.boxing_official_aliases'::regclass);
  results := results || jsonb_build_object('check', 'official_canonicalizations_and_aliases_append_only', 'ok', n = 2, 'detail', n || ' of 2 append-only triggers');
  select count(*) into n from (select 1 from public.boxing_bout_officials where assignment_state in ('assigned','worked') and role = 'judge' and slot is not null
    group by bout_id, slot having count(*) > 1) d;
  results := results || jsonb_build_object('check', 'no_duplicate_active_judge_slots', 'ok', n = 0, 'detail', n || ' bout/slot pairs with two active judges');
  select count(*) into n from public.boxing_officials o join public.boxing_officials t on t.id = o.merged_into_id where t.merged_into_id is not null;
  results := results || jsonb_build_object('check', 'merged_officials_resolve_to_a_canonical_official', 'ok', n = 0, 'detail', n || ' merge chains');
  select count(*) into n from public.boxing_scorecards_current s
    where not exists (select 1 from public.boxing_bout_officials bo where bo.bout_id = s.bout_id and bo.official_id = s.judge_id and bo.assignment_state in ('assigned','worked'));
  results := results || jsonb_build_object('check', 'current_scorecards_have_an_active_judge_assignment', 'ok', n = 0, 'detail', n || ' current scorecards without an active assignment of their judge');

  select count(*) into n from public.boxing_fighters;
  results := results || jsonb_build_object('check', 'verification_left_no_residue', 'ok', n = n_fighters_before and not exists (select 1 from public.boxing_sources where source_key = 'staging_verify_probe'),
    'detail', n || ' fighters after checks, ' || n_fighters_before || ' before');
  return results;
end $fn$;

select pg_temp.boxing_staging_verify(:expected_tables) as results;
