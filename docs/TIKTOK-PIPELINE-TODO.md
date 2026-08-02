# TikTok Shop Pipeline — aktueller Restplan

Stand: 23. Juli 2026

## Ziel

ShopSIN soll Produkte autonom recherchieren, bewerten, beschaffen, anreichern, kreativ aufbereiten und nach klaren Freigabe-Gates zuerst als TikTok-Shop-Draft bereitstellen. Direkte Listings werden erst nach Development-Shop-Abnahme aktiviert.

## Bereits implementiert

### Trend- und Produktintelligenz

- `tooling/scripts/pipeline/trend-intelligence.mjs`
- Google-Trends-RSS, konfigurierbare externe Quellen und Browser-Evidenz
- normalisierte Kandidaten, Scores und Queue-Jobs
- CJ-Kandidatensuche und Datenanreicherung
- Qualitaets-, Risiko- und Publish-Blocker

### Shop- und Commerce-Control-Plane

- Supabase Queue/Worker
- Produktanreicherung und Storefront-Publishing
- Hersteller-, GPSR- und EU-Verantwortlichen-Gates
- Freigabe-Workflow fuer Produkt und Creative
- Monitoring, Alerts und Admin-Uebersichten

### Creative-Pipeline

- OpenMontage-Handoff
- UGC-Briefs und Render-Artefakte
- Creative-Review und Freigabe
- `tooling/scripts/pipeline/upload-approved-tiktok-videos.mjs`
- TikTok-Content-Upload standardmaessig deaktiviert und nur als Draft

### TikTok Shop

- signierte API-Requests
- sichere OAuth-Start-/Callback-Strecke mit Single-Use-CSRF-State
- Tokens in `tiktok_auth`
- Produkt-Draft/Listing-Orchestrierung mit harten Qualitaets-Gates
- Preis-/Bestandssynchronisierung
- Webhook plus Order-Polling-Fallback
- Mehrpositions-/Mengen-sicheres CJ-Fulfillment
- Tracking, Returns, Token-Watchdog und Wochenreport

## Offene externe Blocker

Diese Punkte koennen nicht durch Code allein erledigt werden:

1. TikTok Partner Center App beziehungsweise Custom App anlegen und genehmigen.
2. Development Shop/Test-Seller einrichten.
3. benoetigte Seller-, Product-, Order-, Fulfillment- und Event-Scopes freischalten.
4. Redirect URL und Webhook URL auf die Produktionsdomain setzen.
5. `TIKTOK_SERVICE_ID`, `TIKTOK_APP_KEY`, `TIKTOK_APP_SECRET` im Secret Manager setzen.
6. Seller-OAuth ueber `/admin/tiktok` abschliessen.
7. Versanddienstleister-ID und TikTok-Kategorieattribute mit realen Testprodukten validieren.
8. Produktbezogene GPSR-/Hersteller-/EU-Verantwortlichen-Nachweise vervollstaendigen.
9. Development-Shop-Test fuer Draft, Listing, Multi-Line-Order, Menge, Tracking, Storno und Retoure dokumentieren.

## Verbindliche Aktivierungsreihenfolge

### Phase A — sichere Integration

```env
TIKTOK_SAVE_MODE=AS_DRAFT
TIKTOK_CONTENT_UPLOAD_ENABLED=false
```

- OAuth verbinden
- Shop-Cipher und Token-Refresh pruefen
- ein vollstaendiges Produkt als Draft erstellen
- Kategorie, Attribute, Bilder, Preis, Bestand und GPSR pruefen
- Testorder bis CJ und Tracking durchspielen

### Phase B — Content Drafts

```env
TIKTOK_CONTENT_UPLOAD_ENABLED=true
```

Nur nach Authorisierung der Content Posting API. Upload weiterhin als Draft; keine automatische Veroeffentlichung ohne Review.

### Phase C — kontrolliertes Listing

```env
TIKTOK_SAVE_MODE=LISTING
```

Nur aktivieren, wenn alle folgenden Nachweise vorhanden sind:

- Development-Shop-End-to-End erfolgreich
- keine offenen Publish-Blocker
- Kategorieattribute vollstaendig
- GPSR/Hersteller/EU-Verantwortlicher verifiziert
- Bestand und Preis synchron
- Fulfillment und Retouren getestet
- Monitoring und Alerts aktiv
- dokumentierte menschliche Freigabe

## Erweiterung auf weitere Marktplaetze

Neue Kanaele werden als Adapter an dieselbe Control Plane angebunden. Kein Copy-Paste der Businesslogik. Jeder Adapter muss mindestens bieten:

- kanalspezifische Authentifizierung und Token-Rotation
- Draft-/Review-Modus vor direkter Veroeffentlichung
- Produkt-, Preis- und Bestandsmapping
- Order-, Fulfillment-, Tracking- und Retourenfluss
- Idempotenz und Retry-Strategie
- Monitoring und Audit-Evidenz

Erst nach den ersten stabilen TikTok-Verkaeufen und belastbaren Unit Economics wird der naechste Kanal aktiviert.
