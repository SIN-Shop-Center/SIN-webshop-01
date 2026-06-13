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

> **Update 2026-06-13:** Resend nutzt für Cloudflare **TXT-Records** (nicht CNAME) für DKIM. Das CNAME-Format in der alten Doku ist veraltet. Die genauen Werte für DKIM und MX müssen aus dem Resend-Dashboard kopiert werden (region-abhängig).

## Schritt-für-Schritt (manuell, 10 Min)

### 1. Resend-Dashboard: Domain hinzufügen / verifizieren

1. Login: https://resend.com/domains
2. Domain: `delqhi.com` → **Records** tab öffnen
3. Kopiere die exakten Werte für:
   - **MX** record auf `send`
   - **TXT** SPF record auf `send`
   - **TXT** DKIM record auf `resend._domainkey`

### 2. Cloudflare-DNS: Records hinzufügen

1. Login: https://dash.cloudflare.com → `delqhi.com` → DNS → Records → **Add Record**
2. DNS-Proxy auf **DNS only** (grauer Wolke) für alle 4 Records — sonst kann Resend sie nicht validieren.
3. Füge diese Records hinzu (ersetze Werte in Klammern mit denen aus Resend):

| Type | Name (Cloudflare) | Value / Target | TTL | Proxy | Action |
|------|-------------------|----------------|-----|-------|--------|
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` (aus Resend) | Auto | DNS only | Add |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` (aus Resend) | Auto | DNS only | Add |
| TXT | `resend._domainkey` | `p=...` (aus Resend kopieren) | Auto | DNS only | Add |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@delqhi.com;` | Auto | DNS only | Add |

**Hinweis:** Die Werte für MX und DKIM sind domain- und regionsspezifisch. Nicht raten — aus dem Resend-Dashboard kopieren.

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
