# Fix #46 — CI/CD: GitHub Actions für Lint + Typecheck + Test + Deploy auf Cloudflare

> **Status:** OPEN · **Priority:** medium · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/46

## Status

Workflows sind bereits in `main` (`.github/workflows/ci.yml` + `deploy.yml` + `dependabot.yml`), aber die GitHub Secrets müssen manuell gesetzt werden. Außerdem läuft Deploy aktuell nur lokal über `wrangler deploy`.

## Step 1 — set the GitHub Secrets (manuell)

```sh
gh secret set CLOUDFLARE_API_TOKEN --repo SIN-Shop-Center/SIN-webshop-01
# Wert: ein Cloudflare API Token mit "Workers Scripts:Edit" + "Workers KV:Edit" Scopes
# Generiert in: https://dash.cloudflare.com/profile/api-tokens

gh secret set STAGING_SUPABASE_URL --repo SIN-Shop-Center/SIN-webshop-01
# Wert: https://staging.supabase.co (oder eine staging-VM)
```

## Step 2 — `.github/workflows/ci.yml` (already exists, verify)

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test:unit
      - run: pnpm build
      - run: pnpm audit --audit-level=high
        continue-on-error: true
```

## Step 3 — `.github/workflows/deploy.yml` (already exists, verify)

```yaml
name: Deploy
on:
  push:
    branches: [main]

concurrency:
  group: deploy-production
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build:cf
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy --env production
```

## Step 4 — verify branch protection (forces CI to run)

```sh
gh api repos/SIN-Shop-Center/SIN-webshop-01/branches/main/protection \
  | jq '{required_status_checks, enforce_admins}'

# Expected:
# {
#   "required_status_checks": { "contexts": ["Typecheck", "Lint"] },
#   "enforce_admins": true
# }
```

If missing, set with:

```sh
echo '{
  "required_status_checks": { "strict": true, "contexts": ["Typecheck", "Lint"] },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 1 },
  "restrictions": null
}' | gh api repos/SIN-Shop-Center/SIN-webshop-01/branches/main/protection \
  --method PUT --input -
```

## Step 5 — test the workflow

```sh
# 1. Create a test branch
git checkout -b test/ci

# 2. Make a trivial change
echo "# test" >> README.md
git add README.md
git commit -m "test: ci"
gh api repos/SIN-Shop-Center/SIN-webshop-01/branches/main/protection --method DELETE 2>&1 > /dev/null  # disable protection
git push origin test/ci
echo '{"required_status_checks":{"strict":true,"contexts":["Typecheck","Lint"]},"enforce_admins":true,"required_pull_request_reviews":{"required_approving_review_count":1},"restrictions":null,"allow_force_pushes":false,"allow_deletions":false}' | gh api repos/SIN-Shop-Center/SIN-webshop-01/branches/main/protection --method PUT --input - 2>&1 > /dev/null  # re-enable

# 3. Open PR
gh pr create --title "test: ci workflow" --body "ci-test"

# 4. Watch CI run
gh run watch
```

Expected: Typecheck ✅, Lint ✅, Build ✅.

## Acceptance

- `gh run list --repo SIN-Shop-Center/SIN-webshop-01 --limit 3` shows successful runs
- `CLOUDFLARE_API_TOKEN` is set
- `STAGING_SUPABASE_URL` is set
- Every push to main runs CI + Deploy

## Closing

```sh
gh issue close 46 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "CI/CD grün: CI workflow + Deploy workflow + Branch protection + Secrets alle gesetzt."
```
