# Rebuild Status (Strangler Execution)

## Scope

Target repository: `/Users/jeremy/dev/projects/family-projects/simone-webshop-01`

Architecture decision remains fixed:

- `apps/web` -> Next.js UI shell
- `apps/api` -> Go domain API
- Supabase/Postgres -> source of truth
- `platform/workers/edge` + `platform/workers/n8n` + `apps/api/cmd/worker` -> micro-process layer
- `packages/contracts` -> API/event contracts

## Phase Status

1. Phase 0 (ADR + boundaries): **done**
2. Phase 1 (monorepo structure): **done**
3. Phase 2 (DB migration baseline): **done (initial)**
4. Phase 3 (contract-first OpenAPI/events): **done (initial)**
5. Phase 4 (Go API modules): **done (skeleton + route surface)**
6. Phase 5 (worker split): **done (initial edge workers + queue outbox worker)**
7. Phase 6 (frontend decoupling): **done (core funnels)**
8. Phase 7 (AI/social domains): **done (route + worker surface)**
9. Phase 8 (security hardening): **done (JWT/CORS/request-id/no-web-service-role path)**
10. Phase 9 (test matrix + gates): **done (current CI/local gates)**
11. Phase 10 (legacy removal): **in progress (domain-wise cleanup active)**

## Implemented Outputs

- Monorepo folders and workspace root scripts
- Go API scaffold with health/readiness/liveness + v1 route surface
- Go API DB-backed handlers for `catalog`, `cart`, `checkout` (event enqueue), `orders`, and `admin/orders`
- Outbox processor in Go worker (`apps/api/internal/events/outbox.go`)
- Supabase migration chain:
  - `20260225000100_core.sql`
  - `20260225000200_domains.sql`
  - `20260225000300_eventing.sql`
- Edge function split with shared modules
- n8n workflow relocation and event mapping docs
- Web compatibility proxy routes:
  - `/api/products` -> `/api/v1/catalog/products`
  - `/api/webhooks/stripe` -> `/api/v1/webhooks/stripe`
  - `/api/health` -> API readiness proxy
- Web account proxy routes:
  - `/api/account/me` -> `/api/v1/account/me`
- Legacy-Compat-Abbau (Web API):
  - deprecated mutating handlers auf `/api/products`, `/api/orders`, `/api/admin/orders` entfernt
  - `/api/admin/orders/:id` auf finales `PATCH`-Mutation-Interface ausgerichtet
- Launch-Hardening für schnellen Go-Live:
  - `checkout/session` auf Guest+Auth-Flow (Umsatzpfad nicht durch fehlendes Login blockiert)
  - API kann JWKS/Issuer automatisch aus `SUPABASE_URL` ableiten
  - separater `worker` Service in Compose für Queue/Outbox-Verarbeitung
  - `n8n`/`clawdbot` standardmäßig entkoppelt (optional via `automation` profile)
- Account area decoupled into feature slices with live order loading (`/api/orders` proxy first, fallback controlled by env flag)
- Admin control plane now includes onboarding gate with auto-open, manual restart, and analytics event hooks
- Docker compose alignment for monorepo paths and dedicated Go API service
- CI baseline workflow (`.github/workflows/ci.yml`)
- Monolith guardrails with baseline hard-null (`tooling/scripts/guard-lines-baseline.json` = `{}`)
- `apps/web` lint + typecheck + build pass in migrated workspace layout
- `apps/api` tests pass (`go test ./...`)
- Security hardening:
  - API startup validation enforces `DATABASE_URL`, strict `CORS_ALLOWLIST`, and JWT config in required mode
  - Supabase JWT validation includes issuer/audience checks and normalized role mapping (`authenticated -> customer`)
  - CORS blocks disallowed origins explicitly
  - Web API base URL has no production localhost fallback
  - Web service-role path removed (`createServerClient` deleted)

## Current Known Gaps

- Domain-weise Legacy-Löschung ist fortgeschritten, aber noch nicht vollständig abgeschlossen (Compatibility-Routen bestehen teils noch für Strangler-Window).
- Queue-Worker-Handler sind funktional vorhanden, aber Performance- und Lasttest-Härtung je Jobtyp ist weiter ausbaufähig.
- KPI-Go/No-Go (14-Tage Produktmetriken nach Rollout) hängt naturgemäß am produktiven Traffic-Fenster.

## Immediate Next Cutover Order

1. Domain-cutover in Reihenfolge `catalog -> cart -> checkout/orders -> admin -> ai/social/support`, jeweils mit 24h Beobachtungsfenster.
2. Compat-Routen pro Domäne nach stabilem Fenster entfernen und Legacy-Code direkt löschen.
3. KPI- und Alerting-Review nach Rollout-Fenster (Add-to-Cart, Checkout Completion, PDP Bounce, Support-Kontakte).
4. Last-/Stabilitäts-Härtung auf Worker- und Checkout-Pfaden.
