# Boxing: rules for agents and contributors

## No new billable resource without explicit owner cost approval (owner directive 2026-10-02)

**NO NEW BILLABLE INFRASTRUCTURE WITHOUT EXPLICIT OWNER APPROVAL OF THE RESOURCE AND COST.**

Never create, provision, subscribe to, upgrade or enable anything that can raise monthly spend. Examples:

- Supabase projects, branches or compute
- Vercel paid resources
- Cloudflare paid products
- paid APIs or data providers
- media or photo licensing
- databases or servers
- GPU/AI infrastructure
- SaaS subscriptions

Planning is allowed. Creating is not. When a task seems to need a new paid resource:

1. Stop before creating it.
2. Explain why it is needed.
3. Give the exact or estimated cost, both recurring and one-time.
4. Check whether an existing PropBetEdge/PropTechUSA resource can do the job.
5. Present the options to the owner.
6. Wait for an explicit "yes, create it" that names the resource and its cost.

"go", "build it", "keep moving", "approved", "ship it", or a sprint brief, are **not** approval to create billed
infrastructure. Using compute or API usage the owner already pays for is fine.

## Boxing database (final topology, owner 2026-10-02)

- The one Boxing database is `propbetedge-boxing-production`, ref `lobcdprmoiosbjanheeo`.
- `propbetedge-boxing-staging` (`wpaxofilvbsjyrxrwjhg`) was deleted on purpose. Never restore it or target it.
- Never create another Boxing project or branch.
- Never move Boxing into `PROPBETEDGE` (`tkmlnhmylqnttmnsnief`) or `LHBUSA's Project` (`rlfyavnhbngwbldebrid`).

## Workflow

- `main` only: no feature branches, PRs, forks or GitHub Actions.
- Loop: `git pull --ff-only`, test, commit, push.
- `web/DEPLOY_HOLD` keeps Vercel from building until the owner lifts it.
- Sources: no paid data sources (BoxRec and CompuBox are blocked). Never bypass CAPTCHA, auth or access controls. Never guess unlinked URLs.
- Identity: never resolve fighters by name alone. Ambiguous identities stay held. An agent never signs as the human reviewer.
