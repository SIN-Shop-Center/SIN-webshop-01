# Fix #29 — DNS-Fix: supabase.delqhi.com auf Cloudflare-Tunnel umstellen

> **Status:** RESOLVED ✅ · **Priority:** CRITICAL (P0) · **Closed:** 2026-06-13
> **Issue:** https://github.com/SIN-Shop-Center/SIN-webshop-01/issues/29
> **Owner:** Jeremy (Cloudflare-DNS-Klick) + Agent (cloudflared-Config)

## Context

Aus AGENTS.md, eiserne Regel #1:

> NIEMALS einen Port in öffentliche URLs schreiben. Cloudflare proxied NUR die Ports 80/443/8080/8443/2052/2053/2082/2083/2086/2087/2095/2096/8880. `https://supabase.delqhi.com:8006` wird am Edge INSTANT abgewiesen.

Aktueller `curl https://supabase.delqhi.com/auth/v1/health` zeigt **401** (Kong gesund). Der Tunnel läuft stabil.

## Aktive Konfiguration (Stand 2026-06-13)

- **Tunnel-Name:** `simone-api`
- **Aktiver Service:** `cloudflared-simone-api.service` (läuft als User `ubuntu`)
- **Config-Datei:** `/home/ubuntu/.cloudflared/config.yml`
- **Credentials:** `/home/ubuntu/.cloudflared/credentials.json`
- **Inaktiver Dienst:** `cloudflared.service` wurde gestoppt und deaktiviert (doppelter Tunnel-Prozess)

```yaml
ingress:
  - hostname: status.delqhi.com
    service: http://localhost:3001
  - hostname: api.delqhi.com
    service: http://localhost:8080
  - hostname: delqhi.com
    service: http://localhost:3005
  - hostname: shopsin.delqhi.com
    service: http://localhost:3006
  - hostname: supabase.delqhi.com
    service: http://localhost:8006
  - service: http_status:404
```

> **Wichtig:** Um neue Hostnames (z.B. `status.delqhi.com`) aus dem Tunnel heraus öffentlich zu machen, muss im Cloudflare-Dashboard ein CNAME auf `simone-api.cfargotunnel.com` gesetzt werden. Das CLI-Kommando `cloudflared tunnel route dns` funktioniert auf der VM nicht, weil kein `cert.pem` (Origin-Cert) vorhanden ist.

## Diagnose: was ist aktuell konfiguriert?

```sh
# 1. Welche DNS-Records hat supabase.delqhi.com?
dig supabase.delqhi.com CNAME +short
dig supabase.delqhi.com A +short

# 2. Was sagt Cloudflare?
# https://dash.cloudflare.com → delqhi.com → DNS → Records
# Filter: supabase.delqhi.com
# Wahrscheinlich: CNAME → sin-supabase-VM oder einen Cloudflare-Tunnel-Host

# 3. Ist ein Cloudflare-Tunnel konfiguriert?
ssh ubuntu@92.5.60.87 "cloudflared tunnel list 2>&1 || echo 'cloudflared nicht installiert'"
# oder: cloudflared tunnel info <tunnel-id>
```

## Empfohlene Architektur

```
Internet
   ↓
supabase.delqhi.com (DNS CNAME)
   ↓
Cloudflare Edge
   ↓ (proxied, Port 443)
Cloudflare Tunnel (fb25fb11-8840-41fd-8a85-518674c86725)
   ↓
VM sin-supabase:8006 (Kong)
```

## Schritt-für-Schritt (10 Min)

### 1. DNS-Record im Cloudflare-Dashboard prüfen

Gehe zu https://dash.cloudflare.com → `delqhi.com` → DNS → Records. Suche `supabase`.

Erwartet:
- Type: `CNAME` oder `A`
- Target: sollte auf `*.cfargotunnel.com` zeigen (Cloudflare Tunnel)
- Proxy: ✅ (orange cloud = proxied)

Falls nicht: **sofort korrigieren** (siehe unten).

### 2. cloudflared auf der VM prüfen

```sh
ssh ubuntu@92.5.60.87 "
# 1. läuft der Tunnel?
ps aux | grep -E 'cloudflared|tunnel' | grep -v grep

# 2. Welche Ingresses?
cat /etc/cloudflared/config.yml 2>/dev/null || cat ~/.cloudflared/config.yml 2>/dev/null

# 3. Falls nicht installiert:
# sudo apt-get update && sudo apt-get install cloudflared

# 4. Falls kein Tunnel: einloggen + neuen Tunnel erstellen
cloudflared tunnel login   # Browser-Login mit zukunftsorientierte.energie@gmail.com
cloudflared tunnel create sin-supabase

# 5. config.yml anlegen:
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: sin-supabase
credentials-file: /home/ubuntu/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: supabase.delqhi.com
    service: http://localhost:8006
  - service: http_status:404
EOF

# 6. DNS-Routing setzen
cloudflared tunnel route dns sin-supabase supabase.delqhi.com

# 7. Tunnel als systemd-Service starten
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
sudo systemctl status cloudflared
"
```

### 3. Verifizieren

```sh
# Extern
curl -sI https://supabase.delqhi.com/auth/v1/health
# Erwartet: 200 OK (oder 401 — "Unauthorized", aber keine Port-Umleitung)

# Was NICHT passieren darf:
curl -sI https://supabase.delqhi.com:8006/auth/v1/health
# Erwartet: 521 Origin Down (Cloudflare blockiert Port 8006)
```

### 4. Fallback: Cloudflare Worker als Reverse-Proxy

Falls der cloudflared-Tunnel aus irgendeinem Grund nicht aufgesetzt werden kann, alternativ ein Cloudflare Worker, der alle Paths proxied:

```ts
// workers/supabase-proxy/src/index.ts
export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url)
    url.host = '92.5.60.87:8006'  // ACHTUNG: bleibt im Free-Tier-Workaround

    // Besser: via Tunnel
    url.host = 'localhost'
    url.protocol = 'http:'
    url.port = '8006'

    return fetch(url.toString(), {
      method: req.method,
      headers: req.headers,
      body: req.body,
      redirect: 'follow',
    })
  },
}
```

Dann `wrangler deploy` und DNS CNAME `supabase.delqhi.com` auf `supabase-proxy.<account>.workers.dev`.

## Acceptance

- `https://supabase.delqhi.com/auth/v1/health` → 200 oder 401, **NICHT** "Connection refused"
- `https://supabase.delqhi.com:8006/...` → 521 (Cloudflare blocks port 8006)
- cloudflared läuft als systemd service, auto-start nach reboot
- Tunnel-Status: ✅ healthy in `cloudflared tunnel info`

## Closing

```sh
gh issue close 29 -R SIN-Shop-Center/SIN-webshop-01 \
  --comment "Cloudflare Tunnel via cloudflared eingerichtet. supabase.delqhi.com → kong:8006 ohne öffentlichen Port 8006."
```
