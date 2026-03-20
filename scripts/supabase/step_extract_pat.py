import asyncio, os, re, uuid
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
    browser = await uc.start(headless=True, user_data_dir=PROFILE)
    print("Navigating to account tokens...")
    tab = await browser.get("https://supabase.com/dashboard/account/tokens")
    await asyncio.sleep(4)
    await tab.save_screenshot(str(ARTIFACT_DIR / "tokens_page.png"))

    try:
        btn = await tab.find("Generate new token", best_match=True)
        await btn.click()
        print("Clicked Generate new token")
        await asyncio.sleep(2)
        
        name = f"automation_{uuid.uuid4().hex[:6]}"
        
        # Click the input first
        inputs = await tab.select_all("input")
        for inp in inputs:
            # Check if this input is the right one, usually by placeholder or name
            attrs = inp.attrs or {}
            if "name" in attrs.get("id", "").lower() or attrs.get("placeholder", "") == "Token name":
                await inp.click()
                await asyncio.sleep(1)
                await inp.send_keys(name)
                print(f"Typed '{name}' into specific input field")
                break
        else:
            # If loop finished and didn't break, just click first input and type
            if inputs:
                await inputs[0].click()
                await asyncio.sleep(1)
                await inputs[0].send_keys(name)
                print(f"Typed '{name}' into first input field")
            
        gen_btn = await tab.find("Generate token", best_match=True)
        await gen_btn.click()
        print("Clicked Generate token form button")
        await asyncio.sleep(3)
        await tab.save_screenshot(str(ARTIFACT_DIR / "token_generated.png"))
    except Exception as e:
        print("Error during generation:", e)

    html = await tab.get_content()
    match = re.search(r'sbp_[A-Za-z0-9]+', html)
    if match:
        pat = match.group(0)
        print(f"FOUND PAT: {pat[:10]}...")
        with open(ARTIFACT_DIR / "pat.txt", "w") as f:
            f.write(pat)
    else:
        print("PAT not found in page source.")

    browser.stop()

if __name__ == "__main__":
    uc.loop().run_until_complete(main())
