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
    await page.save_screenshot(str(ARTIFACTS / "s10_01_initial.png"))

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
        await page.save_screenshot(str(ARTIFACTS / "s10_logged_in.png"))
        browser.stop()
        return

    tab_btn = await page.select("#TikTok_Ads_SSO_Login_Email_Panel_Button")
    if tab_btn:
        await tab_btn.click()
        print("Clicked email panel button by ID")
    else:
        await page.evaluate(
            "document.getElementById('TikTok_Ads_SSO_Login_Email_Panel_Button').click()"
        )
        print("Clicked email panel button via JS")
    await asyncio.sleep(2)

    email_visible = await page.evaluate(
        "document.getElementById('TikTok_Ads_SSO_Login_Email_Input').offsetParent !== null"
    )
    print("Email input visible:", email_visible)
    await page.save_screenshot(str(ARTIFACTS / "s10_02_email_tab.png"))

    await set_react_input(page, "TikTok_Ads_SSO_Login_Email_Input", EMAIL)
    print("Set email via React setter")
    await set_react_input(page, "TikTok_Ads_SSO_Login_Pwd_Input", PASSWORD)
    print("Set password via React setter")
    await page.save_screenshot(str(ARTIFACTS / "s10_03_creds_filled.png"))

    email_val = await page.evaluate(
        "document.getElementById('TikTok_Ads_SSO_Login_Email_Input').value"
    )
    pwd_val = await page.evaluate(
        "document.getElementById('TikTok_Ads_SSO_Login_Pwd_Input').value"
    )
    print(f"Verified email field: '{email_val}'")
    print(f"Verified pwd field length: {len(pwd_val)}")

    try:
        await page.evaluate("""
            (function() {
                var all = Array.from(document.querySelectorAll('*'));
                var cb = all.find(e => e.innerText && e.innerText.trim() === 'Angemeldet bleiben');
                if (cb) cb.click();
            })()
        """)
        print("Clicked Angemeldet bleiben")
    except Exception:
        pass

    login_clicked = await page.evaluate("""
        (function() {
            var btns = Array.from(document.querySelectorAll('button'));
            var b = btns.find(b => b.innerText && b.innerText.trim() === 'Anmelden' && b.offsetParent !== null);
            if (b) { b.click(); return true; }
            return false;
        })()
    """)
    print("Login button clicked:", login_clicked)

    await asyncio.sleep(12)
    url2 = await page.evaluate("location.href")
    await page.save_screenshot(str(ARTIFACTS / "s10_04_after_login.png"))
    print("URL after login:", url2)

    body = await page.evaluate("document.body.innerText")
    print("Page text snippet:", body[:500])

    if "seller-de.tiktok.com" in url2:
        print("SUCCESS: TikTok Seller Center logged in!")
    else:
        print(
            "WARN: Still on login page. Check s10_04_after_login.png for error/CAPTCHA."
        )

    browser.stop()


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).parent))
    uc.loop().run_until_complete(run())
