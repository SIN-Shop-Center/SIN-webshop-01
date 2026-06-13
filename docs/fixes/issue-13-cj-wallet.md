# Fix #13 — CJ-Balance aufladen ($20-50)

> **Status:** OPEN · **Priority:** HIGH (P0) · **External (kein Code-Task)**
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/13
> **Owner:** Jeremy (manuell, CJ-Dashboard) — erfordert Zahlungsmittel

## Context

Ohne Guthaben auf der CJ-Wallet wird **kein einziges Fulfillment** ausgelöst. Der `app/lib/fulfillment/submit-order.ts` macht `POST /v1/shopping/order/createOrder` — der antwortet mit `code: 1601001, message: "insufficient balance"` wenn die Wallet leer ist.

Aktuelle Bestellungen mit `fulfillment_status: 'failed'` (Tabelle `shop.orders`):

```sql
SELECT id, email, amount_total, fulfillment_error, created_at
FROM shop.orders
WHERE fulfillment_status = 'failed' AND fulfillment_error LIKE '%balance%'
ORDER BY created_at DESC;
```

## Schritt-für-Schritt-Anleitung (vom User auszuführen)

1. **CJ-Wallet öffnen**
   `https://cjdropshipping.com/my/wallet` (oder `https://members.cjdropshipping.com/user/wallet/index`)

2. **Top-Up**
   - Empfohlen: **$50** (für 3-4 Wochen im jetzigen Volumen)
   - Zahlungsmethoden: PayPal, Kreditkarte, Crypto, Banküberweisung
   - ACHTE: Bonus-Guthaben (z.B. "+5% bei $100") nur wählen, wenn du es auch ausgibst

3. **Auto-Recharge aktivieren (optional)**
   CJ erlaubt Auto-Topup bei <$10 Wallet-Stand:
   `Settings → Wallet → Auto Recharge → Threshold: $10, Amount: $50`

4. **Verifizieren**
   ```sql
   -- via CJ API (getAccountToken → getBalance)
   -- oder via Wallet-UI
   ```

## Verifikation lokal

```sh
# 1. CJ-Wallet-Status via API testen
export CJ_TOKEN=$(cat ~/.cj-tokens.json | python3 -c "import json,sys; print(json.load(sys.stdin)['accessToken'])")
curl -H "CJ-Access-Token: $CJ_TOKEN" \
  "https://developers.cjdropshipping.com/api2.0/v1/wallet/getBalance" \
  | python3 -m json.tool

# 2. Fulfillment-Versuche manuell re-triggern
# Auf der VM:
docker exec supabase-db psql -U postgres -d postgres -c "
UPDATE shop.orders
   SET fulfillment_status = 'pending',
       fulfillment_error = NULL,
       updated_at = NOW()
 WHERE fulfillment_status = 'failed'
   AND fulfillment_error LIKE '%balance%';
"
# Dann Cron cj-fulfillment läuft alle 30 min
```

## Auto-Recharge-Empfehlung

| Tagesumsatz | Wallet-Threshold | Auto-Topup |
|-------------|------------------|------------|
| <$10/Tag | $5 | $20 |
| $10–50/Tag | $20 | $50 |
| $50–200/Tag | $50 | $200 |
| >$200/Tag | $100 | $500 |

## Acceptance

- Wallet-Balance > 0
- 0 Bestellungen mit `fulfillment_status='failed'` AND `fulfillment_error LIKE '%balance%'`
- `app/api/cron/cj-fulfillment/route.ts` triggert `OK` (HTTP 200, success rate > 95%)

## Closing

```sh
gh issue close 13 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "Wallet aufgeladen mit $50. Fulfillment läuft wieder. Auto-Recharge bei <$10 aktiv."
```
