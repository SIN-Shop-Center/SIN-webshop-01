# ShopSIN Rebuild Status — 22.07.2026

## Executive assessment

The repository was not production-ready. It mixed a real Next.js/Supabase/Stripe foundation with demo automations, synthetic trend generation, unsafe supplier defaults, disconnected creative tooling, false GPSR defaults, non-functional checkout UI and several misleading conversion widgets.

The active architecture has now been replaced with an evidence-first commerce control plane and a reduced storefront. The system is designed to stop when data, compliance, creative or platform approval is missing instead of pretending that a stage succeeded.

## Completed in the repository

### Admin and operations

- New OpenAI/Codex-style admin shell.
- Operational dashboard with queue, incidents, channel status and recent jobs.
- Automation page for each governed pipeline stage.
- Creative Studio page for OpenMontage handoff and queue status.
- Product readiness table with quality, blockers, risk, creative and TikTok state.
- Human review page for docs/product/GPSR, OpenMontage checkpoints and social drafts.

### Commerce pipeline

- Real trend ingestion from Google Trends RSS, optional HTTPS feeds and approved browser captures.
- CJ ranking based on verified EU stock, margin, delivery, data quality and risk.
- No synthetic stock fallback and no immediate activation of imported products.
- Product enrichment with web research, strict structured data and stored source URLs.
- Product-specific manufacturer and EU responsible-person verification.
- Queue worker with allowlisted commands, retries and dead-letter handling.
- Daily idempotent enqueue job and macOS launchd definitions.

### OpenMontage and Codex

- New `product-ugc` OpenMontage pipeline.
- Separate gates for research, proposal/budget, script, scene plan, assets, edit, compose/final review and export.
- Per-product project workspace, brief, source intake and checkpoint synchronization.
- Admin decisions are audited in Supabase and applied to local checkpoint JSON files.
- Scoped `codex exec` wrapper resumes exactly at the approved/revision stage.
- No direct publishing from OpenMontage.

### Shop and TikTok publishing

- Shop activation only after product, quality, stock, creative and GPSR gates pass.
- TikTok Shop listing defaults to `AS_DRAFT`.
- TikTok Content Posting upload is disabled by default and, when enabled, uploads approved videos only to the authorized user's inbox as drafts.
- Listing and social-video APIs are kept separate.

### Social distribution

- Reviewable owned-channel posts, public-context replies, community shares and one-time creator outreach drafts.
- Idempotency, public source URL and opt-out state.
- No fake likes, follow bot, mass comments or uncontrolled bulk DMs.
- Approval does not automatically send; an official per-channel adapter remains required.

### Storefront

- Removed global announcement/urgency overlays, exit-intent popup, fake rating badge and duplicate mobile navigation.
- Rebuilt header, hero, homepage sections and footer in a quiet, monochrome system.
- Removed fixed savings claims, fake customer counts and synthetic social proof.
- Product cards show ratings only when both rating and rating count exist.
- Product detail page no longer uses fake live-viewer counts or a universal size guide.
- Stock is shown as a factual database value rather than an urgency bar.
- Delivery, free-shipping threshold and return statements use centralized configuration.
- Verified manufacturer and EU responsible-person details are shown product-by-product.
- Product JSON-LD no longer declares ShopSIN as manufacturer/brand by default.
- `/kasse` is now an actual order review and hands address, shipping and payment to Stripe instead of displaying no-op form fields.
- A real order-summary component calculates totals from current server-loaded products.
- Public product detail/cart lookups now require active products.

## Safe defaults

```dotenv
TIKTOK_SAVE_MODE=AS_DRAFT
TIKTOK_CONTENT_UPLOAD_ENABLED=false
```

New products remain inactive. Social delivery remains disabled. Unknown manufacturer/GPSR data blocks publishing.

## Required before production

These actions were not executed by the filesystem-only Mac connection and must not be reported as completed:

1. Back up the Supabase database.
2. Apply and verify `20260722000000_commerce_control_plane.sql` in staging.
3. Apply the updated public product view.
4. Run `pnpm pipeline:verify` and resolve every blocker.
5. Run TypeScript, lint, unit, integration and production build checks.
6. Test Stripe Checkout with active, unavailable and over-stocked cart items.
7. Test one real CJ product through EU-stock lookup and enrichment.
8. Complete every OpenMontage checkpoint with a low-cost test product.
9. Verify the final render, paths, captions and final-review report.
10. Test TikTok Shop in a development shop as a draft.
11. Keep TikTok Content Posting disabled until OAuth and app review are complete.
12. Review Impressum, privacy, withdrawal, returns, shipping and contact pages with the real legal/business details.
13. Install and enable launchd only after a successful manual worker run.

## Immediate commands

```bash
cd /Users/jeremy/dev/SIN-webshop-01
pnpm pipeline:verify
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Then, after a database backup and staging review:

```bash
supabase db push
pnpm pipeline:enqueue-daily
pnpm pipeline:once
```

The detailed architecture and runbook are in `docs/COMMERCE_CONTROL_PLANE.md`.
