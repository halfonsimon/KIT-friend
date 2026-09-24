# Testing strategy: deep modules, one route-gate seam, routes end to end

We test behaviour at the highest seam that doesn't need mocks of code we own. Deep modules (the per-user Contact module, the Contact roster, the Touch module, Digest delivery, Settings) are tested through their interfaces, with fakes only at the outer adapters: the Mailer and the Relationship memory. Pure logic (due dates, Contact helpers, contact form validation) runs in the `unit` Vitest project; anything touching Prisma runs in the `db` project against a throwaway Postgres whose database name must end in `_test`, truncated before each test.

The route gate (`proxy()`) is the one extra seam: it's called directly with constructed requests and real encoded session tokens, because end-to-end tests run over plain HTTP and would never exercise the `__Secure-` cookie name that caused a prod bug.

Route handlers are not unit tested. They call Auth.js's `auth()`, which needs a live Next request; testing them in Vitest would mean mocking `auth()` and testing the mock. Instead they are to be covered end to end over HTTP (Playwright against `next start`, a `_test` Postgres, and Mailpit catching outgoing mail), accepting slower feedback in exchange for no mocks.

CI (GitHub Actions) runs lint, type-check, unit tests, db tests and the build on every push to `develop` and every PR to `main`; `main` only accepts green, up-to-date PRs (branch protection). Coverage of unit and db tests together is reported on every PR, never enforced.

## Consequences

- Until the end-to-end layer exists (planned), route handlers' own checks (401s, `CRON_SECRET`, 409 on duplicate registration) are untested.
- Google OAuth can't be automated and stays untested; the `auth.ts` callbacks are covered only indirectly, by logged-in end-to-end tests.
