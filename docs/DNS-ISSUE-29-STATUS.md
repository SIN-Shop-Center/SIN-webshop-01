# Issue #29 — DNS Fix Status

**Status:** 🟡 Partially applied, 🟠 Edge routing still broken

## Was passiert ist

Der DNS-Record `supabase.delqhi.com` wurde via Cloudflare API umgebogen:
- **Vorher:** `18755eb9-...cfargotunnel.com` (Tunnel `sin-solver-infrastructure`, war DOWN)
- **Nachher:** `fb25fb11-...cfargotunnel.com` (Tunnel `simone-api`, healthy)

**Config-Settings:** `proxied: false` (DNS only / graue Wolke), `ttl: 1` (Auto).

## Was funktioniert

- ✅ DNS-Resolve von überall: zeigt auf den richtigen Tunnel
- ✅ Cloudflare-API zeigt: Tunnel-Config hat `supabase.delqhi.com → 172.20.0.76:8000`
- ✅ `cloudflared` läuft auf der VM, 4 Connections, healthy
- ✅ Kong-Service auf 172.20.0.76:8000 ist intern erreichbar

## Was nicht funktioniert

- ❌ `https://supabase.delqhi.com/` antwortet mit 8s-Timeout (kein Connect)
- ❌ Der Cloudflare-Edge routet `supabase.delqhi.com` NICHT durch den Tunnel
- ❌ Worker → Supabase schlägt fehl: `{"status":"degraded","db":"down"}`

## Diagnose

Im Gegensatz zu `shopsin.delqhi.com/*` (das einen **Worker Route** hat und funktioniert)
hat `supabase.delqhi.com` nur einen DNS-CNAME — und der Cloudflare-Edge **ignoriert**
CNAME-zu-Tunnel-Routen ohne explizite Worker-Route.

Vermutlich ein Free-Plan-Limit oder ein Edge-Cache-Issue, das nur durch
einen Cloudflare-Support-Ticket oder einen Worker-Route gefixt werden kann.

## Workarounds (zu prüfen)

1. **Worker-Route hinzufügen** für `supabase.delqhi.com/*` → `shopsin-storefront`,
   mit Reverse-Proxy-Logik im Worker
2. **Service-Binding** im Worker, der `simone-api` direkt anspricht (statt HTTP)
3. **Cloudflare Tunnel Credentials refreshen** — der Tunnel wurde vor 12 Min neu
   gestartet, aber Edge hat die Routes nicht aktualisiert
4. **Cloudflare Support kontaktieren** mit Verweis auf das Edge-Routing-Problem

## Cloudflare API-Calls die durchgeführt wurden

```bash
# DNS korrigiert
curl -X PATCH ".../dns_records/944f16f50b6914e63fb5f394a5a19344" \
  --data '{"type":"CNAME","name":"supabase","content":"fb25fb11-...cfargotunnel.com","proxied":false}'

# Tunnel neu gestartet auf der VM
ssh ubuntu@92.5.60.87 "pkill -f cloudflared; nohup /usr/local/bin/cloudflared tunnel run simone-api &"

# Cloudflare Edge geprüft (Token muss Zone-Resource haben)
curl ".../zones/.../dns_records?name=supabase.delqhi.com&match=all"
```
