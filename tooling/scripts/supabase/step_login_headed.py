import asyncio, os
from pathlib import Path
import nodriver as uc

PROFILE = os.environ.get(
    "CHROME_PROFILE_DIR",
    "/Users/jeremy/dev/SIN-Solver/.worker_profiles/jeremy_runner",
)
ARTIFACT_DIR = Path(__file__).parent / ".artifacts"


def _clean_singletons(p: str) -> None:
    for s in Path(p).rglob("Singleton*"):
        try:
            s.unlink()
        except OSError:
            pass


async def main() -> None:
    ARTIFACT_DIR.mkdir(exist_ok=True)
    _clean_singletons(PROFILE)
    browser = await uc.start(headless=False, user_data_dir=PROFILE)
    tab = await browser.get("https://supabase.com/dashboard/sign-in?returnTo=/projects")
    print("Browser open. Please sign in to Supabase.")
    print("Waiting for /projects or /org page to appear...")
    for _ in range(600):
        await asyncio.sleep(1)
        url = tab.url or ""
        if "sign-in" not in url and (
            "/projects" in url or "/organizations" in url or "/project/" in url
        ):
            print(f"Authenticated! URL: {url}")
            break
    await tab.save_screenshot(str(ARTIFACT_DIR / "supabase_logged_in.png"))
    print(f"Screenshot saved to {ARTIFACT_DIR}/supabase_logged_in.png")
    print("Session cookies saved in profile. Press Enter to close browser.")
    input()
    browser.stop()


if __name__ == "__main__":
    uc.loop().run_until_complete(main())
