# ADR-0001: Hybrid Stack (Next.js + Go + Supabase)

## Status
Accepted

## Context
Die bestehende Lösung ist monolithisch und koppelt UI, API und Automation zu stark. Es gibt funktionale Assets in drei Quellen, aber kein belastbares Zielsystem.

## Decision
- `apps/web`: Next.js App Router als UI/BFF-Proxy.
- `apps/api`: Go Domain-API für orchestrierte Business-Endpunkte.
- Supabase/Postgres bleibt persistente Wahrheit.
- Worker werden separiert in `platform/workers/edge`, `platform/workers/n8n`, `apps/api/cmd/worker`.

## Consequences
- Klare Domänengrenzen, testbare Services, geringere Kopplung.
- Höherer Initialaufwand durch Monorepo-Umstrukturierung.
