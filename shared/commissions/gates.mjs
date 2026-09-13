// Source approval gate shared by collection runs.
export function sourceApprovalFor(sourceKey, src) {
  if (!src) return `${sourceKey} is not registered`;
  const problems = [];
  if (!src.enabled) problems.push('enabled=false');
  if (src.access_mode !== 'approved_ingest') problems.push(`access_mode=${src.access_mode}`);
  if (!['approved', 'internal'].includes(src.rights_state)) problems.push(`rights_state=${src.rights_state}`);
  if (!src.persistence_allowed) problems.push('persistence_allowed=false');
  if (!src.latest_rights_review_id) problems.push('no rights review recorded');
  return problems.length ? `${sourceKey} not approved (${problems.join(', ')})` : null;
}
