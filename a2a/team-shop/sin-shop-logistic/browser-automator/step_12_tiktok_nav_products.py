import asyncio
import sys
import os
import nodriver as uc
from pathlib import Path

# Paths
PROFILE_DIR = "/Users/jeremy/dev/SIN-Solver/.worker_profiles/jeremy_runner"
ARTIFACTS_DIR = Path(".artifacts")
ARTIFACTS_DIR.mkdir(exist_ok=True)

# Selectors
MENU_PRODUCTS_ID = "#Nav_Products"
MENU_MANAGE_PRODUCTS_ID = "#Nav_ManageProducts"
ADD_PRODUCT_BTN = "button[data-e2e='add-new-product']"

async def main():
    try:
        browser = await uc.start(user_data_dir=PROFILE_DIR, headless=False)
        # 1. Gehe zum Dashboard
        page = await browser.get('https://seller-de.tiktok.com/dashboard')
        await asyncio.sleep(5)
        
        # 2. DOM Check: Ist Products Menu da?
        products_menu = await page.select(MENU_PRODUCTS_ID)
        if not products_menu:
            await page.save_screenshot(ARTIFACTS_DIR / "error_step_12_no_products_menu.png")
            raise Exception(f"DOM Check Failed: {MENU_PRODUCTS_ID} not found.")
            
        await products_menu.click()
        await asyncio.sleep(2)
        
        # 3. DOM Check: Manage Products / Add Product
        add_product = await page.select(ADD_PRODUCT_BTN)
        if not add_product:
            await page.save_screenshot(ARTIFACTS_DIR / "error_step_12_no_add_btn.png")
            raise Exception(f"DOM Check Failed: {ADD_PRODUCT_BTN} not found.")
            
        # 4. Success Screenshot
        await page.save_screenshot(ARTIFACTS_DIR / "success_step_12_nav_products.png")
        print("SUCCESS: Navigated to products page")
        
    except Exception as e:
        print(f"FAILED: {str(e)}", file=sys.stderr)
        sys.exit(1)
    finally:
        if 'browser' in locals():
            browser.stop()

if __name__ == '__main__':
    uc.loop().run_until_complete(main())
