import asyncio, nodriver as uc
from pathlib import Path
ARTIFACTS = Path(__file__).parent / ".artifacts"

async def execute(page: uc.Tab):
    print("Navigating to TikTok Seller Login...")
    await page.get("https://seller-de-accounts.tiktok.com/account/login")
    await asyncio.sleep(5)
    try:
        html = (await page.get_content()).lower()
        if "dashboard" in html:
            print("DOM Check OK: Already logged in.")
            return

        btn = await page.find("Mit E-Mail anmelden", best_match=True)
        if btn:
            await btn.click()
            print("DOM Check OK: Clicked 'Mit E-Mail anmelden'")
            await asyncio.sleep(2)
        else:
            raise Exception("Button 'Mit E-Mail anmelden' not found")
    except Exception as e:
        await page.save_screenshot(str(ARTIFACTS / "step07_error.png"))
        raise Exception(f"step07_error: {e}")

    await page.save_screenshot(str(ARTIFACTS / "step07_success.png"))
