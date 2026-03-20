import importlib
import os
import shutil
import sys
from pathlib import Path

import nodriver as uc

STEPS = [
    "step_01_goto_cj",
    "step_03_extract_5_products",
    "step_04_map_to_supabase",
    "step_06_sync_tiktok_shop",
]

DEFAULT_PROFILE = "/Users/jeremy/dev/SIN-Solver/.worker_profiles/jeremy_runner"


def _clean_singleton_locks(profile_dir: str) -> None:
    root = Path(profile_dir)
    for p in root.rglob("Singleton*"):
        try:
            p.unlink()
        except OSError:
            pass


async def _save_debug(page: uc.Tab, out_dir: Path, prefix: str) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    await page.save_screenshot(str(out_dir / f"{prefix}.png"))
    try:
        html = await page.get_content()
        (out_dir / f"{prefix}.html").write_text(html, encoding="utf-8")
    except Exception:
        pass


async def run() -> None:
    profile_dir = os.environ.get("CHROME_PROFILE_DIR", "").strip() or DEFAULT_PROFILE
    headless_raw = (os.environ.get("HEADLESS", "true") or "true").strip().lower()
    headless = headless_raw not in ("0", "false", "no")
    if profile_dir and os.path.isdir(profile_dir):
        _clean_singleton_locks(profile_dir)
        browser = await uc.start(headless=headless, user_data_dir=profile_dir)
    else:
        browser = await uc.start(headless=headless)

    page = await browser.get("about:blank")
    artifacts = Path(__file__).parent / ".artifacts"
    for step in STEPS:
        print(f"--- Running {step} ---")
        mod = importlib.import_module(step)
        importlib.reload(mod)
        try:
            await mod.execute(page)
            await _save_debug(page, artifacts, f"{step}_success")
            print(f"[OK] {step}")
        except Exception as e:
            await _save_debug(page, artifacts, f"{step}_error")
            raise RuntimeError(f"step_failed:{step}:{e}")
    browser.stop()


if __name__ == "__main__":
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    uc.loop().run_until_complete(run())
