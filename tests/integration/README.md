# E2E / Integration Tests (Issue #32)

Diese Tests prüfen die **kritischsten Race-Conditions und Idempotenz-Garantien** der App, indem sie gegen die echte Supabase-DB laufen.

## Voraussetzungen

- `.env.local` mit **allen** Production-Secrets (Supabase Service-Role-Key etc.)
- Optional: lokal laufender Server (`pnpm dev` auf Port 3000) für Webhook-Tests
- Optional: Stripe-CLI für `stripe listen --forward-to localhost:3000/api/stripe/webhook`

## Test-Suiten

| Datei | Was wird geprüft | Laufzeit | Dependencies |
|---|---|---|---|
| `tests/integration/webhook-idempotency.test.ts` | Stripe-Webhook-Idempotenz: 1× POST → 1 Order, 2× POST gleiche event.id → 1 Order, Replay mit neuer event.id → 1 Order | ~3s | Supabase + laufender Server |
| `tests/integration/rate-limit.test.ts` | Brute-Force-Schutz: 5 Logins ok, 6. wirft `RateLimitError` | <1s | keine (in-memory) |
| `tests/integration/inventory-race.test.ts` | Stock-Race-Condition: parallele Reservierungen auf stock=1 → 1× success, 1× P0001 | ~2s | Supabase |
| `tests/unit/pricing.test.ts` | Pure Pricing-Logik (FX-Rate, .99-Magic) | <1s | keine |

## Befehle

```bash
# Nur Unit-Tests (schnell, keine externen Abhängigkeiten)
pnpm test:unit

# Integration-Tests (brauchen Supabase + ggf. lokal laufenden Server)
pnpm test:integration

# Beide
pnpm test:unit && pnpm test:integration

# Watch-Mode (für Entwicklung)
pnpm exec vitest watch
```

## Was NICHT hier getestet wird

- **Browser-E2E-Tests** (Playwright) — siehe Issue #32 Folge-Runde. Würde
  +Playwright-Installation + Stripe-CLI-Setup brauchen.
- **Visual Regression** — out of scope
- **Load-Tests** (k6, Artillery) — out of scope

## CI-Integration

`.github/workflows/ci.yml` läuft `pnpm test:unit` bei jedem PR.
Integration-Tests sind als `workflow_dispatch` (manuell) verfügbar, weil sie
Supabase-Secrets brauchen.

## Cleanup-Verhalten

Alle Integration-Tests legen Test-Daten mit eindeutigen IDs an (`__e2e_*`,
`evt_e2e_*`, `cs_test_e2e_*`) und löschen sie in `afterAll` wieder. Bei
abnormalem Abbruch können Reste bleiben — Cleanup manuell:

```sql
DELETE FROM orders WHERE stripe_session_id LIKE 'cs_test_e2e_%';
DELETE FROM processed_events WHERE event_id LIKE 'evt_e2e_%';
DELETE FROM products WHERE slug = '__e2e_race_test_product__';
```
