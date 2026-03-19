import asyncio, nodriver as uc
from pathlib import Path
from _secrets import get_email, get_password

ARTIFACTS = Path(__file__).parent / ".artifacts"
EMAIL = get_email()
PASSWORD = get_password()


async def _fill(inp, text: str) -> None:
    await inp.click()
    await asyncio.sleep(0.3)
    await inp.select_all()
    await inp.key_press("Backspace")
    await asyncio.sleep(0.2)
    await inp.send_keys(text)


async def execute(page: uc.Tab):
    print("Filling TikTok credentials...")
    try:
        inputs = await page.select_all(
            "input[type=text], input[type=email], input:not([type]), input[type=password]"
        )
        for i in inputs:
            t = (i.attrs or {}).get("type", "text").lower()
            ph = (i.attrs or {}).get("placeholder", "").lower()
            if t in ("text", "email", "") and not (t == "password"):
                await _fill(i, EMAIL)
                break
        for i in inputs:
            t = (i.attrs or {}).get("type", "").lower()
            if t == "password":
                await _fill(i, PASSWORD)
                break

        btn = await page.find("Anmelden", best_match=True)
        await btn.click()
        await asyncio.sleep(5)
    except Exception as e:
        await page.save_screenshot(str(ARTIFACTS / "step08_error.png"))
        raise Exception(f"step08_error: {e}")
    await page.save_screenshot(str(ARTIFACTS / "step08_success.png"))
    print("DOM Check OK: Credentials submitted.")
