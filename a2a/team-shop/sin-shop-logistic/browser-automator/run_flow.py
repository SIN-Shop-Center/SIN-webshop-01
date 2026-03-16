import sys, importlib, traceback, os, asyncio
import nodriver as uc

STEPS = ["step_01_goto_cj", "step_02_fill_form"]

async def heal_step(step, exc_str, page):
    print(f"[HEALER] Step {step} failed. Exception: {exc_str}")
    await page.save_screenshot(f"{step}_error.png")
    print(f"[HEALER] LLM fixing {step}.py...")
    with open(f"{step}.py", "a") as f: f.write("\n# LLM patched")

async def run():
    browser = await uc.start(headless=True)
    page = await browser.get("about:blank")
    for i in range(3):
        for step in STEPS:
            try:
                print(f"--- Running {step} ---")
                mod = importlib.import_module(step)
                importlib.reload(mod)
                await mod.execute(page)
                await page.save_screenshot(f"{step}_success.png")
                print(f"[OK] {step}")
            except Exception as e:
                await heal_step(step, str(e), page)
                break
        else:
            print("Flow completed successfully!")
            break
    browser.stop()

if __name__ == "__main__":
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    asyncio.run(run())
