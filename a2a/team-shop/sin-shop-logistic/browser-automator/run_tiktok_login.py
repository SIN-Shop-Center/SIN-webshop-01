import asyncio, importlib, os, sys
from pathlib import Path
import nodriver as uc

STEPS = [
    "step_07_tiktok_login_email",
    "step_08_tiktok_fill_credentials"
]

PROFILE = os.environ.get("CHROME_PROFILE_DIR", "/Users/jeremy/dev/SIN-Solver/.worker_profiles/jeremy_runner")
ARTIFACTS = Path(__file__).parent / ".artifacts"

def clean(p: str) -> None:
    for s in Path(p).rglob("Singleton*"):
        try: s.unlink()
        except OSError: pass

async def run() -> None:
    clean(PROFILE)
    ARTIFACTS.mkdir(exist_ok=True)
    # Headless=False because TikTok often triggers Captcha/Slider on login
    browser = await uc.start(headless=False, user_data_dir=PROFILE)
    page = await browser.get("about:blank")
    
    for step in STEPS:
        print(f"--- Running {step} ---")
        mod = importlib.import_module(step)
        importlib.reload(mod)
        try:
            await mod.execute(page)
            print(f"[OK] {step}")
        except Exception as e:
            print(f"[FAIL] {step}: {e}")
            break
            
    print("Wait for dashboard or solve slider manually. Press Enter to close.")
    input()
    browser.stop()

if __name__ == "__main__":
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    uc.loop().run_until_complete(run())
