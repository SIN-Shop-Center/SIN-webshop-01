# Test Environments

## Isolation Contract

Automated tests never infer production credentials. The default database-backed
workflow uses the local Supabase stack defined in
`platform/infra/supabase/config.toml`, built exclusively from the canonical
versioned migrations.

```bash
pnpm db:local:start
pnpm db:types:check
pnpm test:integration
pnpm test:e2e:chromium
pnpm test:e2e:mobile
pnpm db:local:stop
```

The runners capture local credentials from `supabase status` and pass them only
to child processes. They never print or persist those values. E2E fixtures use
reserved UUIDs, `__e2e_*` identifiers and `tests.invalid` email addresses. Seed
and cleanup run transactionally before and after every Playwright invocation.

## Remote Test Project

For an isolated remote project, copy `.env.test.example` to the gitignored
`.env.test.local`, fill only test credentials, and explicitly set the relevant
destructive opt-in. Production projects and customer records are forbidden.
The scripts reject remote database seeding unless
`ALLOW_DESTRUCTIVE_E2E_TESTS=true` is present.

## Browser Modes

- `pnpm test:e2e:dev` starts Next.js development mode on fixed port `4173`.
- `E2E_USE_PRODUCTION=true pnpm test:e2e:chromium` builds and starts production mode.
- `pnpm test:e2e:mobile` runs the deterministic Chromium phone viewport project.
- `E2E_BASE_URL` targets an already running environment; set
  `E2E_SKIP_SEED=true` only for explicitly read-only smoke tests.

Playwright waits for `/api/health`, keeps one server for the complete run and
pipes stdout/stderr into the report. Screenshots, video and traces are retained
only for failures and remain gitignored.

## External Providers

Stripe-hosted Checkout requires real testmode keys and
`E2E_STRIPE_TEST_MODE=true`. Signature, invalid-signature and idempotency
contracts are tested independently and must not depend on the hosted Stripe UI.
CJ, TikTok, Resend and Cloudflare live/sandbox acceptance remains an external
gate documented in `issues.md`; local tests use mocks, dry runs and contract
fixtures only.
