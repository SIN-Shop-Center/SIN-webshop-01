# Fix #22 — Stripe Checkout integrieren (ersetzt Fake-Kartenformular)

> **Status:** OPEN (im Issue-Tracker, ABER in der Praxis: DONE) · **Priority:** low
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/22

## Context

Stripe Checkout is live. The fake-card form was replaced by a real Stripe Session. Key was rotated 2026-06-12.

## Verifizierung

```sh
# 1. Stripe Session-Erstellung im Code
cd /Users/jeremy/dev/SIN-webshop-01
grep -A 5 "checkout.sessions.create" app/lib/actions/checkout.ts | head -10
# Expected: code creating a Stripe Session with mode='payment', line_items, etc.

# 2. Webhook-Handler
cat app/api/stripe/webhook/route.ts | head -40
# Expected: verifies signature, handles checkout.session.completed

# 3. Live-Test (use Stripe test card)
# /kasse → 4242 4242 4242 4242 → should land on /kasse/erfolg

# 4. Aktiver Stripe-Key (NICHT der alte)
grep "sk_live" /home/ubuntu/SIN-webshop-01/.env.local
# Expected: ...Y67wA (neuer Key, NICHT ...trFvEO)
```

## Was läuft

- `app/lib/actions/checkout.ts` → `getStripe().checkout.sessions.create({...})`
- `app/api/stripe/webhook/route.ts` verifiziert `stripe-signature` Header
- `shop.orders.stripe_session_id` UNIQUE-Constraint (#30) verhindert Doppelverarbeitung
- `processed_events` Tabelle dedupliziert Webhook-Events (#54)
- CJ-Fulfillment-Polling alle 30 min für `fulfillment_status='pending'`

## Closing

```sh
gh issue close 22 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "Stripe Checkout live, Webhook verifiziert, Key rotiert. Erste Bestellung getestet."
```
