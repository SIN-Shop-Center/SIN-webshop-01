import fs from 'node:fs';
import path from 'node:path';

function removeFakeReviews(filePath) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  // Remove review ratings and counts from mock data
  content = content.replace(/\s*rating:\s*[0-9.]+,\n/g, '\n');
  content = content.replace(/\s*reviewCount:\s*\d+,\n/g, '\n');
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Removed fake reviews from ${filePath}`);
}

removeFakeReviews('apps/web/src/data/sample-products-a.ts');
removeFakeReviews('apps/web/src/data/sample-products-b.ts');
