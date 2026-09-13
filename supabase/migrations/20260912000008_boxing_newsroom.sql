-- PropBetEdge Boxing — fact-driven newsroom storage (issue #5)
--
-- SOURCE OBSERVATION -> NORMALIZED FACT -> CHANGE DETECTION -> NEWS EVENT
--   -> FACT BLOCK (immutable, hashed) -> ARTICLE (versioned) -> REVIEW -> PUBLISH
--
-- An article can only be published if (a) it passed the prose validator, whose
-- verdict is stored on the article, and (b) it went through `approved`.
-- Everything an article claims is traceable to its stored fact block forever.
-- Rerunnable.

begin;

-- ---------------------------------------------------------------------------
-- Fact blocks: exactly what a generator was allowed to state
-- ---------------------------------------------------------------------------

create table if not exists public.boxing_fact_blocks (
  id uuid primary key default gen_random_uuid(),
  news_event_id uuid not null references public.boxing_news_events(id) on delete restrict,
  block jsonb not null,
  block_hash text not null,
  builder_version text not null,
  sensitivity text not null check (sensitivity in ('normal','sensitive')),
  review_reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (news_event_id, block_hash),
  check (jsonb_typeof(block -> 'facts') = 'array'),
  check (block ? 'schema')
);
create index if not exists boxing_fact_blocks_event_idx on public.boxing_fact_blocks (news_event_id, created_at);
select public.boxing_install_append_only('public.boxing_fact_blocks');

-- ---------------------------------------------------------------------------
-- Articles: versioned, review-gated, content immutable once written
-- ---------------------------------------------------------------------------

alter table public.boxing_articles
  add column if not exists fact_block_id uuid references public.boxing_fact_blocks(id) on delete restrict,
  add column if not exists fact_block_hash text,
  add column if not exists article_version int not null default 1,
  add column if not exists supersedes_article_id uuid references public.boxing_articles(id) on delete restrict,
  add column if not exists generator_version text,
  add column if not exists validator_version text,
  add column if not exists model_versions jsonb not null default '{}'::jsonb,
  add column if not exists validation jsonb,
  add column if not exists claims jsonb not null default '[]'::jsonb,
  add column if not exists event_type text,
  add column if not exists review_reasons text[] not null default '{}',
  add column if not exists reviewed_by text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text,
  add column if not exists state_changed_at timestamptz;

-- migrate the 0001 state vocabulary forward
update public.boxing_articles set state = case state
    when 'draft' then 'generated' when 'review' then 'review_required' when 'retracted' then 'superseded' else state end
  where state in ('draft','review','retracted');
alter table public.boxing_articles alter column state set default 'generated';
alter table public.boxing_articles drop constraint if exists boxing_articles_state_check;
alter table public.boxing_articles add constraint boxing_articles_state_check
  check (state in ('generated','review_required','approved','published','rejected','superseded'));
alter table public.boxing_articles drop constraint if exists boxing_articles_published_check;
alter table public.boxing_articles add constraint boxing_articles_published_check
  check ((state in ('published','superseded')) = (published_at is not null));
alter table public.boxing_articles drop constraint if exists boxing_articles_body_nonempty_check;
alter table public.boxing_articles add constraint boxing_articles_body_nonempty_check
  check (length(btrim(body_md)) > 0 and length(btrim(headline)) > 0);

create unique index if not exists boxing_articles_event_version_key
  on public.boxing_articles (news_event_id, article_version) where news_event_id is not null;
create unique index if not exists boxing_articles_event_block_key
  on public.boxing_articles (news_event_id, fact_block_hash) where news_event_id is not null and fact_block_hash is not null;
create unique index if not exists boxing_articles_single_successor
  on public.boxing_articles (supersedes_article_id) where supersedes_article_id is not null;
create index if not exists boxing_articles_state_idx on public.boxing_articles (state, created_at);

-- Only workflow columns may change; the words, the fact block and the
-- validator's verdict are frozen once the article row exists.
drop trigger if exists boxing_articles_guard on public.boxing_articles;
create trigger boxing_articles_guard before update or delete on public.boxing_articles
  for each row execute function public.boxing_guard_mutable_columns(
    'state','published_at','reviewed_by','reviewed_at','review_note','state_changed_at','updated_at');
drop trigger if exists boxing_articles_truncate on public.boxing_articles;
create trigger boxing_articles_truncate before truncate on public.boxing_articles
  for each statement execute function public.boxing_append_only();

-- Forward-only review state machine + publish gate.
create or replace function public.boxing_article_state_guard()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_allowed text[];
begin
  if tg_op = 'INSERT' then
    if new.state not in ('generated','review_required','approved','rejected') then
      raise exception 'article_state_invalid_on_insert: %', new.state using errcode = 'BX090';
    end if;
    if new.state = 'approved' and coalesce((new.validation ->> 'ok')::boolean, false) is not true then
      raise exception 'article_not_validated: cannot insert as approved without a passing validation' using errcode = 'BX091';
    end if;
    return new;
  end if;
  if new.state = old.state then return new; end if;
  v_allowed := case old.state
    when 'generated' then array['review_required','approved','rejected']
    when 'review_required' then array['approved','rejected']
    when 'approved' then array['published','rejected','review_required']
    when 'published' then array['superseded']
    else array[]::text[] end;
  if not (new.state = any (v_allowed)) then
    raise exception 'article_state_transition_invalid: % -> %', old.state, new.state using errcode = 'BX090';
  end if;
  if new.state in ('approved','published') and coalesce((new.validation ->> 'ok')::boolean, false) is not true then
    raise exception 'article_not_validated: % requires a passing validation', new.state using errcode = 'BX091';
  end if;
  if old.state = 'review_required' and new.state = 'approved' and coalesce(new.reviewed_by, '') = '' then
    raise exception 'article_review_requires_reviewer' using errcode = 'BX092';
  end if;
  if new.state = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  new.state_changed_at := now();
  return new;
end $$;
drop trigger if exists boxing_articles_state_guard on public.boxing_articles;
create trigger boxing_articles_state_guard before insert or update of state on public.boxing_articles
  for each row execute function public.boxing_article_state_guard();

-- ---------------------------------------------------------------------------
-- Newsroom RPCs
-- ---------------------------------------------------------------------------

create or replace function public.boxing_news_events_pending(p_limit int default 50)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(n) order by n.detected_at), '[]'::jsonb)
  from (select * from public.boxing_news_events n
        where n.state in ('new','needs_review')
          and not exists (select 1 from public.boxing_articles a where a.news_event_id = n.id)
        order by n.detected_at limit greatest(1, least(p_limit, 500))) n
