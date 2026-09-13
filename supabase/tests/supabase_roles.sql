-- Local stand-in for the roles and default grants a hosted Supabase project
-- has. Applied by the test harness BEFORE the migrations so the lockdown
-- tests exercise the same danger as production: Supabase grants every new
-- table in `public` to anon/authenticated by default.
--
-- Roles are cluster-global while each test file uses its own database, so
-- several processes can race to create them. Each CREATE ROLE tolerates
-- losing that race.

do $$
declare
  r record;
begin
  for r in select * from (values ('anon', 'nologin noinherit'),
                                 ('authenticated', 'nologin noinherit'),
                                 ('service_role', 'nologin noinherit bypassrls')) as t(name, opts)
  loop
    if not exists (select 1 from pg_roles where rolname = r.name) then
      begin
        execute format('create role %I %s', r.name, r.opts);
      exception when duplicate_object or unique_violation then
        null;
      end;
    end if;
  end loop;
end $$;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
