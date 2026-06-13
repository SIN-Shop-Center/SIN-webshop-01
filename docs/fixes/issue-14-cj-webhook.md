# Fix #14 — CJ-Webhook-URL im CJ-Dashboard registrieren

> **Status:** OPEN · **Priority:** medium · **External (kein Code-Task)**
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/14
> **Owner:** Jeremy (manuell, CJ-Dashboard)

## Context

CJ sendet Webhooks für Order-Status-Updates (shipped, delivered, exception). Ohne registrierte Webhook-URL weiß unser System nichts vom Status, sobald CJ versendet hat. Das blockiert die Funktion in `app/lib/fulfillment/tracking-sync.mjs`.

Aktuell: Webhook-Endpoint existiert lokal: `app/api/cron/cj-fulfillment/route.ts` (alle 30 min via Cron). Aber echte Webhook-Push von CJ hängen am Endpoint.

## Schritt-für-Schritt (manuell, 5 Min)

1. **CJ-Webhook-UI öffnen**
   `https://members.cjdropshipping.com/user/develop/webhooks` (oder `https://cjdropshipping.com/my/open-api`)

2. **Webhook hinzufügen**
   - URL: `https://shopsin.delqhi.com/api/cron/cj-fulfillment`
     (alternativ: `https://shopsin.delqhi.com/api/webhooks/cj` — sauberer Pfad)
   - Events: ✅ `order.shipped`, ✅ `order.delivered`, ✅ `order.exception`, ✅ `tracking.updated`
   - HTTP Method: POST
   - Content-Type: application/json

3. **Secret / HMAC**
   - CJ sendet `X-CJ-Signature: sha256=<hex>` Header
   - Speichere das Secret in `.env.local` als `CJ_WEBHOOK_SECRET`
   - Auf Cloudflare: `wrangler secret put CJ_WEBHOOK_SECRET`

4. **Verifizieren (lokal)**
   ```sh
   # Test-Event von CJ-Dashboard senden
   # Im CJ-Webhook-UI: "Test-Event" klicken
   # Logs prüfen:
   ssh ubuntu@92.5.60.87 "docker logs supabase-functions --tail 20 | grep -i cj-webhook"
   ```

## Code-Patch (optional — der Endpoint sollte besser heißen)

```ts
// app/api/webhooks/cj/route.ts
import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const raw = await req.text()
  const sig = req.headers.get('x-cj-signature') ?? ''
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.CJ_WEBHOOK_SECRET!)
    .update(raw)
    .digest('hex')

  if (
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const body = JSON.parse(raw) as {
    event: string
    orderId: string
    trackingNumber?: string
  }

  const supabase = createAdminClient()
  await supabase
    .from('orders')
    .update({
      fulfillment_status: body.event,
      tracking_number: body.trackingNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('cj_order_id', body.orderId)

  return NextResponse.json({ ok: true })
}
```

## Acceptance

- Webhook im CJ-Dashboard registriert
- Test-Event von CJ schlägt in `shop.orders` mit `tracking_number` auf
- 401 wenn HMAC falsch

## Closing

```sh
gh issue close 14 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "Webhook im CJ-Dashboard registriert: https://shopsin.delqhi.com/api/webhooks/cj"
```