$$;

-- Everything a fact-block builder may read for one news event. Pure lookups
-- over canonical tables; the builder decides what becomes a fact.
create or replace function public.boxing_news_context(p_news_event uuid)
returns jsonb language sql stable set search_path = '' as $$
  with n as (select * from public.boxing_news_events where id = p_news_event),
  fighter_ids as (
    select distinct x as id from n, unnest(n.fighter_ids) x
    union select p.fighter_id from n join public.boxing_bout_participants p on p.bout_id = n.bout_id
      and p.participant_status in ('scheduled','confirmed')
  )
  select jsonb_build_object(
    'news_event', (select to_jsonb(n) from n),
    'supersedes', (select to_jsonb(s) from n join public.boxing_news_events s on s.id = n.supersedes_id),
    'sources', (select coalesce(jsonb_agg(jsonb_build_object('source_key', s.source_key, 'source_name', s.source_name,
                                                             'rights_state', s.rights_state, 'display_allowed', s.display_allowed,
                                                             'attribution_required', s.attribution_required)), '[]'::jsonb)
                from public.boxing_sources s
                where s.source_key in (select jsonb_array_elements(n.sources) ->> 'source_key' from n)),
    'fighters', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'public_id', f.public_id, 'display_name', f.display_name,
                                                             'identity_state', f.identity_state, 'nationality', f.nationality) order by f.display_name), '[]'::jsonb)
                 from public.boxing_fighters f where f.id in (select id from fighter_ids)),
    'bout', (select jsonb_build_object('id', b.id, 'public_id', b.public_id, 'status', b.status, 'scheduled_rounds', b.scheduled_rounds,
                                       'contracted_weight_lb', b.contracted_weight_lb, 'is_catchweight', b.is_catchweight,
                                       'weight_class', (select jsonb_build_object('key', wc.class_key, 'name', wc.name, 'max_weight_lb', wc.max_weight_lb)
                                                        from public.boxing_weight_classes wc where wc.id = b.weight_class_id),
                                       'participants', (select coalesce(jsonb_agg(jsonb_build_object('fighter_id', p.fighter_id, 'side', p.side,
                                                          'record_wins', p.record_wins, 'record_losses', p.record_losses, 'record_draws', p.record_draws,
                                                          'record_source_id', p.source_id) order by p.side), '[]'::jsonb)
                                                        from public.boxing_bout_participants p where p.bout_id = b.id and p.participant_status in ('scheduled','confirmed')),
                                       'titles', (select coalesce(jsonb_agg(jsonb_build_object('title_id', t.id, 'organization', o.short_name, 'tier', t.tier,
                                                     'source_native_label', t.source_native_label, 'eligible_fighter_id', bt.eligible_fighter_id) order by o.slug), '[]'::jsonb)
                                                  from public.boxing_bout_titles bt join public.boxing_titles t on t.id = bt.title_id
                                                  join public.boxing_organizations o on o.id = t.organization_id
                                                  where bt.bout_id = b.id and bt.at_stake),
                                       'result', (select to_jsonb(r) from public.boxing_bout_results_current r where r.bout_id = b.id),
                                       'officials', (select coalesce(jsonb_agg(jsonb_build_object('official_id', o.id, 'display_name', o.display_name, 'role', bo.role, 'slot', bo.slot)
                                                        order by bo.role, bo.slot), '[]'::jsonb)
                                                     from public.boxing_bout_officials bo join public.boxing_officials o on o.id = bo.official_id
                                                     where bo.bout_id = b.id and bo.assignment_state in ('assigned','worked')))
             from n join public.boxing_bouts b on b.id = n.bout_id),
    'event', (select jsonb_build_object('id', e.id, 'public_id', e.public_id, 'name', e.name, 'event_date', e.event_date, 'status', e.status,
                                        'venue', (select jsonb_build_object('name', v.name, 'city', v.city, 'country_code', v.country_code) from public.boxing_venues v where v.id = e.venue_id),
                                        'commission', (select jsonb_build_object('name', c.name, 'slug', c.slug) from public.boxing_commissions c where c.id = e.commission_id))
              from public.boxing_events e
              where e.id = coalesce((select boxing_event_id from n), (select b.event_id from n join public.boxing_bouts b on b.id = n.bout_id))),
    'previous_meetings', (select coalesce(jsonb_agg(jsonb_build_object('bout_id', b.id, 'event_date', e.event_date, 'outcome', r.outcome,
                                                                      'winner_id', r.winner_id, 'method', r.method) order by e.event_date), '[]'::jsonb)
                          from public.boxing_bouts b join public.boxing_events e on e.id = b.event_id
                          left join public.boxing_bout_results_current r on r.bout_id = b.id
                          where b.id <> coalesce((select bout_id from n), '00000000-0000-0000-0000-000000000000'::uuid)
                            and (select count(*) from fighter_ids) = 2
                            and (select count(*) from public.boxing_bout_participants p where p.bout_id = b.id
                                 and p.participant_status in ('scheduled','confirmed') and p.fighter_id in (select id from fighter_ids)) = 2),
    'fight_dna', (select coalesce(jsonb_agg(jsonb_build_object('fighter_id', m.fighter_id, 'metric_key', m.metric_key, 'metric_version', m.metric_version,
                                                              'as_of', m.as_of, 'value_number', m.value_number, 'sample_size', m.sample_size,
                                                              'metric_name', d.name) order by m.fighter_id, m.metric_key), '[]'::jsonb)
                  from (select distinct on (s.fighter_id, s.metric_key) s.* from public.boxing_fighter_metric_snapshots s
                        where s.fighter_id in (select id from fighter_ids) order by s.fighter_id, s.metric_key, s.as_of desc) m
                  join public.boxing_metric_definitions d on d.metric_key = m.metric_key and d.version = m.metric_version
                  where d.retired_at is null),
    'weigh_in_history', (select coalesce(jsonb_agg(jsonb_build_object('weigh_in_id', w.id, 'fighter_id', w.fighter_id, 'weigh_in_kind', w.weigh_in_kind,
                                                                     'attempt_no', w.attempt_no, 'official_weight_lb', w.official_weight_lb,
                                                                     'verification_state', w.verification_state, 'revision', w.revision,
                                                                     'source_key', s.source_key) order by w.fighter_id, w.attempt_no, w.revision), '[]'::jsonb)
                         from public.boxing_weigh_ins w join public.boxing_sources s on s.id = w.source_id
                         where w.bout_id = (select bout_id from n)),
    'market', (select coalesce(jsonb_agg(jsonb_build_object('market_key', c.market_key, 'selection_key', c.selection_key,
                                                           'bookmaker_count', c.bookmaker_count, 'consensus_implied', c.consensus_implied,
                                                           'min_american', c.min_american, 'max_american', c.max_american,
                                                           'newest_price_at', c.newest_price_at)), '[]'::jsonb)
               from public.boxing_market_consensus c
               where c.bout_id = (select bout_id from n) and c.bookmaker_count > 0 and c.market_key like 'moneyline%|pre')
  )
