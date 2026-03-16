import asyncio
import nodriver as uc

async def execute(page: uc.Tab):
    print("Navigating to CJDropshipping Login...")
    await page.get("https://cjdropshipping.com/login.html")
    await asyncio.sleep(5)
    # DOM Check
    html = await page.get_content()
    if "cj" not in html.lower():
        raise Exception("DOM Check Failed: CJDropshipping not found in HTML")
    print("DOM Check OK: Login page loaded")
