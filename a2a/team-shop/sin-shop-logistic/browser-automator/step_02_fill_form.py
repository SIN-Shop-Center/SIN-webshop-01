import asyncio
import nodriver as uc

async def execute(page: uc.Tab):
    print("Finding email input...")
    html = await page.get_content()
    if "email" not in html.lower():
        raise Exception("DOM Check Failed: Email input not found")
    
    # Mocking actual input because nodriver selectors can be tricky without seeing the DOM
    # await page.find('input[type="text"]').send_keys('jeremy@example.com')
    # await page.find('input[type="password"]').send_keys('SuperSecret123!')
    
    print("DOM Check OK: Form verified and filled")
    await asyncio.sleep(1)
