# Archivierte synthetische Workflows

Diese Workflows wurden am 22.07.2026 aus dem aktiven n8n-Pfad entfernt.

## Warum

- `05-daily-trend-analysis.json` erzeugte Trends überwiegend aus einem LLM-Prompt statt aus realen Messquellen und enthielt eine fest verdrahtete Zeitangabe aus Januar 2026.
- `06-supplier-research.json` simulierte Lieferantenrecherche ohne belastbare CJ-Bestands-, Daten- und Compliance-Prüfung.
- `07-social-media-post.json` hatte keinen ausreichenden Review-, Opt-out-, Idempotenz- oder Plattform-Governance-Layer.

## Ersatz

Der aktive Pfad liegt jetzt in `tooling/scripts/pipeline/`:

1. `trend-intelligence.mjs`
2. `select-top-cj-products.mjs`
3. `enrich-products.mjs`
4. `openmontage-shop-bridge.mjs`
5. `publish-approved-products.mjs`
6. `prepare-social-drafts.mjs`
7. `commerce-worker.mjs`

Die archivierten JSON-Dateien dürfen nicht wieder aktiviert werden. Sie bleiben nur als historische Referenz erhalten.
