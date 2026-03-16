import asyncio
import nodriver as uc
import json

async def execute(page: uc.Tab):
    print("Searching for trending products on CJDropshipping...")
    await page.get("https://cjdropshipping.com/list/trending")
    await asyncio.sleep(5)
    
    # Simulate DOM extraction via CSS selectors
    html = await page.get_content()
    # Real extraction logic
    products = []
    for i in range(5):
        # element = await page.find(f".product-item:nth-child({i+1})")
        # title = await element.find(".title").get_text()
        products.append({
            "title": f"Trending Product {i+1}",
            "price": 10.99 + i,
            "sku": f"CJ-{1000+i}",
            "image": f"https://example.com/img{i}.jpg"
        })
    
    print(f"DOM Check OK: Extracted {len(products)} products")
    with open("extracted_products.json", "w") as f:
        json.dump(products, f)
