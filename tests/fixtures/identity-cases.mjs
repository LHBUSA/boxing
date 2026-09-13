// Adversarial identity fixtures. ALL PEOPLE HERE ARE FICTIONAL: names, dates
// of birth and attributes were invented for tests and describe no real boxer.
//
// `seeds` become canonical boxers (namespace fixture_registry). `probes` are
// later observations with the outcome the resolver must produce.

export const REGISTRY = 'fixture_registry';
export const FEED = 'fixture_feed';
export const ODDS = 'fixture_odds';
export const FEED_B = 'fixture_feed_b';

export const seeds = [
  { key: 'luis_a', external_id: 'lo-1', display_name: 'Luis Ortega', dob: '1994-02-03', nationality: ['MX'], sex: 'male', division_keys: ['lightweight'] },
  { key: 'luis_b', external_id: 'lo-2', display_name: 'Luis Ortega', dob: '1988-11-20', nationality: ['US'], sex: 'male', division_keys: ['super_welterweight'] },
  { key: 'mendoza_sr', external_id: 'rm-sr', display_name: 'Rafael Mendoza Sr.', dob: '1965-05-09', nationality: ['MX'], sex: 'male', division_keys: ['featherweight'] },
  { key: 'mendoza_jr', external_id: 'rm-jr', display_name: 'Rafael Mendoza Jr.', dob: '1992-08-17', nationality: ['MX'], sex: 'male', division_keys: ['super_featherweight'] },
  { key: 'okafor', external_id: 'eo-1', display_name: 'Emmanuel Okafor', names: [{ text: 'The Hammer', kind: 'nickname' }], dob: '1991-01-25', nationality: ['NG'], sex: 'male', division_keys: ['heavyweight'] },
  { key: 'nunez', external_id: 'jrn-1', display_name: 'José Ramón Núñez', dob: '1997-10-02', nationality: ['DO'], sex: 'male', division_keys: ['bantamweight'] },
  { key: 'gutierrez', external_id: 'cg-1', display_name: 'Carlos Andrés Gutiérrez Salazar', dob: '1995-06-11', nationality: ['CO'], sex: 'male', division_keys: ['welterweight'] },
  { key: 'hvozdenko', external_id: 'oh-1', display_name: 'Oleksandr Hvozdenko', names: [{ text: 'Олександр Гвозденко', kind: 'name' }], dob: '1993-09-30', nationality: ['UA'], sex: 'male', division_keys: ['light_heavyweight'] },
  { key: 'kowalczyk', external_id: 'mk-1', display_name: 'Maria Kowalczyk', dob: '1996-12-01', nationality: ['PL'], sex: 'female', division_keys: ['super_bantamweight'] },
  { key: 'mensah', external_id: 'km-1', display_name: 'Kwame Mensah', dob: '1996-07-14', nationality: ['GH'], sex: 'male', division_keys: ['cruiserweight'] },
  { key: 'volkov_d', external_id: 'dv-1', display_name: 'Dmitri Volkov', dob: '1990-03-15', nationality: ['RU'], sex: 'male', division_keys: ['middleweight'] },
  { key: 'volkov_dan', external_id: 'dnv-1', display_name: 'Daniel Volkov', dob: '1998-04-22', nationality: ['US'], sex: 'male', division_keys: ['super_middleweight'] },
  { key: 'wieczorek', external_id: 'tw-1', display_name: 'Tomasz Wieczorek', dob: '1990-04-12', nationality: ['PL'], sex: 'male', division_keys: ['middleweight'] },
  { key: 'adeyemi', external_id: 'sa-1', display_name: 'Samuel Adeyemi', dob: '1993-03-03', nationality: ['NG'], sex: 'male', division_keys: ['super_lightweight'] },
  { key: 'lindqvist', external_id: 'pl-1', display_name: 'Peter Lindqvist', dob: '1989-02-02', nationality: ['SE'], sex: 'male', division_keys: ['heavyweight'], extra_identities: [{ namespace: ODDS, external_id: 'odds-9' }] },
  { key: 'vance', external_id: 'dvn-1', display_name: 'Dorian Vance', dob: '1993-08-08', nationality: ['US'], sex: 'male', division_keys: ['welterweight'] },
  { key: 'berg', external_id: 'jb-1', display_name: 'Jonas Berg', dob: '1994-10-10', nationality: ['NO'], sex: 'male', division_keys: ['heavyweight'] },
];

