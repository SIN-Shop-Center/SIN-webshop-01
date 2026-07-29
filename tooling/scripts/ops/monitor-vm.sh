#!/usr/bin/env bash
# Purpose: SSH-based VM monitoring for Supabase host (92.5.60.87)
# Docs: docs/RUNBOOK-MONITORING.md
#
# Usage: ./monitor-vm.sh [VM_HOST]
# Default VM_HOST=root@92.5.60.87
# Output: JSON status report to stdout
set -euo pipefail

VM_HOST="${1:-root@92.5.60.87}"
REQUIRED_CONTAINERS="supabase-db supabase-kong supabase-auth supabase-rest supabase-storage supabase-realtime supabase-studio"

ssh_exec() { ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "$VM_HOST" "$1"; }

# ── VM connectivity ──────────────────────────
if ! ssh_exec "echo ok" >/dev/null 2>&1; then
  echo '{"status":"critical","error":"SSH connection failed","host":"'"$VM_HOST"'","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}'
  exit 1
fi

# ── Docker containers ────────────────────────
container_status=()
all_running=true
for c in $REQUIRED_CONTAINERS; do
  state=$(ssh_exec "docker inspect -f '{{.State.Status}}' $c 2>/dev/null" || echo "missing")
  if [ "$state" != "running" ]; then
    all_running=false
    container_status+=("\"$c\":\"$state\"")
  else
    container_status+=("\"$c\":\"running\"")
  fi
done
containers_json=$(IFS=,; echo "${container_status[*]}")

# ── Disk space ───────────────────────────────
disk_line=$(ssh_exec "df / | tail -1")
disk_pct=$(echo "$disk_line" | awk '{print $5}' | tr -d '%')
disk_status="ok"
if [ "$disk_pct" -ge 90 ]; then disk_status="critical"
elif [ "$disk_pct" -ge 80 ]; then disk_status="warning"; fi

# ── Memory ──────────────────────────────────
mem_pct=$(ssh_exec "free | awk '/Mem:/ {printf \"%.0f\", \$3/\$2 * 100}'")
mem_status="ok"
if [ "$mem_pct" -ge 90 ]; then mem_status="critical"
elif [ "$mem_pct" -ge 80 ]; then mem_status="warning"; fi

# ── CPU load ─────────────────────────────────
load1=$(ssh_exec "cat /proc/loadavg | awk '{print \$1}'")
cpus=$(ssh_exec "nproc")
cpu_status="ok"
# compare load1 (float) vs nproc (int) — use awk for float math
cpu_over=$(awk "BEGIN { print ($load1 > $cpus) ? 1 : 0 }")
cpu_warn=$(awk "BEGIN { print ($load1 > $cpus * 0.8) ? 1 : 0 }")
if [ "$cpu_over" = "1" ]; then cpu_status="critical"
elif [ "$cpu_warn" = "1" ]; then cpu_status="warning"; fi

# ── Supabase API health ─────────────────────
api_status="ok"
api_detail=""
api_check=$(ssh_exec "curl -s -o /dev/null -w '%{http_code}' http://localhost:8006/auth/v1/health" 2>/dev/null || echo "000")
if [ "$api_check" != "200" ] && [ "$api_check" != "401" ]; then
  api_status="down"
  api_detail="HTTP $api_check"
fi

# ── Overall status ──────────────────────────
overall="ok"
for s in "$disk_status" "$mem_status" "$cpu_status" "$api_status"; do
  if [ "$s" = "critical" ]; then overall="critical"; break; fi
  if [ "$s" = "warning" ] || [ "$s" = "down" ]; then [ "$overall" != "critical" ] && overall="degraded"; fi
done
[ "$all_running" = "false" ] && [ "$overall" = "ok" ] && overall="degraded"

# ── Output JSON ─────────────────────────────
cat <<EOF
{
  "status": "$overall",
  "host": "$VM_HOST",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "containers": {$containers_json},
  "disk": {"percent": $disk_pct, "status": "$disk_status"},
  "memory": {"percent": $mem_pct, "status": "$mem_status"},
  "cpu": {"load1": $load1, "cpus": $cpus, "status": "$cpu_status"},
  "supabase_api": {"status": "$api_status"$([ -n "$api_detail" ] && echo ", \"detail\": \"$api_detail\"")}
}
EOF