$$;

create or replace function public.boxing_store_article(p jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_block uuid;
  v_article uuid;
  v_prev public.boxing_articles%rowtype;
  v_existing uuid;
begin
  insert into public.boxing_fact_blocks (news_event_id, block, block_hash, builder_version, sensitivity, review_reasons)
  values ((p ->> 'news_event_id')::uuid, p -> 'fact_block', p ->> 'fact_block_hash', p ->> 'builder_version',
          p ->> 'sensitivity', coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p -> 'review_reasons', '[]'::jsonb)) x), '{}'))
  on conflict (news_event_id, block_hash) do nothing
  returning id into v_block;
  if v_block is null then
    select id into v_block from public.boxing_fact_blocks where news_event_id = (p ->> 'news_event_id')::uuid and block_hash = p ->> 'fact_block_hash';
  end if;

  select id into v_existing from public.boxing_articles
  where news_event_id = (p ->> 'news_event_id')::uuid and fact_block_hash = p ->> 'fact_block_hash';
  if v_existing is not null then
    return jsonb_build_object('status', 'duplicate', 'article_id', v_existing, 'fact_block_id', v_block);
  end if;

  -- a corrected news event supersedes the article written for the event it corrects
  select a.* into v_prev from public.boxing_articles a
  where a.news_event_id = (select supersedes_id from public.boxing_news_events where id = (p ->> 'news_event_id')::uuid)
    and not exists (select 1 from public.boxing_articles s where s.supersedes_article_id = a.id)
  order by a.article_version desc limit 1;

  insert into public.boxing_articles
    (news_event_id, slug, headline, dek, body_md, fact_block, sources, model_version, needs_human, state, fact_block_id, fact_block_hash,
     article_version, supersedes_article_id, generator_version, validator_version, model_versions, validation, claims, event_type, review_reasons)
  values ((p ->> 'news_event_id')::uuid, p ->> 'slug', p ->> 'headline', p ->> 'dek', p ->> 'body_md', p -> 'fact_block',
          coalesce(p -> 'sources', '[]'::jsonb), p ->> 'generator_version', coalesce((p ->> 'state') = 'review_required', false),
          p ->> 'state', v_block, p ->> 'fact_block_hash',
          coalesce((select max(article_version) + 1 from public.boxing_articles where news_event_id = (p ->> 'news_event_id')::uuid), 1),
          v_prev.id, p ->> 'generator_version', p ->> 'validator_version', coalesce(p -> 'model_versions', '{}'::jsonb),
          p -> 'validation', coalesce(p -> 'claims', '[]'::jsonb), p ->> 'event_type',
          coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p -> 'review_reasons', '[]'::jsonb)) x), '{}'))
  returning id into v_article;

  if v_prev.id is not null and v_prev.state = 'published' then
    update public.boxing_articles set state = 'superseded' where id = v_prev.id;
  elsif v_prev.id is not null and v_prev.state in ('generated','review_required','approved') then
    update public.boxing_articles set state = 'rejected', review_note = 'superseded by a corrected news event before publication' where id = v_prev.id;
  end if;

  update public.boxing_news_events set state = case when p ->> 'state' = 'review_required' then 'needs_review' else 'enriched' end,
    state_changed_at = now()
  where id = (p ->> 'news_event_id')::uuid and state in ('new','needs_review','enriched');

  return jsonb_build_object('status', 'created', 'article_id', v_article, 'fact_block_id', v_block, 'superseded_article_id', v_prev.id);
