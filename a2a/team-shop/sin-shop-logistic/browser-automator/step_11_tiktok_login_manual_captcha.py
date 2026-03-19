import asyncio, nodriver as uc, sys
from pathlib import Path
from _secrets import get_chrome_profile_dir, get_email, get_password

ARTIFACTS = Path(__file__).parent / ".artifacts"
PROFILE = get_chrome_profile_dir()
EMAIL = get_email()
PASSWORD = get_password()


async def set_react_input(page, el_id: str, text: str) -> None:
    await page.evaluate(f"""
        (function() {{
            var el = document.getElementById('{el_id}');
            var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(el, '{text}');
            el.dispatchEvent(new Event('input', {{ bubbles: true }}));
            el.dispatchEvent(new Event('change', {{ bubbles: true }}));
            el.dispatchEvent(new Event('blur', {{ bubbles: true }}));
        }})()
    """)
    await asyncio.sleep(0.3)


async def wait_for_dashboard(page, timeout_s: int = 120) -> bool:
    for _ in range(timeout_s):
        url = await page.evaluate("location.href")
        if "seller-de.tiktok.com" in url:
            return True
        await asyncio.sleep(1)
    return False


async def run():
    ARTIFACTS.mkdir(exist_ok=True)
    for s in Path(PROFILE).rglob("Singleton*"):
        try:
            s.unlink()
        except OSError:
            pass

    browser = await uc.start(headless=False, user_data_dir=PROFILE)
    page = await browser.get("https://seller-de-accounts.tiktok.com/account/login")
    await asyncio.sleep(7)

    try:
        btn = await page.find("Alle Cookies akzeptieren", best_match=True, timeout=3)
        if btn:
            await btn.click()
            await asyncio.sleep(2)
    except Exception:
        pass

    url = await page.evaluate("location.href")
    if "seller-de.tiktok.com" in url:
        print("Already logged in!")
    else:
        tab_btn = await page.select("#TikTok_Ads_SSO_Login_Email_Panel_Button")
        if tab_btn:
            await tab_btn.click()
            await asyncio.sleep(2)

        await set_react_input(page, "TikTok_Ads_SSO_Login_Email_Input", EMAIL)
        await set_react_input(page, "TikTok_Ads_SSO_Login_Pwd_Input", PASSWORD)

        await page.evaluate("""
            (function() {
                var btns = Array.from(document.querySelectorAll('button'));
                var b = btns.find(b => b.innerText && b.innerText.trim() === 'Anmelden' && b.offsetParent !== null);
                if (b) b.click();
            })()
        """)
        print("Credentials submitted. Waiting for CAPTCHA solve or dashboard...")
        print(">>> BITTE CAPTCHA LOESEN falls sichtbar <<<")
        print("Warte bis zu 2 Minuten auf Dashboard-Redirect...")

        ok = await wait_for_dashboard(page, timeout_s=120)
        if not ok:
            await page.save_screenshot(str(ARTIFACTS / "s11_captcha_timeout.png"))
            print("TIMEOUT: Dashboard nicht erreicht. Screenshot gespeichert.")
            browser.stop()
            return

    await page.save_screenshot(str(ARTIFACTS / "s11_dashboard.png"))
    url2 = await page.evaluate("location.href")
    print("SUCCESS: Eingeloggt!", url2)

    body = await page.evaluate("document.body.innerText")
    print("Dashboard snippet:", body[:300])

    print("Navigiere zu Produkt-Liste...")
    await page.get("https://seller-de.tiktok.com/product/list")
    await asyncio.sleep(5)
    await page.save_screenshot(str(ARTIFACTS / "s11_product_list.png"))
    print("Product list geladen. Screenshot: s11_product_list.png")

    browser.stop()


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).parent))
    uc.loop().run_until_complete(run())
