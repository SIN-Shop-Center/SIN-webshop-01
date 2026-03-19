import asyncio, nodriver as uc, sys
from pathlib import Path
from _secrets import get_chrome_profile_dir, get_email, get_password

ARTIFACTS = Path(__file__).parent / ".artifacts"
PROFILE = get_chrome_profile_dir()
EMAIL = get_email()
PASSWORD = get_password()
EMAIL_ID = "TikTok_Ads_SSO_Login_Email_Input"
PWD_ID = "TikTok_Ads_SSO_Login_Pwd_Input"


async def js_set(page, el_id: str, text: str) -> None:
    await page.evaluate(f"""
        (function() {{
            var el = document.getElementById('{el_id}');
            var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(el, '{text}');
            el.dispatchEvent(new Event('input', {{ bubbles: true }}));
            el.dispatchEvent(new Event('change', {{ bubbles: true }}));
        }})()
    """)


async def click_email_tab(page) -> None:
    await page.evaluate("""
        (function() {
            var all = document.querySelectorAll('*');
            for (var i = 0; i < all.length; i++) {
                var t = all[i].innerText;
                if (t && t.trim() === 'Mit E-Mail anmelden') {
                    all[i].click(); return;
                }
            }
        })()
    """)


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
    await page.save_screenshot(str(ARTIFACTS / "s09_01_initial.png"))

    try:
        btn = await page.find("Alle Cookies akzeptieren", best_match=True, timeout=3)
        if btn:
            await btn.click()
            await asyncio.sleep(2)
    except Exception:
        pass

    url = await page.evaluate("location.href")
    if "seller-de.tiktok.com" in url:
        print("Already logged in at:", url)
        await page.save_screenshot(str(ARTIFACTS / "s09_logged_in.png"))
        browser.stop()
        return

    await click_email_tab(page)
    await asyncio.sleep(2)
    await page.save_screenshot(str(ARTIFACTS / "s09_02_email_tab.png"))

    await js_set(page, EMAIL_ID, EMAIL)
    await asyncio.sleep(0.5)
    await js_set(page, PWD_ID, PASSWORD)
    await asyncio.sleep(0.5)
    await page.save_screenshot(str(ARTIFACTS / "s09_03_creds_filled.png"))
    print("Credentials filled via JS")

    try:
        await page.evaluate("""
            (function() {
                var all = document.querySelectorAll('*');
                for (var i = 0; i < all.length; i++) {
                    var t = all[i].innerText;
                    if (t && t.trim() === 'Angemeldet bleiben') {
                        all[i].click(); return;
                    }
                }
            })()
        """)
        await asyncio.sleep(0.5)
        print("Clicked Angemeldet bleiben")
    except Exception:
        print("Angemeldet bleiben not found")

    login_clicked = await page.evaluate("""
        (function() {
            var btns = document.querySelectorAll('button');
            for (var i = 0; i < btns.length; i++) {
                var t = btns[i].innerText;
                if (t && t.trim() === 'Anmelden') {
                    btns[i].click(); return true;
                }
            }
            return false;
        })()
    """)
    print("Login button clicked:", login_clicked)

    await asyncio.sleep(10)
    url2 = await page.evaluate("location.href")
    await page.save_screenshot(str(ARTIFACTS / "s09_04_after_login.png"))
    print("URL after login:", url2)

    if "seller-de.tiktok.com" in url2:
        print("SUCCESS: Logged in to TikTok Seller Center")
    else:
        print("WARN: Still on login page - may need manual CAPTCHA")
        print("Browser stays open for 60s for manual intervention...")
        await asyncio.sleep(60)
        url3 = await page.evaluate("location.href")
        await page.save_screenshot(str(ARTIFACTS / "s09_05_manual_result.png"))
        print("Final URL:", url3)

    browser.stop()


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).parent))
    uc.loop().run_until_complete(run())
