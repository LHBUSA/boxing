// Vercel "Ignored Build Step" (vercel.json ignoreCommand). Exit 0 = skip this build, exit 1 = build.
// While web/DEPLOY_HOLD exists, pushes to main reach GitHub but do NOT replace production. The release is a reviewed
// commit that deletes DEPLOY_HOLD after every acceptance gate passes.
import { existsSync, readFileSync } from 'node:fs';
if (existsSync(new URL('../DEPLOY_HOLD', import.meta.url))) {
  console.log(`DEPLOY_HOLD present: skipping production build. ${readFileSync(new URL('../DEPLOY_HOLD', import.meta.url), 'utf8').split('\n')[0]}`);
  process.exit(0);
}
process.exit(1);
