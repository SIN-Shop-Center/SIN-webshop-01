import json
import os
import time
from pathlib import Path

import requests
import secrets
import string

SCRIPT_DIR = Path(__file__).resolve().parent
ARTIFACT_DIR = SCRIPT_DIR / ".artifacts"
PAT_PATH = ARTIFACT_DIR / "pat.txt"
SECRETS_PATH = ARTIFACT_DIR / "project_secrets.json"
PAT = PAT_PATH.read_text(encoding="utf-8").strip()
ORG_ID = "gxoomsmyalpdzrhstesm"
NAME = "simone-webshop-01"

alphabet = string.ascii_letters + string.digits
generated_db_pass = "".join(secrets.choice(alphabet) for i in range(20))

print(f"Creating project {NAME}...")
res = requests.post(
    "https://api.supabase.com/v1/projects",
    headers={"Authorization": f"Bearer {PAT}"},
    json={
        "organization_id": ORG_ID,
        "name": NAME,
        "region": "eu-central-1",
        "plan": "free",
        "db_pass": generated_db_pass,
    },
)

if res.status_code != 201:
    print("Failed to create project:", res.status_code, res.text)
    if "free project limit" in res.text.lower():
        print("Hit free tier limit. Listing existing projects:")
        res = requests.get(
            "https://api.supabase.com/v1/projects",
            headers={"Authorization": f"Bearer {PAT}"},
        )
        for p in res.json():
            print(
                f"Existing project: {p['name']} (ref: {p['id']}, status: {p['status']})"
            )
        exit(1)
    exit(1)

project = res.json()
ref = project["id"]
print(f"Project created! Ref: {ref}")
print("Wait for project to become active...")

for _ in range(60):
    time.sleep(10)
    p_res = requests.get(
        f"https://api.supabase.com/v1/projects/{ref}",
        headers={"Authorization": f"Bearer {PAT}"},
    )
    if p_res.status_code == 200:
        p_status = p_res.json()["status"]
        print(f"Status: {p_status}")
        if p_status == "ACTIVE_HEALTHY":
            break
else:
    print("Project did not become active in time.")
    exit(1)

print("Project is active! Getting API keys...")
keys_res = requests.get(
    f"https://api.supabase.com/v1/projects/{ref}/api-keys",
    headers={"Authorization": f"Bearer {PAT}"},
)

keys = keys_res.json()
anon_key = next((k["api_key"] for k in keys if k["name"] == "anon"), None)
service_key = next((k["api_key"] for k in keys if k["name"] == "service_role"), None)

db_url = f"postgresql://postgres:{generated_db_pass}@db.{ref}.supabase.co:5432/postgres"
supa_url = f"https://{ref}.supabase.co"

if not anon_key or not service_key:
    raise RuntimeError("Supabase API did not return both required project keys.")

ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
SECRETS_PATH.write_text(
    json.dumps(
        {
            "SUPABASE_URL": supa_url,
            "DATABASE_URL": db_url,
            "SUPABASE_ANON_KEY": anon_key,
            "SUPABASE_SERVICE_ROLE_KEY": service_key,
        },
        indent=2,
    )
    + "\n",
    encoding="utf-8",
)
os.chmod(SECRETS_PATH, 0o600)
print(f"Project credentials saved to ignored local artifact: {SECRETS_PATH}")
