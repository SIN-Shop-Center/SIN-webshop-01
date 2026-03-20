import asyncio
import os
from pathlib import Path

import nodriver as uc

PROFILE = os.environ.get(
    "CHROME_PROFILE_DIR", "/Users/jeremy/dev/SIN-Solver/.worker_profiles/jeremy_runner"
)


def _clean(profile_dir: str) -> None:
    root = Path(profile_dir)
    if not root.is_dir():
        return
    for p in root.rglob("Singleton*"):
        try:
            p.unlink()
        except OSError:
            pass


async def main() -> None:
    _clean(PROFILE)
    b = await uc.start(headless=False, user_data_dir=PROFILE)
    tab = await b.get("https://cjdropshipping.com/list/trending")
    print("Solve the Cloudflare challenge in the browser window...")
    for _ in range(300):
        await asyncio.sleep(1)
        html = (await tab.get_content()).lower()
        if "cloudflare" not in html and "mensch" not in html and "human" not in html:
            await tab.save_screenshot("cloudflare_solved.png")
            print("OK: challenge looks solved (saved cloudflare_solved.png)")
            break
    input("Press Enter to stop the browser...")
    b.stop()


if __name__ == "__main__":
    uc.loop().run_until_complete(main())
