# Fix #33 — Resend Domain-Verifizierung: delqhi.com SPF/DKIM/DMARC setzen

> **Status:** OPEN · **Priority:** HIGH (P1) · **External (Cloudflare-DNS) + Resend-Dashboard**
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/33
> **Owner:** Jeremy (Resend-Dashboard + Cloudflare-DNS)

## Context

Ohne Domain-Verifizierung landen alle E-Mails (Bestellbestätigung, Newsletter, etc.) im Spam- oder Promotions-Tab. Schlimmster Fall: Gmail/Outlook lehnen komplett ab.

**Betroffene Mails:**
- `app/api/stripe/webhook/route.ts` (Bestellbestätigung via Resend)
- `app/lib/newsletter-send.ts` (Newsletter)
- `app/lib/cj/wallet-monitor.ts` (Wallet-Alerts)
- `app/api/cron/cleanup-reservations/route.ts` (zukünftig)

## Schritt-für-Schritt (manuell, 10 Min)

### 1. Resend-Dashboard: Domain hinzufügen

1. Login: https://resend.com/domains
2. Klick: **Add Domain**
3. Domain: `delqhi.com`
4. Resend zeigt 3 DNS-Records zum Hinzufügen:
   - **SPF**: `TXT @ "v=spf1 include:amazonses.com ~all"` (oder mit Resend-eigenem include)
   - **DKIM**: `CNAME resend._domainkey.delqhi.com → resend._domainkey.resend.com`
   - **DMARC**: `TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:dmarc@delqhi.com"`

Die exakten Werte stehen in Resend → Domains → delqhi.com → "Verify".

### 2. Cloudflare-DNS: Records hinzufügen

1. Login: https://dash.cloudflare.com → `delqhi.com` → DNS → Records → **Add Record**
2. Für jeden der 3 Resend-Records:
   - **SPF**: Type `TXT`, Name `@`, Content (aus Resend kopieren)
   - **DKIM**: Type `CNAME`, Name `resend._domainkey`, Target (aus Resend)
   - **DMARC**: Type `TXT`, Name `_dmarc`, Content (aus Resend)

### 3. Resend verifizieren

1. Im Resend-Dashboard → delqhi.com → **Verify**
2. Resend prüft DNS-Records (kann 5-30 Min dauern wegen DNS-Propagation)
3. Status wechselt von "Not verified" zu **"Verified"**

### 4. Test-Mail senden

```sh
# Via Resend API
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "ShopSIN <noreply@delqhi.com>",
    "to": ["opensin@gmx.com"],
    "subject": "Test SPF/DKIM",
    "text": "Mail-Test nach Domain-Verifizierung."
  }'

# Im Mail-Header prüfen:
# Authentication-Results: ... spf=pass dkim=pass dmarc=pass
```

### 5. FROM-Adresse in `.env.local` updaten

```sh
# In .env.local:
RESEND_FROM_EMAIL="ShopSIN <noreply@delqhi.com>"

# Auf Cloudflare:
wrangler secret put RESEND_FROM_EMAIL

# In GitHub:
gh secret set RESEND_FROM_EMAIL --repo SIN-Shop-Center/SIN-webshop-01
```

In `app/lib/email.ts` und `app/lib/newsletter-send.ts` muss `RESEND_FROM_EMAIL` jetzt die verifizierte Domain nutzen.

## Acceptance

- `https://resend.com/domains → delqhi.com` zeigt **"Verified"** mit grünem Häkchen
- Test-Mail-Header zeigt `dkim=pass` für `delqhi.com`
- `.env.local`: `RESEND_FROM_EMAIL="ShopSIN <noreply@delqhi.com>"`
- 0 E-Mails landen im Spam (Mail-Tester.com Score ≥ 9/10)

## Closing

```sh
gh issue close 33 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "delqhi.com SPF+DKIM+DMARC verifiziert, alle Mails via Resend nutzen noreply@delqhi.com."
```
