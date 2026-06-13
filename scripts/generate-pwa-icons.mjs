import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const BRAND = '#047857'
const WHITE = '#ffffff'
const OUT_DIR = join(import.meta.dirname, '..', 'public', 'icons')

function svgIcon(size, maskable = false) {
  const center = size / 2
  const radius = maskable ? size * 0.4 : size * 0.45
  const fontSize = maskable ? size * 0.45 : size * 0.5

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${maskable ? BRAND : WHITE}"/>
  <circle cx="${center}" cy="${center}" r="${radius}" fill="${BRAND}"/>
  <text x="${center}" y="${center}" text-anchor="middle" dominant-baseline="central"
        font-family="system-ui,sans-serif" font-weight="700" font-size="${fontSize}"
        fill="${WHITE}">S</text>
</svg>`
}

async function generate() {
  await mkdir(OUT_DIR, { recursive: true })

  const specs = [
    ['icon-192.png', 192, false],
    ['icon-512.png', 512, false],
    ['maskable-192.png', 192, true],
    ['maskable-512.png', 512, true],
  ]

  for (const [name, size, maskable] of specs) {
    const svg = svgIcon(size, maskable)
    await sharp(Buffer.from(svg)).png().toFile(join(OUT_DIR, name))
    console.log(`✓ ${name} (${size}x${size})`)
  }

  console.log('\nDone — icons in public/icons/')
}

generate().catch((e) => {
  console.error(e)
  process.exit(1)
})
