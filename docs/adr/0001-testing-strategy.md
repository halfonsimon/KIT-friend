# Testing strategy: deep modules, one route-gate seam, routes end to end

We test behaviour at the highest seam that doesn't need mocks of code we own. Deep modules (the per-user Contact module, the Contact roster, the Touch module, Digest delivery, Settings) are tested through their interfaces, with fakes only at the outer adapters: the Mailer and the Relationship memory. Pure logic (due dates, Contact helpers, contact form validation) runs in the `unit` Vitest project; anything touching Prisma runs in the `db` project against a throwaway Postgres whose database name must end in `_test`, truncated before each test.

The route gate (`proxy()`) is the one extra seam: it's called directly with constructed requests and real encoded session tokens, because end-to-end tests run over plain HTTP and would never exercise the `__Secure-` cookie name that caused a prod bug.

Route handlers are not unit tested. They call Auth.js's `auth()`, which needs a live Next request; testing them in Vitest would mean mocking `auth()` and testing the mock. Instead they are covered end to end over HTTP: Playwright against the production build (`next start`), a `_test` Postgres built from the migrations, and Mailpit catching outgoing mail, so the real SMTP mailer runs and nothing reaches a real inbox. One journey test drives the UI (sign up, add Contacts, record a Touch, send the Digest, read it in Mailpit); the route tests use Playwright's request client for the cron run, the 401s and redirects, registration errors and ownership. Tests may arrange state directly in the database (e.g. a Contact created days ago) when the UI can't. We accept slower feedback in exchange for no mocks.

CI (GitHub Actions) runs `npm audit`, lint, type-check, unit tests, db tests, the build and the end-to-end tests on every push to `develop` and every PR to `develop` or `main`; `main` only accepts green, up-to-date PRs (branch protection). Coverage of unit and db tests together is reported on every PR, never enforced.

## Consequences

- A request without a session and without a valid `CRON_SECRET` is redirected to `/login` by the route gate before it reaches a route, so API clients see a 307, not a 401. The routes' own 401s are only reachable with a session.
- Google OAuth can't be automated and stays untested; the `auth.ts` callbacks are covered only indirectly, by logged-in end-to-end tests.
