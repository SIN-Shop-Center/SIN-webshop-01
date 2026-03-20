import asyncio
import sys
import nodriver as uc
from pathlib import Path

PROFILE_DIR = "/Users/jeremy/dev/SIN-Solver/.worker_profiles/jeremy_runner"
ARTIFACTS_DIR = Path(".artifacts")
ARTIFACTS_DIR.mkdir(exist_ok=True)

ADD_PRODUCT_URL = "https://seller-de.tiktok.com/product/add"
INPUT_TITLE_ID = "#product_name_input"
INPUT_CATEGORY_SEARCH = "#category_search_input"

async def main():
    try:
        browser = await uc.start(user_data_dir=PROFILE_DIR, headless=False)
        page = await browser.get(ADD_PRODUCT_URL)
        await asyncio.sleep(5)
        
        # 1. DOM Check: Formular geladen?
        title_input = await page.select(INPUT_TITLE_ID)
        if not title_input:
            await page.save_screenshot(ARTIFACTS_DIR / "error_step_13_no_title_input.png")
            raise Exception(f"DOM Check Failed: {INPUT_TITLE_ID} not found. Not on Add Product page?")
            
        category_search = await page.select(INPUT_CATEGORY_SEARCH)
        if not category_search:
            await page.save_screenshot(ARTIFACTS_DIR / "error_step_13_no_category_input.png")
            raise Exception(f"DOM Check Failed: {INPUT_CATEGORY_SEARCH} not found.")

        # 2. Success Screenshot (Formular bereit für Befüllung)
        await page.save_screenshot(ARTIFACTS_DIR / "success_step_13_add_form_ready.png")
        print("SUCCESS: Add Product form is ready")
        
    except Exception as e:
        print(f"FAILED: {str(e)}", file=sys.stderr)
        sys.exit(1)
    finally:
        if 'browser' in locals():
            browser.stop()

if __name__ == '__main__':
    uc.loop().run_until_complete(main())
