import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: '/Users/jeremy/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:3000/produkte', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);
const content = await page.content();
const productLinks = content.match(/href="\/produkt\/[^"]+"/g) || [];
console.log('Product links found:', productLinks.length);
if (productLinks.length > 0) {
  console.log('First product:', productLinks[0]);
}
const hasProducts = content.includes('Keine Produkte') || content.includes('Noch keine');
console.log('Empty state:', hasProducts);
await browser.close();
