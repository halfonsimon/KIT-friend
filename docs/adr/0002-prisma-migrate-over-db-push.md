# Schema changes ship as Prisma migrations, applied at deploy time

Schema changes are committed as Prisma migrations (`prisma migrate dev --name <change>`) and reviewed in the PR like any other code, instead of being pushed to a shared database with `prisma db push`. `db push` keeps no history and can drop a column (and its data) without anything in review showing it.

Each Vercel deploy runs `prisma migrate deploy` before `next build` (the `vercel-build` script), against that environment's own database: Preview migrates Neon develop, Production migrates Neon production. A failed migration fails the deploy, so the previous deployment keeps serving. Migrations run over Neon's direct (unpooled) connection, `DIRECT_URL`, because the pooled `DATABASE_URL` can hang during migrations; the app itself keeps using the pooled URL.

The `db` tests build their database from the committed migrations and then fail if `schema.prisma` has changes no migration covers, so a missing migration is caught by `npm test` locally and in CI before it reaches a deploy.

## Considered options

- **Run `migrate deploy` from GitHub Actions on merge to `main`.** Rejected: it needs the production database URL as a GitHub secret, and races Vercel's own deploy of the same commit.

## Consequences

- `0_init` is the baseline and is already recorded as applied on both Neon databases; no `migrate resolve` was needed.
- Prisma's CLI reads `app/.env` by default, so it must point at Neon develop, never production. Run production commands with an explicit `DATABASE_URL`/`DIRECT_URL` for that one command.
- Prisma refuses `migrate reset` when run by an AI agent; the test setup clears its `_test` database with SQL and uses the non-destructive `migrate deploy` instead.