// expect: { outcome, fighter?, reason?, verification? }
export const probes = [
  { id: 'same_name_dob_decides', ns: FEED, obs: { external_id: 'f-1', display_name: 'Luis Ortega', dob: '1994-02-03' },
    expect: { outcome: 'matched', fighter: 'luis_a', verification: 'verified' } },
  { id: 'same_name_no_evidence', ns: FEED, obs: { external_id: 'f-2', display_name: 'Luis Ortega' },
    expect: { outcome: 'review', reason: 'ambiguous' } },
  { id: 'same_name_third_person', ns: FEED, obs: { external_id: 'f-3', display_name: 'Luis Ortega', dob: '2001-06-30', nationality: ['PE'] },
    expect: { outcome: 'created', reason: 'distinct_from_candidates' } },
  { id: 'jr_with_dob', ns: FEED, obs: { external_id: 'f-4', display_name: 'Rafael Mendoza Jr', dob: '1992-08-17' },
    expect: { outcome: 'matched', fighter: 'mendoza_jr', verification: 'verified' } },
  { id: 'jr_sr_suffix_missing', ns: FEED, obs: { external_id: 'f-5', display_name: 'Rafael Mendoza' },
    expect: { outcome: 'review', reason: 'ambiguous' } },
  { id: 'sr_explicit_without_dob', ns: FEED, obs: { external_id: 'f-5b', display_name: 'Rafael Mendoza Sr' },
    expect: { outcome: 'review', reason: 'insufficient_evidence' } },
  { id: 'nickname_in_quotes', ns: FEED, obs: { external_id: 'f-6', display_name: "Emmanuel 'Hammer' Okafor", dob: '1991-01-25' },
    expect: { outcome: 'matched', fighter: 'okafor', verification: 'verified' } },
  { id: 'nickname_only_with_evidence', ns: FEED_B, obs: { external_id: 'f-7', display_name: 'The Hammer', dob: '1991-01-25', nationality: ['NG'], division_keys: ['heavyweight'] },
    expect: { outcome: 'matched', fighter: 'okafor', verification: 'probable' } },
  { id: 'nickname_only_no_evidence', ns: FEED_B, obs: { external_id: 'f-7b', display_name: 'The Hammer', nationality: ['NG'] },
    expect: { outcome: 'review', reason: 'weak_name_only' } },
  { id: 'accents_vs_ascii', ns: FEED, obs: { external_id: 'f-8', display_name: 'Jose Ramon Nunez', dob: '1997-10-02' },
    expect: { outcome: 'matched', fighter: 'nunez', verification: 'verified' } },
  { id: 'spanish_two_surnames_short_form', ns: FEED, obs: { external_id: 'f-9', display_name: 'Carlos Gutierrez', dob: '1995-06-11' },
    expect: { outcome: 'matched', fighter: 'gutierrez', verification: 'probable' } },
  { id: 'comma_reordered', ns: FEED_B, obs: { external_id: 'f-9b', display_name: 'GUTIÉRREZ SALAZAR, Carlos Andrés', dob: '1995-06-11' },
    expect: { outcome: 'matched', fighter: 'gutierrez' } },
  // Latin-vs-Latin transliteration of the GIVEN name: DOB alone cannot decide
  // (see twin_given_name_variant). Held for review; the Cyrillic original below
  // matches exactly through the stored alias.
  { id: 'russian_transliteration_variant', ns: FEED, obs: { external_id: 'f-10', display_name: 'Aleksandr Gvozdenko', dob: '1993-09-30' },
    expect: { outcome: 'review', reason: 'given_name_variant' } },
  // same given name, surname transliterated Hv/Gv: exact through the stored
  // Cyrillic alias (Олександр Гвозденко -> oleksandr gvozdenko)
  { id: 'surname_transliteration_via_script_alias', ns: FEED, obs: { external_id: 'f-10b', display_name: 'Oleksandr Gvozdenko', dob: '1993-09-30' },
    expect: { outcome: 'matched', fighter: 'hvozdenko', verification: 'verified' } },
  { id: 'twin_given_name_variant', ns: FEED, obs: { external_id: 'f-20', display_name: 'Darian Vance', dob: '1993-08-08', nationality: ['US'], division_keys: ['super_welterweight'] },
    expect: { outcome: 'review', reason: 'given_name_variant' } },
  { id: 'cyrillic_script', ns: FEED_B, obs: { external_id: 'f-11', display_name: 'Олександр Гвозденко', dob: '1993-09-30' },
    expect: { outcome: 'matched', fighter: 'hvozdenko', verification: 'verified' } },
  { id: 'display_name_change_same_external_id', ns: REGISTRY, obs: { external_id: 'mk-1', display_name: 'Maria Nowak', dob: '1996-12-01', sex: 'female' },
    expect: { outcome: 'matched', fighter: 'kowalczyk', verification: 'verified' } },
  // In the database run this probe comes AFTER the registry re-observed mk-1
  // as "Maria Nowak", which taught the boxer that alias. The resolver then has
  // an exact name + exact DOB, so matching is correct there (dbExpect).
  { id: 'display_name_change_no_id_link', ns: FEED, obs: { external_id: 'f-12', display_name: 'Maria Nowak', dob: '1996-12-01', sex: 'female', nationality: ['PL'] },
    expect: { outcome: 'review', reason: 'possible_name_change' },
    dbExpect: { outcome: 'matched', fighter: 'kowalczyk' } },
  { id: 'dob_off_by_one_day', ns: FEED, obs: { external_id: 'f-13', display_name: 'Kwame Mensah', dob: '1996-07-15' },
    expect: { outcome: 'review', reason: 'dob_mismatch' } },
  { id: 'odds_abbreviation_unscoped', ns: ODDS, allowCreate: false, obs: { external_id: 'o-1', display_name: 'D. Volkov' },
    expect: { outcome: 'review', reason: 'weak_name_only' } },
  { id: 'odds_abbreviation_bout_scoped', ns: ODDS, allowCreate: false, scope: ['volkov_d', 'berg'], obs: { external_id: 'o-2', display_name: 'D. Volkov' },
    expect: { outcome: 'matched', fighter: 'volkov_d', verification: 'probable' } },
  { id: 'odds_surname_only_scoped', ns: ODDS, allowCreate: false, scope: ['volkov_d', 'berg'], obs: { external_id: 'o-3', display_name: 'Berg' },
    expect: { outcome: 'matched', fighter: 'berg' } },
  { id: 'odds_scope_excludes_outsiders', ns: ODDS, allowCreate: false, scope: ['volkov_d', 'berg'], obs: { external_id: 'o-4', display_name: 'Luis Ortega' },
    expect: { outcome: 'unresolved', reason: 'no_candidates' } },
  { id: 'source_typo_with_evidence', ns: FEED, obs: { external_id: 'f-14', display_name: 'Tomasz Wieczorkek', dob: '1990-04-12', nationality: ['PL'], division_keys: ['middleweight'] },
    expect: { outcome: 'matched', fighter: 'wieczorek', verification: 'probable' } },
  { id: 'source_typo_without_evidence', ns: FEED, obs: { external_id: 'f-15', display_name: 'Tomas Wieczorek' },
    expect: { outcome: 'review', reason: 'given_name_variant' } },
  { id: 'conflicting_nationality', ns: FEED, obs: { external_id: 'f-16', display_name: 'Samuel Adeyemi', dob: '1993-03-03', nationality: ['GB'] },
    expect: { outcome: 'review', reason: 'nationality_conflict' } },
  { id: 'external_id_mapped_to_another_boxer', ns: ODDS, allowCreate: false, obs: { external_id: 'odds-9', display_name: 'Jonas Berg', dob: '1994-10-10' },
    expect: { outcome: 'review', reason: 'mapped_identity_conflict' } },
  { id: 'sex_conflict_with_exact_name_and_dob', ns: FEED, obs: { external_id: 'f-17', display_name: 'Maria Kowalczyk', dob: '1996-12-01', sex: 'male' },
    expect: { outcome: 'review', reason: 'contradictory_evidence' } },
  // The same registry now shows a second id for an exact name + DOB: a source-side
  // duplicate or a different person. Either way a human decides; never create.
  { id: 'same_namespace_different_id', ns: REGISTRY, obs: { external_id: 'lo-9', display_name: 'Luis Ortega', dob: '1994-02-03', nationality: ['MX'] },
    expect: { outcome: 'review', reason: 'namespace_id_conflict' } },
  // a second FEED record for a boxer FEED already mapped under another id
  { id: 'same_feed_second_id_never_creates', ns: FEED, obs: { external_id: 'f-19', display_name: 'Jose Ramon Nunez' },
    expect: { outcome: 'review', reason: 'insufficient_evidence' },
    dbExpect: { outcome: 'review', reason: 'namespace_id_conflict' } },
  { id: 'invalid_observation', ns: FEED, obs: { external_id: 'f-18', display_name: '  ---  ' },
    expect: { outcome: 'rejected', reason: 'invalid_observation' } },
];
