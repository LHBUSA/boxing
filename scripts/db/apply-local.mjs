#!/usr/bin/env node
// Applies the migration chain to a LOCAL database for manual inspection.
//   node scripts/db/apply-local.mjs <database_name>
// Uses BOXING_TEST_DATABASE_URL's server. Refuses non-local hosts (same guard as
// the test harness). There is intentionally no remote/production apply script
// in this repo: remote applies require the owner's explicit approval.

import pg from 'pg';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminUrl, applyMigrations, migrationFiles } from '../../tests/helpers/db.mjs';

const name = process.argv[2];
if (!name || !/^[a-z][a-z0-9_]{2,40}$/.test(name)) {
  console.error('usage: node scripts/db/apply-local.mjs <database_name>');
  process.exit(2);
}

const admin = adminUrl();
const adminClient = new pg.Client({ connectionString: admin.toString() });
await adminClient.connect();
const exists = await adminClient.query('select 1 from pg_database where datname = $1', [name]);
if (!exists.rowCount) await adminClient.query(`create database ${name}`);
await adminClient.end();

const url = new URL(admin.toString());
url.pathname = `/${name}`;
const client = new pg.Client({ connectionString: url.toString() });
await client.connect();
client.on('notice', () => {});
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
await client.query(readFileSync(join(root, 'supabase', 'tests', 'supabase_roles.sql'), 'utf8'));
const files = migrationFiles();
await applyMigrations(client, files);
await client.end();
console.log(`applied ${files.length} migrations to local database "${name}" on ${admin.hostname}:${admin.port}`);
