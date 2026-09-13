#!/usr/bin/env node
// Fails if any tracked or staged file looks like it contains a credential.
// Prints file:line and the pattern name only — never the matched value.

import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';

const PATTERNS = [
  ['jwt (Supabase anon/service key shape)', /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ['supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{16,}/],
  ['stripe live key', /\b(sk|rk)_live_[A-Za-z0-9]{16,}/],
  ['github token', /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ['aws access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['private key block', /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['cloudflare api token assignment', /CLOUDFLARE_API_TOKEN\s*[=:]\s*["']?[A-Za-z0-9_-]{30,}/],
  ['odds api key assignment', /ODDS_API_KEY\s*[=:]\s*["']?[0-9a-f]{32}/i],
  ['apiKey query parameter with value', /[?&]apiKey=[0-9a-f]{32}/i],
  ['postgres url with password', /postgres(ql)?:\/\/[^:\s/]+:[^@\s]{6,}@(?!localhost|127\.0\.0\.1)/],
];

const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\n').filter(Boolean)
  .filter((f) => !f.startsWith('node_modules/') && f !== 'package-lock.json');

let findings = 0;
for (const file of files) {
  let text;
  try {
    if (statSync(file).size > 2_000_000) continue;
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    for (const [name, re] of PATTERNS) {
      if (re.test(line)) {
        findings++;
        console.error(`${file}:${i + 1}: possible ${name}`);
      }
    }
  });
}

if (findings) {
  console.error(`check-secrets: ${findings} possible secret(s). Nothing was printed; inspect the lines above.`);
  process.exit(1);
}
console.log(`check-secrets: ${files.length} files scanned, no secret patterns found`);
