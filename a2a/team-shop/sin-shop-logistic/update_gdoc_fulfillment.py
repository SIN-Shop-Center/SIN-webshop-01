import os, sys, json
from google.oauth2 import service_account
from googleapiclient.discovery import build

CREDS_FILE = os.path.expanduser("~/.config/google/service_account.json")
DOC_ID = "1RtoHn4I0GntuEEOHHkqoh_dMuGzgMwQz7_8oxAOpQbw"
TAB_ID = "t.4ldzbgjj6taf" # Team Shop tab or an overview tab

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

# Check if a fulfillment tab exists, else create or append to the shop tab
tab = find_tab(doc.get("tabs", []), TAB_ID)
if not tab:
    print(f"Tab {TAB_ID} not found!")
    sys.exit(1)

content = tab.get("documentTab", {}).get("body", {}).get("content", [])
start_idx = content[-1]["endIndex"] - 1 if len(content) > 1 else 1

reqs = []
BG_HEX = {"red": 0.9, "green": 0.95, "blue": 1.0} 
BORDER_HEX = {"red": 0.2, "green": 0.5, "blue": 0.8}

new_text = (
    "\n\nORDER FULFILLMENT & DROPSHIPPING ARCHITECTURE\n"
    "1. CJDropshipping Integration:\n"
    "   - SIN-Shop-Logistic sucht stündlich die Top 5 Trending Products\n"
    "   - Auto-Import in Supabase mit Pricing-Kalkulation (EK + Marge = VK)\n"
    "   - Webhook lauscht auf out-of-stock Events und schaltet Produkte im Frontend offline\n\n"
    "2. Order Routing:\n"
    "   - Stripe Webhook (checkout.session.completed) setzt Status auf 'paid'\n"
    "   - Fulfillment Service routet Line-Items via JSON-RPC A2A an Lieferanten (CJ)\n"
    "   - Kunde erhält automatische Resend E-Mail\n\n"
    "3. TikTok Shop Sync:\n"
    "   - SIN-Shop-Logistic triggert SIN-TikTok-Shop (A2A JSON-RPC)\n"
    "   - Neue Produkte werden sofort über die TikTok Shop API als Listings veröffentlicht\n"
    "   - Asset Bank erstellt aus Vorlagen dynamisch Kurz-Videos inkl. WasmTtsEngine Voiceover\n"
    "   - SIN-TikTok postet die Videos samt eingebetteten Affiliate-Links ins Netzwerk\n"
)

reqs.append({
    "insertText": {
        "location": {"index": start_idx, "tabId": TAB_ID},
        "text": new_text
    }
})

reqs.append({
    "updateParagraphStyle": {
        "range": {
            "startIndex": start_idx + 2,
            "endIndex": start_idx + 2 + len("ORDER FULFILLMENT & DROPSHIPPING ARCHITECTURE\n"),
            "tabId": TAB_ID
        },
        "paragraphStyle": {"namedStyleType": "HEADING_2"},
        "fields": "namedStyleType"
    }
})

reqs.append({
    "updateParagraphStyle": {
        "range": {
            "startIndex": start_idx + 2 + len("ORDER FULFILLMENT & DROPSHIPPING ARCHITECTURE\n"),
            "endIndex": start_idx + len(new_text) - 1,
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

print("Google Docs SSOT Fulfillment architecture updated!")
