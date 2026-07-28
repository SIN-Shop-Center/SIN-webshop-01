# ShopSIN Commerce Worker auf macOS

Die beiden launchd-Jobs halten den lokalen Queue-Worker dauerhaft am Laufen und planen jeden Tag um 06:15 Uhr lokaler Mac-Zeit genau einen deduplizierten Tageslauf ein.

## Voraussetzungen

1. `SIN-webshop-01/.env.local` enthält die benötigten Supabase-, CJ-, TikTok- und Research-Zugangsdaten.
2. Die Migration `platform/infra/supabase/migrations/20260722000000_commerce_control_plane.sql` ist angewendet.
3. Node.js und die Projektabhängigkeiten sind installiert.
4. `/Users/jeremy/dev/OpenMontage` ist vorhanden und lauffähig.

## Installation

```bash
mkdir -p ~/Library/LaunchAgents
cp /Users/jeremy/dev/SIN-webshop-01/platform/deploy/launchd/com.shopsin.commerce-worker.plist ~/Library/LaunchAgents/
cp /Users/jeremy/dev/SIN-webshop-01/platform/deploy/launchd/com.shopsin.commerce-daily.plist ~/Library/LaunchAgents/

launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.shopsin.commerce-worker.plist 2>/dev/null || true
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.shopsin.commerce-daily.plist 2>/dev/null || true

launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.shopsin.commerce-worker.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.shopsin.commerce-daily.plist
```

## Kontrolle

```bash
launchctl print gui/$(id -u)/com.shopsin.commerce-worker
launchctl print gui/$(id -u)/com.shopsin.commerce-daily

tail -f /tmp/shopsin-commerce-worker.log
tail -f /tmp/shopsin-commerce-worker.error.log
```

## Manuelle Läufe

```bash
cd /Users/jeremy/dev/SIN-webshop-01
pnpm pipeline:enqueue-daily
pnpm pipeline:once
```

## Deinstallation

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.shopsin.commerce-worker.plist
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.shopsin.commerce-daily.plist
rm ~/Library/LaunchAgents/com.shopsin.commerce-worker.plist
rm ~/Library/LaunchAgents/com.shopsin.commerce-daily.plist
```

## Sicherheitsmodell

- Queue-Payloads können keine Shell-Kommandos einschleusen; der Worker führt ausschließlich eine feste Allowlist aus.
- Neue Produkte bleiben standardmäßig inaktiv.
- OpenMontage, Produktdaten, GPSR und direkte Social-Kommunikation besitzen Freigabe-Gates.
- Fake-Likes, Follow-Bots, unkontrollierte Kommentare und Massen-DMs sind nicht Teil des Systems.
