// Write-target guard for Boxing collection Workers.
//
// A collection Worker may only write to a Supabase project on the boxing
// allow-list, and only when its declared environment and project ref agree
// with the URL it was given. Production PropBetEdge projects of other sports
// are refused by name. The allow-list is exactly the one Boxing database (owner topology 2026-10-02); the deleted
// staging project is a dead target. Changing the list is a reviewed code change.

import { postgrestStore } from './postgrest.mjs';

export const BOXING_SUPABASE_TARGETS = Object.freeze({
  lobcdprmoiosbjanheeo: Object.freeze({ projectName: 'propbetedge-boxing-production', environment: 'production' }),
});

export const FORBIDDEN_SUPABASE_REFS = Object.freeze({
  tkmlnhmylqnttmnsnief: 'PropBetEdge NFL + UFC production',
  rlfyavnhbngwbldebrid: 'PropBetEdge MLB + PropTech production',
  wpaxofilvbsjyrxrwjhg: 'deleted Boxing staging project (2026-10-02, never restore)',
});

export class WriteTargetError extends Error {
  constructor(message) { super(message); this.name = 'WriteTargetError'; this.code = 'write_target_refused'; }
}

export function assertBoxingWriteTarget(env = {}) {
  let url;
  try { url = new URL(String(env.SUPABASE_URL ?? '')); } catch { throw new WriteTargetError('SUPABASE_URL missing or invalid'); }
  const m = url.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
  if (url.protocol !== 'https:' || !m || (url.pathname !== '/' && url.pathname !== '')) {
    throw new WriteTargetError('SUPABASE_URL must be https://<ref>.supabase.co');
  }
  const ref = m[1];
  if (FORBIDDEN_SUPABASE_REFS[ref]) throw new WriteTargetError(`refusing ${FORBIDDEN_SUPABASE_REFS[ref]} (${ref})`);
  const target = BOXING_SUPABASE_TARGETS[ref];
  if (!target) throw new WriteTargetError(`project ${ref} is not on the boxing write allow-list`);
  if (env.BOXING_SUPABASE_REF !== ref) throw new WriteTargetError('BOXING_SUPABASE_REF does not match SUPABASE_URL');
  if (env.BOXING_ENVIRONMENT !== target.environment) throw new WriteTargetError(`BOXING_ENVIRONMENT must be "${target.environment}" for ${ref}`);
  return { ref, projectName: target.projectName, environment: target.environment };
}

// PostgREST store that carries a verified write target (checked by runCapture).
export function guardedPostgrestStore(env, { fetchImpl } = {}) {
  const target = assertBoxingWriteTarget(env);
  const store = postgrestStore({ url: env.SUPABASE_URL, serviceKey: env.SUPABASE_SERVICE_ROLE_KEY, ...(fetchImpl ? { fetchImpl } : {}) });
  return Object.assign(store, { writeTarget: Object.freeze({ verified: true, kind: 'supabase', ...target }) });
}
