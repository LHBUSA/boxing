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
begin
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
      values ((select id from public.boxing_sources where source_key = 'the_odds_api'), 'odds_snapshot', 'x', '{}', 'h');
      v_ok := false;
    exception when sqlstate 'BX010' then v_ok := v_ok and true;
    end;
    raise exception using errcode = 'BXTST', message = v_ok::text;
  exception when sqlstate 'BXTST' then
    results := results || jsonb_build_object('check', 'source_policy_gates_enforced', 'ok', sqlerrm = 'true',
      'detail', 'boxrec cannot be enabled; the_odds_api observations refused');
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

  select count(*) into n from public.boxing_fighters;
  results := results || jsonb_build_object('check', 'verification_left_no_residue', 'ok', n = 0 and not exists (select 1 from public.boxing_sources where source_key = 'staging_verify_probe'),
    'detail', n || ' fighters present after checks');
  return results;
end $fn$;

select pg_temp.boxing_staging_verify(:expected_tables) as results;
