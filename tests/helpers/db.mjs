// Disposable-database harness for schema tests.
//
// Every test file gets its own freshly created database on a LOCAL PostgreSQL
// server, applies supabase/tests/supabase_roles.sql plus every migration in
// order, and drops the database afterwards. The harness refuses to touch
// anything that is not a loopback host — it must never be pointed at a hosted
// Supabase project.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
const ROLES_SQL = join(ROOT, 'supabase', 'tests', 'supabase_roles.sql');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function adminUrl() {
  const raw = process.env.BOXING_TEST_DATABASE_URL || 'postgres://postgres@localhost:55432/postgres';
  const url = new URL(raw);
  if (!LOCAL_HOSTS.has(url.hostname) && process.env.BOXING_TEST_ALLOW_CI_HOST !== url.hostname) {
    throw new Error(`refusing non-local test database host "${url.hostname}"`);
  }
  if (/supabase\.(co|com|in)$/i.test(url.hostname)) {
    throw new Error('refusing hosted Supabase host for destructive schema tests');
  }
  return url;
}

// BOXING_TEST_MIGRATIONS_UPTO=<14-digit version> caps the chain. Used to prove
// the suite fails against the pre-audit schema (a test that passes on the
// broken schema proves nothing).
export function migrationFiles() {
  const upto = process.env.BOXING_TEST_MIGRATIONS_UPTO;
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{14}_[a-z0-9_]+\.sql$/.test(f))
    .filter((f) => !upto || f.slice(0, 14) <= upto)
    .sort()
    .map((f) => join(MIGRATIONS_DIR, f));
}

export async function applyMigrations(client, files = migrationFiles()) {
  for (const file of files) {
    try {
      await client.query(readFileSync(file, 'utf8'));
    } catch (err) {
      await client.query('rollback').catch(() => {});
      err.message =`${file.split(/[\\/]/).pop()}: ${err.message}`;
      throw err;
    }
  }
}

function dbName(label) {
  const safe = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
  return `boxing_test_${safe}_${process.pid}_${Date.now().toString(36)}`;
}

// Creates a fresh database with the full migration chain applied.
// Returns { client, name, url, close }.
export async function freshDatabase(label, { migrate = true } = {}) {
  const admin = adminUrl();
  const name = dbName(label);
  const adminClient = new pg.Client({ connectionString: admin.toString() });
  await adminClient.connect();
  await adminClient.query(`create database ${name}`);
  await adminClient.end();

  const url = new URL(admin.toString());
  url.pathname = `/${name}`;
  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  client.on('notice', () => {});
  await client.query(readFileSync(ROLES_SQL, 'utf8'));
  if (migrate) await applyMigrations(client);

  async function close() {
    await client.end().catch(() => {});
    const c = new pg.Client({ connectionString: admin.toString() });
    await c.connect();
    await c.query(`drop database if exists ${name} with (force)`);
    await c.end();
  }
  return { client, name, url, close };
}

// Assert that `fn` rejects with a Postgres error. `code` is a SQLSTATE
// (e.g. '23505', 'BX001'); `match` is an optional RegExp on the message.
export async function expectPgError(fn, { code, match } = {}) {
  let err;
  try {
    await fn();
  } catch (e) {
    err = e;
  }
  if (!err) throw new Error(`expected a database error${code ? ` ${code}` : ''}, but the statement succeeded`);
  if (code && err.code !== code) {
    throw new Error(`expected SQLSTATE ${code}, got ${err.code}: ${err.message}`);
  }
  if (match && !match.test(err.message)) {
    throw new Error(`error message did not match ${match}: ${err.message}`);
  }
  return err;
}

// Runs fn as `role` inside a transaction that is always rolled back.
export async function asRole(client, role, fn) {
  await client.query('begin');
  try {
    await client.query(`set local role ${role}`);
    return await fn();
  } finally {
    await client.query('rollback');
  }
}

// Runs fn inside a transaction that is always rolled back.
export async function rolledBack(client, fn) {
  await client.query('begin');
  try {
    return await fn();
  } finally {
    await client.query('rollback');
  }
}

// Stable description of the schema: tables, columns, constraints, indexes,
// triggers, policies, views and seeded reference rows. Used to prove a rerun of
// the migration chain changes nothing.
export async function schemaFingerprint(client) {
  const q = async (sql) => (await client.query(sql)).rows;
  return {
    columns: await q(`select table_name, column_name, data_type, is_nullable, column_default
                      from information_schema.columns where table_schema = 'public'
                      order by 1, 2`),
    constraints: await q(`select conrelid::regclass::text as rel, conname, pg_get_constraintdef(oid) as def
                          from pg_constraint where connamespace = 'public'::regnamespace order by 1, 2`),
    indexes: await q(`select tablename, indexname, indexdef from pg_indexes where schemaname = 'public' order by 1, 2`),
    triggers: await q(`select tgrelid::regclass::text as rel, tgname, pg_get_triggerdef(oid) as def
                       from pg_trigger where not tgisinternal order by 1, 2`),
    views: await q(`select viewname, definition from pg_views where schemaname = 'public' order by 1`),
    rls: await q(`select relname, relrowsecurity from pg_class
                  where relnamespace = 'public'::regnamespace and relkind = 'r' order by 1`),
    functions: await q(`select p.oid::regprocedure::text as fn, md5(pg_get_functiondef(p.oid)) as def
                        from pg_proc p where p.pronamespace = 'public'::regnamespace order by 1`),
    sources: await q(`select source_key, access_mode, rights_state, enabled from public.boxing_sources order by 1`),
    weightClasses: await q(`select class_key, max_weight_lb::text from public.boxing_weight_classes order by 1`),
  };
}
