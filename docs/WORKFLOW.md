# Development Workflow

How every change goes from idea to production.

## Branches

| Branch | Purpose | Deploys to | Database (Neon) |
|---|---|---|---|
| `main` | Production — what users see | https://kit-friend.vercel.app | `production` |
| `develop` | Integration — tested features waiting for release | https://kit-friend-git-develop-simons-projects-769e2d33.vercel.app | `development` |
| `feat/*`, `fix/*`, `chore/*` | One branch per task, short-lived | `kit-friend-git-<branch>-simons-projects-769e2d33.vercel.app` | `development` |

Never commit directly to `main` or `develop` — always go through a pull request.

## Building a feature

```bash
git checkout develop && git pull
git checkout -b feat/my-feature        # or fix/..., chore/...
# code, then test locally at http://localhost:3000 (npm run dev, from app/)
cd app && npm run lint && npm run test && npm run build
git push -u origin feat/my-feature
```

1. The push makes Vercel build a **preview** of the branch. The URL appears on the PR and in Vercel → Deployments.
2. Open a PR `feat/my-feature` → `develop`. Check the preview URL.
3. Merge the PR. The `develop` preview URL updates automatically in about a minute.

## Releasing to production

1. Test the `develop` preview URL end to end: login (Google and email/password), contacts, digest.
2. Open a PR `develop` → `main`: https://github.com/halfonsimon/KIT-friend/compare/main...develop
3. Merge it. https://kit-friend.vercel.app updates automatically.
4. If something breaks, use Vercel → Overview → **Instant Rollback**, then fix it on a new branch.

## Seeing what's in `develop` but not yet in production

- **Commits and diff:** https://github.com/halfonsimon/KIT-friend/compare/main...develop
- **Running app:** the `develop` preview URL above
- **Terminal:** `git fetch && git log --oneline origin/main..origin/develop`

## Environment variables (Vercel)

- **Production** values are used by `main`. **Preview** values are used by all other branches.
- Previews use the Neon `development` database, so testing never touches real data.
- After changing a variable, redeploy: Vercel → Deployments → `⋯` → **Redeploy** on the latest deployment of that branch. Code pushes redeploy on their own.
- Local secrets go in `app/.env.local`. Never commit them.

## Database schema changes

1. Change `prisma/schema.prisma` on your feature branch.
2. Apply it to the Neon `development` branch first and test on the preview.
3. Apply it to `production` only when you release (merge to `main`).
4. To refresh dev data from prod: Neon → Branches → `development` → **Reset from parent**.

## Commit messages

Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`. For example: `feat: add birthday reminders`.
