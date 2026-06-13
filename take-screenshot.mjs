import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: '/Users/jeremy/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const brokenImgs = [];
page.on('console', msg => {
  const loc = msg.location();
  if (msg.type() === 'error' && loc?.url?.includes('_next/image')) {
    brokenImgs.push(decodeURIComponent(loc.url).substring(0, 200));
  }
});

await page.goto('https://shopsin.delqhi.com/produkte', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

// Count total images and broken ones
const imgInfo = await page.evaluate(() => {
  const imgs = document.querySelectorAll('img');
  const results = [];
  imgs.forEach(img => {
    if (img.src.includes('_next/image')) {
      const urlParam = new URL(img.src).searchParams.get('url');
      results.push({
        src: img.src.substring(0, 100),
        urlParam: urlParam?.substring(0, 80),
        isArray: urlParam?.startsWith('["') || false,
      });
    }
  });
  return results;
});

const arrayImages = imgInfo.filter(i => i.isArray);
console.log(`Total images: ${imgInfo.length}, Array images: ${arrayImages.length}`);
if (arrayImages.length > 0) {
  console.log('Array image URLs:');
  arrayImages.forEach(i => console.log('  ', i.urlParam?.substring(0, 100)));
}

await browser.close();
