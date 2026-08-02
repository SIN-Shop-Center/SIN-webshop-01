# E2E / Integration Tests (Issue #32)

Diese Tests prüfen die **kritischsten Race-Conditions und Idempotenz-Garantien** der App, indem sie gegen die echte Supabase-DB laufen.

## Voraussetzungen

- Standard: `pnpm db:local:start`; der Runner entdeckt lokale Testwerte ohne sie zu loggen.
- Alternativ ausschließlich eine isolierte Testinstanz über `.env.test.local`.
- Produktions-Credentials und Produktionsdatenbanken sind ausdrücklich verboten.

## Test-Suiten

| Datei | Was wird geprüft | Laufzeit | Dependencies |
|---|---|---|---|
| `tooling/tests/integration/webhook-idempotency.test.ts` | Stripe-Webhook-Idempotenz: 1× POST → 1 Order, 2× POST gleiche event.id → 1 Order, Replay mit neuer event.id → 1 Order | ~3s | Supabase + laufender Server |
| `tooling/tests/integration/rate-limit.test.ts` | Brute-Force-Schutz: 5 Logins ok, 6. wirft `RateLimitError` | <1s | keine (in-memory) |
| `tooling/tests/integration/inventory-race.test.ts` | Stock-Race-Condition: parallele Reservierungen auf stock=1 → 1× success, 1× P0001 | ~2s | Supabase |
| `tooling/tests/unit/pricing.test.ts` | Pure Pricing-Logik (FX-Rate, .99-Magic) | <1s | keine |

## Befehle

```bash
# Nur Unit-Tests (schnell, keine externen Abhängigkeiten)
pnpm test:unit

# Integration-Tests gegen den lokalen migrierten Stack
pnpm db:local:start
pnpm test:integration

# Beide
pnpm test:unit && pnpm test:integration

# Watch-Mode (für Entwicklung)
pnpm exec vitest watch
```

Die vollständige Strategie einschließlich Seed/Cleanup, Browsermodi und
externen Guards steht in `docs/TESTING.md`.

## Was NICHT hier getestet wird

- **Stripe-Hosted-UI ohne explizite Testmode-Credentials**
- **Visual Regression** — out of scope
- **Load-Tests** (k6, Artillery) — out of scope

## CI-Integration

CI muss den lokalen Supabase-Stack starten und kann danach dieselben Commands
ohne gespeicherte Supabase-Secrets ausführen.

## Cleanup-Verhalten

Alle Integration-Tests legen Test-Daten mit eindeutigen IDs an (`__e2e_*`,
`evt_e2e_*`, `cs_test_e2e_*`) und löschen sie in `afterAll` wieder. Bei
abnormalem Abbruch können Reste bleiben — Cleanup manuell:

```sql
DELETE FROM orders WHERE stripe_session_id LIKE 'cs_test_e2e_%';
DELETE FROM processed_events WHERE event_id LIKE 'evt_e2e_%';
DELETE FROM products WHERE slug = '__e2e_race_test_product__';
```
