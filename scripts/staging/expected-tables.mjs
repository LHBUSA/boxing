#!/usr/bin/env node
// Prints (JSON) the boxing_* tables produced by applying the repo migrations
// to a fresh LOCAL database. The staging verifier compares staging to this.
import { freshDatabase } from '../../tests/helpers/db.mjs';

const db = await freshDatabase('staging_expected');
try {
  const { rows } = await db.client.query(
    "select tablename from pg_tables where schemaname = 'public' and tablename like 'boxing\\_%' order by 1");
  console.log(JSON.stringify(rows.map((r) => r.tablename)));
} finally {
  await db.close();
}
