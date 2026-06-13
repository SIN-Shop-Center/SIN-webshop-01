# Fix #24 — Rechtstexte: Impressum, AGB, Widerruf, Datenschutz (DE-Pflicht, Abmahnrisiko)

> **Status:** OPEN (im Issue-Tracker, ABER in der Praxis: DONE) · **Priority:** low
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/24

## Context

German law requires these pages on any commercial site. Without them, competitors or Abmahnverein can issue costly warnings (~€500-1500 per missing page).

## Verifizierung

```sh
cd /Users/jeremy/dev/SIN-webshop-01

# 1. Pages existieren?
ls app/impressum/page.tsx
ls app/agb/page.tsx
ls app/widerrufsrecht/page.tsx
ls app/datenschutz/page.tsx

# 2. Footer-Links zeigen richtig
grep -A 1 "impressum\|agb\|widerruf\|datenschutz" app/components/Footer.tsx

# 3. Echte Daten (Jeremy Schulze, Kurfürstenstraße 124, 10785 Berlin)
grep "Schulze\|Kurfürstenstraße\|10785" app/impressum/page.tsx | head -5
```

## Was drin sein muss (rechtliche Mindestanforderungen)

### Impressum (`/impressum`)
- Vollständiger Name (Jeremy Schulze)
- Anschrift (Kurfürstenstraße 124, 10785 Berlin)
- E-Mail (opensin@gmx.com)
- Telefon (+49 XXX)
- USt-IdNr (falls vorhanden)
- Verantwortlich für den Inhalt (§ 18 Abs. 2 MStV)

### AGB (`/agb`)
- Vertragsschluss
- Lieferbedingungen
- Preise + Versandkosten
- Eigentumsvorbehalt
- Haftung
- Anwendbares Recht + Gerichtsstand

### Widerrufsbelehrung (`/widerrufsrecht`)
- 14-Tage-Widerrufsrecht
- Widerrufsfolgen (Rücksendung, Kosten)
- Ausschluss des Widerrufsrechts (z.B. versiegelte Waren)
- Widerrufsformular

### Datenschutz (`/datenschutz`)
- Verantwortlicher + Kontakt
- Welche Daten werden erhoben
- Zweck + Rechtsgrundlage
- Empfänger + Drittlandtransfer
- Speicherdauer
- Rechte der Betroffenen (Auskunft, Löschung, Widerspruch)
- Beschwerderecht bei der Aufsichtsbehörde
- Cookies + Tracking
- Zahlungsanbieter (Stripe)

## Generierung (nicht selbst schreiben!)

```sh
# Empfehlung: Händlerbund oder IT-Recht Kanzlei (z.B. Protected Shops)
# Kosten: 30-100 EUR/Jahr
# https://www.haendlerbund.de
# https://www.it-recht-kanzlei.de

# Adress-Vorlage aus AGENTS.md:
# "Rechtliche Anschrift: Kurfürstenstraße 124, 10785 Berlin
#  Email: opensin@gmx.com
#  Zahlungsanbieter: Stripe
#  Dropshipping-Supplier: CJ Dropshipping
#  Verantwortlich für Inhalt: Jeremy Schulze"
```

## Risiko wenn NICHT vorhanden

- **Erste Abmahnung**: ~500-1500 € (typische Streitwerte)
- **Wiederholte**: ~2500-5000 €
- **Wettbewerbsklage**: Schadensersatz + Unterlassung
- **Google Penalty**: Manchmal bei fehlendem Impressum

## Closing

```sh
gh issue close 24 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "Rechtstexte vorhanden: /impressum, /agb, /widerrufsrecht, /datenschutz. Footer-Links korrekt."
```
