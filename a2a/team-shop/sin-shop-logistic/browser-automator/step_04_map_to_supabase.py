import json
import os
import re
import urllib.request
import nodriver as uc


def _slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")[:64] or "item"


async def execute(page: uc.Tab):
    print("Mapping 5 products to Supabase...")
    supabase_url = (os.environ.get("SUPABASE_URL") or "").strip().rstrip("/")
    supabase_key = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    if not supabase_url or not supabase_key:
        raise Exception("missing_env:SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

    with open("extracted_products.json", "r", encoding="utf-8") as f:
        products = json.load(f)

    payload = []
    for p in products:
        title = str(p.get("title") or "").strip()
        if not title:
            continue
        payload.append(
            {
                "name": title,
                "slug": _slugify(title),
                "price": float(p.get("price") or 0),
                "images": [p["image"]] if p.get("image") else [],
                "metadata": {"supplier": "cjdropshipping", "source_url": p.get("href")},
            }
        )
    if len(payload) < 1:
        raise Exception("mapping_payload_empty")

    url = f"{supabase_url}/rest/v1/products"
    req = urllib.request.Request(url, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("apikey", supabase_key)
    req.add_header("Authorization", f"Bearer {supabase_key}")
    req.add_header("Prefer", "return=minimal, resolution=merge-duplicates")
    body = json.dumps(payload, ensure_ascii=True).encode("utf-8")
    with urllib.request.urlopen(req, data=body) as resp:
        if resp.status < 200 or resp.status >= 300:
            raise Exception(f"supabase_insert_failed:http_{resp.status}")
    print(f"Mapping OK: inserted {len(payload)} products")
