import asyncio
import os
from pathlib import Path

import nodriver as uc


def _clean_singletons(profile_dir: str) -> None:
    root = Path(profile_dir)
    if not root.is_dir():
        return
    for p in root.rglob("Singleton*"):
        try:
            p.unlink()
        except OSError:
            pass


async def main() -> None:
    profile = os.environ.get(
        "CHROME_PROFILE_DIR",
        "/Users/jeremy/dev/SIN-Solver/.worker_profiles/jeremy_runner",
    )
    _clean_singletons(profile)
    browser = await uc.start(headless=False, user_data_dir=profile)
    tab = await browser.get(
        "https://supabase.com/dashboard/sign-in?returnTo=%2Forganizations"
    )
    print("Supabase login window opened.")
    print("Log in, then navigate to your org Projects page.")
    for _ in range(900):
        await asyncio.sleep(1)
        if "/organizations" in (tab.url or "") or "/project/" in (tab.url or ""):
            break
    await tab.save_screenshot("supabase_login_state.png")
    input("Press Enter to close browser...")
    browser.stop()


if __name__ == "__main__":
    uc.loop().run_until_complete(main())
