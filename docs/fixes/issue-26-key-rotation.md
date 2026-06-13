# Fix #26 — SECURITY: Geleakte Keys rotieren + Git-History bereinigen

> **Status:** OPEN · **Priority:** CRITICAL (P0) · **Repo:** `SIN-Shop-Center/SIN-webshop-01`
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/26

## Context

In the current `main` branch, we already rotated the Stripe key (from `sk_live_...trFvEO` to `sk_live_...Y67wA`) and the Stripe key in `.env.local`/Cloudflare/GitHub Secrets. **However**, the OLD key is still visible in the git history.

**Confirmed in the file `STRIPE-KEY-ROTATION.md`:**
- Old key (`sk_live_51TEhmv...trFvEO`) — committed in earlier history
- New key (`sk_live_51TEhmv...Y67wA`) — active since 2026-06-12

The new key was the user-provided replacement. **No `git filter-repo` was run yet** — the old key is still grep-able in the git history.

## Required actions (in order)

### Step 1 — confirm the old key is no longer in use

```sh
# Cloudflare worker secrets
wrangler secret list 2>&1 | grep STRIPE_SECRET_KEY

# GitHub repo secrets (cannot read, but user can check at
# https://github.com/SIN-Shop-Center/SIN-webshop-01/settings/secrets/actions)

# .env.local on the VM
ssh ubuntu@92.5.60.87 "grep '^STRIPE_SECRET_KEY' /home/ubuntu/SIN-webshop-01/.env.local"
```

Expected: ONLY the new key (`...Y67wA`) appears. The old key (`...trFvEO`) should NOT appear anywhere in current secrets.

### Step 2 — install git-filter-repo

```sh
brew install git-filter-repo
# or: pip install git-filter-repo
```

### Step 3 — rewrite history

```sh
cd /Users/jeremy/dev/SIN-webshop-01

# Backup first!
cp -r . ../SIN-webshop-01-backup-$(date +%Y%m%d)

# Run filter-repo to remove both keys from all branches
git filter-repo \
  --invert-paths \
  --path-glob '*.env*' \
  --path-glob '.env.local' \
  --path-glob '.env.production' \
  --path-glob 'secrets/*' \
  --force

# Specifically target the old key commits (if any)
git filter-repo \
  --replace-text <(printf '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\n<REDACTED>\n') \
  --force
```

### Step 4 — force-push

```sh
# With team coordination: notify all contributors before push
git push --force-with-lease --all
```

### Step 5 — rotate the Stripe key AGAIN (defense in depth)

Even after filter-repo, assume the old key is compromised. Rotate it once more.

```sh
# In Stripe Dashboard → Developers → API Keys → Roll key
# Update:
wrangler secret put STRIPE_SECRET_KEY
gh secret set STRIPE_SECRET_KEY --repo SIN-Shop-Center/SIN-webshop-01
# Update .env.local on the VM
# Update Infisical
infisical secrets set STRIPE_SECRET_KEY --projectId fa7758b4-f84c-4297-966e-710056d531ef --path /SIN-Webshop-01 --env dev
```

### Step 6 — verify the key is gone from history

```sh
cd /Users/jeremy/dev/SIN-webshop-01
git log --all -p | grep -c "trFvEO" || echo "0 hits — clean"

# Also check GitHub
gh api "search/code?q=trFvEO+repo:SIN-Shop-Center/SIN-webshop-01" 2>&1 | jq '.total_count'
# Expected: 0
```

### Step 7 — also scan for OTHER secrets

```sh
# gitleaks
pnpm dlx gitleaks detect --no-banner

# trufflehog
brew install trufflehog
trufflehog git file://. --only-verified
```

## Acceptance

- `git log --all -p | grep "trFvEO"` → 0 hits
- `gitleaks detect` → 0 issues
- `trufflehog` → 0 verified secrets
- GitHub code search for `trFvEO` → 0 results
- Cloudflare / GitHub / `.env.local` only contain the new key

## Closing

```sh
gh issue close 26 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "git filter-repo run, force-pushed, gitleaks clean, trFvEO nicht mehr in history. Key zum 3. Mal rotiert als defense-in-depth."
```
