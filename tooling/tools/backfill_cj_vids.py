#!/usr/bin/env python3
"""Backfill cj_vid (variant ID) into shop.products.metadata for CJ order creation."""

import json
import os
import subprocess
import sys
import tempfile
import time

CLI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cj-cli.py")
SSH_KEY = os.path.expanduser("~/.ssh/id_ed25519")
VM = "ubuntu@92.5.60.87"


def ssh_cmd(cmd):
    return subprocess.run(
        ["ssh", "-i", SSH_KEY, VM, cmd],
        capture_output=True, text=True, timeout=30
    )


def get_variants(pid):
    try:
        result = subprocess.run(
            ["python3", CLI, "product", "variants", "--pid", str(pid)],
            capture_output=True, text=True, timeout=30
        )
        data = json.loads(result.stdout)
        if data.get("code") == 200 and data.get("data"):
            return data["data"]
    except Exception as e:
        print(f"  ERROR pid={pid}: {e}", file=sys.stderr)
    return []


def main():
    r = ssh_cmd("docker exec supabase-db psql -U supabase_admin -d postgres -t -A -c \"SELECT (id || '|' || sku || '|' || COALESCE(metadata->>'cj_pid','')) FROM shop.products WHERE metadata->>'cj_pid' IS NOT NULL AND metadata->>'cj_vid' IS NULL\"")
    rows = [line.split("|") for line in r.stdout.strip().split("\n") if line and "|" in line]
    print(f"Found {len(rows)} products needing cj_vid backfill")

    sql_lines = []
    for i, (product_id, sku, cj_pid) in enumerate(rows):
        if not cj_pid:
            continue
        print(f"[{i+1}/{len(rows)}] {sku} (pid={cj_pid})...", end=" ", flush=True)
        variants = get_variants(cj_pid)
        if not variants:
            print("NO VARIANTS")
            continue

        v = variants[0]
        vid = v["vid"]
        vsku = v.get("variantSku", "").replace("'", "''")
        vname = v.get("variantNameEn", v.get("variantKey", "")).replace("'", "''")

        sql_lines.append(
            f"UPDATE shop.products SET metadata = "
            f"jsonb_set(jsonb_set(jsonb_set(metadata, "
            f"'{{\"cj_vid\"}}', '\"{vid}\"'), "
            f"'{{\"cj_variant_sku\"}}', '\"{vsku}\"'), "
            f"'{{\"cj_variant_name\"}}', '\"{vname}\"') "
            f"WHERE id = '{product_id}';"
        )
        print(f"vid={vid}")
        time.sleep(1.1)

    if not sql_lines:
        print("Nothing to update")
        return

    sql = "\n".join(sql_lines)
    with tempfile.NamedTemporaryFile(mode="w", suffix=".sql", delete=False) as f:
        f.write(sql)
        tmp = f.name

    subprocess.run(["scp", "-i", SSH_KEY, tmp, f"{VM}:/tmp/backfill_vids.sql"], capture_output=True, timeout=15)
    r2 = ssh_cmd("docker cp /tmp/backfill_vids.sql supabase-db:/tmp/backfill_vids.sql && docker exec supabase-db psql -U supabase_admin -d postgres -f /tmp/backfill_vids.sql")
    print(r2.stdout)
    if r2.returncode == 0:
        print(f"SUCCESS: {len(sql_lines)} products updated")
    else:
        print(f"FAILED: {r2.stderr}")
    os.unlink(tmp)


if __name__ == "__main__":
    main()
