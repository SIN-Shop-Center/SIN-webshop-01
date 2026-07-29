# ADR-0002: Data Authority = Supabase/Postgres

## Status
Accepted

## Decision
Supabase/Postgres ist das einzige System of Record. Go-API und Worker lesen/schreiben ausschließlich über diese Wahrheit.

## Rules
- Kein paralleles zweites Persistenzmodell in Go.
- Schema-Änderungen nur via versionierten SQL-Migrationen in `platform/infra/supabase/migrations`.
- Events werden aus DB-Änderungen (Outbox) abgeleitet.
