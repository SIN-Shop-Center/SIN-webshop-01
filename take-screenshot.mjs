import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: '/Users/jeremy/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// Check if the new JS chunk is loaded
const jsChunks = [];
page.on('response', response => {
  const url = response.url();
  if (url.includes('_next/static/chunks/') && url.endsWith('.js')) {
    jsChunks.push(url.split('/').pop());
  }
});

await page.goto('https://shopsin.delqhi.com/produkte', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Check if the ImageWithFallback component has the fix
const hasFix = await page.evaluate(() => {
  // Check if the component handles arrays
  const img = document.querySelector('img[src*="_next/image"]');
  return img ? img.src : 'no img found';
});

console.log('JS chunks:', jsChunks.slice(0, 5));
console.log('First img src:', hasFix?.substring(0, 100));

// Count broken images
const brokenCount = await page.evaluate(() => {
  const imgs = document.querySelectorAll('img');
  let broken = 0;
  imgs.forEach(img => {
    if (img.src.includes('%5B%22')) broken++; // URL-encoded array
  });
  return broken;
});
console.log('Broken images (array in src):', brokenCount);

await browser.close();
