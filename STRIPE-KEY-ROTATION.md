# Stripe Key Rotation — Schritt-für-Schritt Guide

## Status: 🔴 KRITISCH — Stripe Secret Key abgelaufen

**Symptom:** Jeder Checkout bricht mit "Beim Starten der Zahlung ist ein Fehler aufgetreten" ab.
**Ursache:** `StripeAuthenticationError` — `api_key_expired`.

---

## Schritt 1: Neuen Stripe Key generieren (manuelle Aktion)

1. Öffne [Stripe Dashboard](https://dashboard.stripe.com) → Melde dich an
2. Oben rechts: **Developers** → **API Keys**
3. Unter **Standard keys** → **Secret key** → auf **Reveal** klicken
4. Falls der Key abgelaufen ist: **Roll key** → Neuen Key generieren
5. Kopiere den neuen `sk_live_...` Key
6. Falls der Webhook auch betroffen ist: **Developers** → **Webhooks** → Endpoint für `shopsin.delqhi.com` bearbeiten → **Signing secret** kopieren

---

## Schritt 2: Neue Keys in .env eintragen (automatisch)

```bash
# In .env.local und .env.production die 3 Stripe-Zeilen ersetzen:
STRIPE_SECRET_KEY="sk_live_NEUER_KEY_HIER"
STRIPE_WEBHOOK_SECRET="whsec_NEUER_SECRET_HIER"  # falls auch rotiert
STRIPE_PUBLISHABLE_KEY="pk_live_51TEhmv..."      # bleibt meist gleich
```

---

## Schritt 3: Cloudflare Secrets deployen (automatisch)

```bash
# Alle Secrets auf einmal aktualisieren (aus .env.local lesen)
node scripts/deploy-cloudflare-secrets.mjs
```

---

## Schritt 4: GitHub Secrets aktualisieren (automatisch)

```bash
# Alle Secrets auf einmal in GitHub setzen (aus .env.local lesen)
node scripts/deploy-github-secrets.mjs
```

---

## Schritt 5: Neu deployen (automatisch)

```bash
npx wrangler deploy
```

---

## Schritt 6: Checkout verifizieren (automatisch)

```bash
# Stripe Key-Test
node scripts/test-stripe-key.mjs

# Checkout E2E-Test (falls Playwright Browser installiert)
node scripts/test-checkout.mjs
```

---

## Webhook-Endpoint Konfiguration

Falls der Webhook neu angelegt werden muss:

| Feld | Wert |
|---|---|
| Endpoint URL | `https://shopsin.delqhi.com/api/webhooks/stripe` |
| Events | `checkout.session.completed` |
| API Version | 2024-10-28 (oder aktuellste) |

Nach Erstellung: Signing secret kopieren und in `STRIPE_WEBHOOK_SECRET` eintragen.

---

## Notfall: Falls Stripe-Account blockiert ist

Falls der Account eingeschränkt ist (Payout pausiert, etc.):
1. Stripe-Support kontaktieren: support@stripe.com
2. Oder: Stripe-Test-Modus verwenden (mit `sk_test_...` Keys) für den Shop
3. Alternativ: Zahlungsanbieter wechseln (Mollie, PayPal, Klarna)

---

## Automatisierte Scripts

- `scripts/deploy-cloudflare-secrets.mjs` — Liest `.env.local` und setzt alle Secrets via Wrangler API
- `scripts/deploy-github-secrets.mjs` — Liest `.env.local` und setzt alle Secrets via GitHub CLI (`gh`)
- `scripts/test-stripe-key.mjs` — Testet ob der Key gültig ist
- `scripts/test-checkout.mjs` — Playwright E2E-Test des Checkouts

Alle Scripts lesen aus `.env.local` — dort müssen die NEUEN Keys eingetragen sein.
