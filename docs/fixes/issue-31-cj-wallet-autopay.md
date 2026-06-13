# Fix #31 — CJ-Wallet aufladen ($50 Mindestbetrag) + Auto-Pay aktivieren

> **Status:** OPEN · **Priority:** CRITICAL (P0) · **External (CJ-Dashboard)**
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/31
> **Owner:** Jeremy (CJ-Dashboard)

## Context

Identisch mit #13 — der Unterschied: hier geht es um die **empfohlene $50 + Auto-Pay-Setup** für langfristigen stabilen Betrieb, während #13 die initiale $20-50 für die ersten Bestellungen ist.

Aktueller Stand: Wallet vermutlich leer (nach #13 nicht aufgeladen). Bestellungen mit `fulfillment_status='failed'` wegen `insufficient balance`.

## Action: Wallet aufladen (10 Min)

1. Login: https://cjdropshipping.com/my/wallet
2. Klick: **Top Up**
3. **Betrag: $50** (Minimum für 4–5 Wochen Umsatz bei aktuellem Volumen)
4. **Zahlungsmethode**: PayPal bevorzugt (schnellste Verfügbarkeit), Kreditkarte OK
5. **Auto-Recharge konfigurieren**:
   - Threshold: `$10`
   - Top-up-Amount: `$50`
   - Payment: gleiche Karte
   - Enabled: ✅

## Why $50 specifically?

| Tagesumsatz | Wallet hält für | Empfehlung |
|-------------|----------------|------------|
| $0 (keine Bestellungen) | ∞ | $0 (Auto-Pay aus) |
| $5 | 10 Tage | $20 + Auto bei <$5 |
| $10 | 5 Tage | $50 + Auto bei <$10 |
| $20 | 2,5 Tage | $50 + Auto bei <$10 |
| $50 | 1 Tag | $100 + Auto bei <$20 |

Bei $50 Threshold bist du safe für ~5 Tage bei $10/Tag. Auto-Pay fängt den nächsten Tag.

## Verifizieren

```sh
# Via CJ API
export CJ_TOKEN=$(cat ~/.cj-tokens.json | python3 -c "import json,sys; print(json.load(sys.stdin)['accessToken'])")
curl -H "CJ-Access-Token: $CJ_TOKEN" \
  "https://developers.cjdropshipping.com/api2.0/v1/wallet/getBalance" \
  | python3 -m json.tool

# Via UI: Wallet-UI zeigt aktuellen Stand + Auto-Pay-Config
```

## Code-Änderungen (optional, aber empfohlen)

```ts
// app/lib/cj/wallet-monitor.ts (NEU)
import { createAdminClient } from '@/lib/supabase/admin'

const LOW_BALANCE_THRESHOLD_USD = 10

export async function checkCjWalletBalance(): Promise<{
  balance: number
  isLow: boolean
  shouldAlert: boolean
}> {
  const token = (await import('node:fs')).readFileSync(
    `${process.env.HOME}/.cj-tokens.json`,
    'utf-8',
  ).then((j) => JSON.parse(j).accessToken)

  const res = await fetch(
    'https://developers.cjdropshipping.com/api2.0/v1/wallet/getBalance',
    { headers: { 'CJ-Access-Token': token } },
  )
  const data = await res.json()
  const balance = Number(data.data?.balance ?? 0)
  const isLow = balance < LOW_BALANCE_THRESHOLD_USD
  const shouldAlert = isLow

  if (shouldAlert) {
    // Alert to admin
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'alerts@delqhi.com',
        to: ['opensin@gmx.com'],
        subject: `[ShopSIN] CJ-Wallet LOW: $${balance}`,
        text: 'CJ-Wallet-Balance ist unter $10. Bitte aufladen.',
      }),
    })
  }

  return { balance, isLow, shouldAlert }
}
```

Add a daily cron: `app/api/cron/cj-wallet-check/route.ts` (schedule `0 8 * * *`).

## Acceptance

- CJ-Wallet-Balance > $50
- Auto-Recharge enabled mit Threshold $10
- Cron wallet-monitor läuft täglich 8 Uhr
- 0 Bestellungen mit `fulfillment_error LIKE '%balance%'`

## Closing

```sh
gh issue close 31 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "Wallet $50 aufgeladen, Auto-Pay bei <$10 aktiv, daily wallet-monitor Cron deployed."
```
