import asyncio
import json
import os
import nodriver as uc
from pathlib import Path

PROFILE = os.environ.get(
    "CHROME_PROFILE_DIR", "/Users/jeremy/dev/SIN-Solver/.worker_profiles/jeremy_runner"
)
ARTIFACTS = Path(__file__).parent / ".artifacts"


async def execute(page: uc.Tab):
    print("Navigating to TikTok Seller Center (Product Upload)...")
    await page.get("https://seller-de.tiktok.com/product/add")
    await asyncio.sleep(5)

    html = (await page.get_content()).lower()
    if "login" in html or "log in" in html or "sign in" in html:
        await page.save_screenshot(str(ARTIFACTS / "tiktok_login_required.png"))
        raise Exception(
            "tiktok_login_required: manual login needed for jeremy_runner profile"
        )

    try:
        title_input = await page.find("Product Name", best_match=True)
        print("DOM Check OK: TikTok Shop 'Add Product' surface detected.")
    except Exception as e:
        await page.save_screenshot(str(ARTIFACTS / "tiktok_dom_error.png"))
        raise Exception("tiktok_dom_error: could not find product upload fields")

    with open("extracted_products.json", "r", encoding="utf-8") as f:
        products = json.load(f)

    print(f"Ready to push {len(products)} products into TikTok Seller Center.")
    await page.save_screenshot(str(ARTIFACTS / "tiktok_upload_ready.png"))
    print("[OK] TikTok Push Step completed (Reached Upload Gate).")


if __name__ == "__main__":

    async def main():
        b = await uc.start(headless=False, user_data_dir=PROFILE)
        tab = await b.get("about:blank")
        try:
            await execute(tab)
        finally:
            b.stop()

    uc.loop().run_until_complete(main())
