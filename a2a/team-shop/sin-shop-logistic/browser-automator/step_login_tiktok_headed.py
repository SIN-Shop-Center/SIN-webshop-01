import asyncio
from pathlib import Path
import nodriver as uc
from _secrets import get_chrome_profile_dir, get_email, get_password

PROFILE = get_chrome_profile_dir()
EMAIL = get_email()
PASSWORD = get_password()
ARTIFACT_DIR = Path(__file__).parent / ".artifacts"


def clean_locks(p: str) -> None:
    for s in Path(p).rglob("Singleton*"):
        try:
            s.unlink()
        except OSError:
            pass


async def main() -> None:
    ARTIFACT_DIR.mkdir(exist_ok=True)
    clean_locks(PROFILE)
    browser = await uc.start(headless=False, user_data_dir=PROFILE)
    tab = await browser.get("https://seller-de.tiktok.com/account/login")

    print("Browser open. Trying to auto-fill TikTok login...")
    await asyncio.sleep(5)

    try:
        # Try to find email input
        inputs = await tab.select_all("input")
        for inp in inputs:
            attrs = inp.attrs or {}
            if (
                "email" in attrs.get("name", "").lower()
                or "email" in attrs.get("placeholder", "").lower()
                or "email" in attrs.get("type", "").lower()
            ):
                await inp.send_keys(EMAIL)
                print("Filled email")
                break

        for inp in inputs:
            attrs = inp.attrs or {}
            if (
                "password" in attrs.get("type", "").lower()
                or "password" in attrs.get("name", "").lower()
                or "passwort" in attrs.get("placeholder", "").lower()
            ):
                await inp.send_keys(PASSWORD)
                print("Filled password")
                break

        # Try to click login button
        btns = await tab.select_all("button")
        for btn in btns:
            text = (btn.text_all or "").lower()
            if (
                "log in" in text
                or "login" in text
                or "anmelden" in text
                or "sign in" in text
            ):
                await btn.click()
                print("Clicked login button")
                break
    except Exception as e:
        print("Auto-fill failed, please login manually:", e)

    print("Waiting for login to complete (URL changes to dashboard or product)...")
    for _ in range(600):
        await asyncio.sleep(1)
        url = tab.url or ""
        if "login" not in url.lower() and (
            "product" in url.lower()
            or "dashboard" in url.lower()
            or "homepage" in url.lower()
        ):
            print(f"Authenticated! URL: {url}")
            break

    await tab.save_screenshot(str(ARTIFACT_DIR / "tiktok_logged_in.png"))
    print(f"Screenshot saved to {ARTIFACT_DIR}/tiktok_logged_in.png")
    print("Session cookies saved. Press Enter to close browser.")
    input()
    browser.stop()


if __name__ == "__main__":
    uc.loop().run_until_complete(main())