end $$;

create or replace function public.boxing_review_article(p_article uuid, p_decision text, p_actor text, p_note text)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_state text;
begin
  if coalesce(p_actor, '') = '' then raise exception 'article_review_requires_reviewer' using errcode = 'BX092'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'invalid_review_decision: %', p_decision using errcode = '22023'; end if;
  update public.boxing_articles set state = p_decision, reviewed_by = p_actor, reviewed_at = now(), review_note = p_note
  where id = p_article returning state into v_state;
  if v_state is null then raise exception 'article_not_found: %', p_article using errcode = 'BX093'; end if;
  return jsonb_build_object('article_id', p_article, 'state', v_state);
end $$;

create or replace function public.boxing_publish_article(p_article uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_state text;
  v_event uuid;
begin
  update public.boxing_articles set state = 'published' where id = p_article returning state, news_event_id into v_state, v_event;
  if v_state is null then raise exception 'article_not_found: %', p_article using errcode = 'BX093'; end if;
  update public.boxing_news_events set state = 'published', state_changed_at = now() where id = v_event and state <> 'published';
  return jsonb_build_object('article_id', p_article, 'state', v_state);
end $$;

create or replace function public.boxing_set_news_event_state(p_id uuid, p_state text)
returns void language sql set search_path = '' as $$
  update public.boxing_news_events set state = p_state, state_changed_at = now() where id = p_id and state <> p_state
$$;

create or replace function public.boxing_wire(p_limit int default 50)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'slug', a.slug, 'headline', a.headline, 'dek', a.dek, 'event_type', a.event_type,
                                              'published_at', a.published_at, 'article_version', a.article_version,
                                              'fact_block_hash', a.fact_block_hash, 'sources', a.sources) order by a.published_at desc), '[]'::jsonb)
  from (select * from public.boxing_articles where state = 'published' order by published_at desc limit greatest(1, least(p_limit, 200))) a
$$;

select public.boxing_lockdown();

commit;
