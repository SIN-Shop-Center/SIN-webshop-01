import os, sys, json
from google.oauth2 import service_account
from googleapiclient.discovery import build

CREDS_FILE = os.path.expanduser("~/.config/google/service_account.json")
DOC_ID = "1RtoHn4I0GntuEEOHHkqoh_dMuGzgMwQz7_8oxAOpQbw"
TAB_ID = "t.sxvfaomy910j"

creds = service_account.Credentials.from_service_account_file(
    CREDS_FILE,
    scopes=["https://www.googleapis.com/auth/documents"]
)
svc = build("docs", "v1", credentials=creds)

doc = svc.documents().get(documentId=DOC_ID, includeTabsContent=True).execute()

def find_tab(tabs, target_id):
    for tab in tabs:
        if tab.get("tabProperties", {}).get("tabId") == target_id:
            return tab
        child = find_tab(tab.get("childTabs", []), target_id)
        if child: return child
    return None

tab = find_tab(doc.get("tabs", []), TAB_ID)
if not tab:
    print(f"Tab {TAB_ID} not found!")
    sys.exit(1)

content = tab.get("documentTab", {}).get("body", {}).get("content", [])
start_idx = 1
end_idx = 1
if len(content) > 1:
    last_el = content[-1]
    if "paragraph" in last_el:
        end_idx = last_el["endIndex"] - 1
    elif "table" in last_el:
        end_idx = last_el["endIndex"] - 1

reqs = []

# Delete old content
if end_idx > start_idx:
    reqs.append({
        "deleteContentRange": {
            "range": {
                "startIndex": start_idx,
                "endIndex": end_idx,
                "tabId": TAB_ID
            }
        }
    })

# Notion style definitions
BG_HEX = {"red": 0.96, "green": 0.96, "blue": 0.96} # Gray 100
BORDER_HEX = {"red": 0.4, "green": 0.4, "blue": 0.4} # Gray 600

# Insert new content
new_text = (
    "A2A - SIN-Shop-Logistic\n\n"
    "Der spezialisierte Logistik- und Dropshipping-Agent für Simone Webshop.\n\n"
    "Funktionen:\n"
    "1. Free Dropshipping-Lieferanten automatisiert suchen und registrieren (Profil: Jeremy)\n"
    "2. Automatisierte Integration der 5 lukrativsten Produkte in die Webshop API\n"
    "3. Synchrone Ausspielung an SIN-TikTok-Shop (A2A Handoff)\n\n"
    "Architektur:\n"
    "Der Agent nutzt Browser-Automatisierung mit Micro-Python-Skripten (max. 30 Zeilen).\n"
    "Nach jedem Step wird ein Screenshot + DOM-Check ausgeführt.\n"
    "Der Agent ist als 'self-hackable-healing-agent' konzipiert, der bei Fehlern "
    "LLM-gesteuert seinen eigenen Python-Code on-the-fly repariert.\n\n"
    "Team: Shop\n"
    "Repo: a2a/team-shop/sin-shop-logistic\n"
)

reqs.append({
    "insertText": {
        "location": {
            "index": start_idx,
            "tabId": TAB_ID
        },
        "text": new_text
    }
})

# Format the first line as Title
reqs.append({
    "updateParagraphStyle": {
        "range": {
            "startIndex": start_idx,
            "endIndex": start_idx + len("A2A - SIN-Shop-Logistic\n"),
            "tabId": TAB_ID
        },
        "paragraphStyle": {
            "namedStyleType": "HEADING_1"
        },
        "fields": "namedStyleType"
    }
})

# Format the Architektur section as a Notion-style callout block
arch_start = new_text.find("Architektur:")
arch_end = new_text.find("Team: Shop") - 1
if arch_start != -1 and arch_end != -1:
    reqs.append({
        "updateParagraphStyle": {
            "range": {
                "startIndex": start_idx + arch_start,
                "endIndex": start_idx + arch_end,
                "tabId": TAB_ID
            },
            "paragraphStyle": {
                "shading": {"backgroundColor": {"color": {"rgbColor": BG_HEX}}},
                "borderLeft": {
                    "color": {"color": {"rgbColor": BORDER_HEX}},
                    "width": {"magnitude": 3, "unit": "PT"},
                    "padding": {"magnitude": 12, "unit": "PT"},
                    "dashStyle": "SOLID"
                },
                "indentStart": {"magnitude": 24, "unit": "PT"}
            },
            "fields": "shading,borderLeft,indentStart"
        }
    })

svc.documents().batchUpdate(
    documentId=DOC_ID,
    body={"requests": reqs}
).execute()

print("Google Docs Tab updated successfully!")
