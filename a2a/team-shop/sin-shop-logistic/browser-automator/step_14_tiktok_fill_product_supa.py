import asyncio
import sys
import nodriver as uc
from pathlib import Path
import json
import os

PROFILE_DIR = "/Users/jeremy/dev/SIN-Solver/.worker_profiles/jeremy_runner"
ARTIFACTS_DIR = Path(".artifacts")
ARTIFACTS_DIR.mkdir(exist_ok=True)

# Wir lesen JSON-Daten (aus Supabase generiert) und füllen das Formular
PRODUCT_DATA_PATH = "product_data_to_upload.json"
INPUT_TITLE_ID = "#product_name_input"
SUBMIT_BTN = "button[data-e2e='submit-product']"

async def fill_form(page, data):
    title_input = await page.select(INPUT_TITLE_ID)
    if not title_input:
        await page.save_screenshot(ARTIFACTS_DIR / "error_step_14_no_title_input.png")
        raise Exception(f"DOM Check Failed: {INPUT_TITLE_ID} not found.")

    await title_input.send_keys(data['name'])
    await asyncio.sleep(1)
    
    # Hier kommen weitere Inputs: Price, Stock, Category (gemäß CJDropshipping mapping)
    
    submit_btn = await page.select(SUBMIT_BTN)
    if not submit_btn:
        await page.save_screenshot(ARTIFACTS_DIR / "error_step_14_no_submit_btn.png")
        raise Exception(f"DOM Check Failed: {SUBMIT_BTN} not found.")
        
    await submit_btn.click()
    await asyncio.sleep(3)
    await page.save_screenshot(ARTIFACTS_DIR / f"success_step_14_filled_{data['id']}.png")
    print(f"SUCCESS: Product {data['id']} filled and submitted.")

async def main():
    if not os.path.exists(PRODUCT_DATA_PATH):
        raise FileNotFoundError(f"{PRODUCT_DATA_PATH} not generated yet.")
        
    with open(PRODUCT_DATA_PATH, 'r') as f:
        products = json.load(f)
        
    try:
        browser = await uc.start(user_data_dir=PROFILE_DIR, headless=False)
        for p in products:
            page = await browser.get("https://seller-de.tiktok.com/product/add")
            await asyncio.sleep(5)
            await fill_form(page, p)
            
    except Exception as e:
        print(f"FAILED: {str(e)}", file=sys.stderr)
        sys.exit(1)
    finally:
        if 'browser' in locals():
            browser.stop()

if __name__ == '__main__':
    uc.loop().run_until_complete(main())
