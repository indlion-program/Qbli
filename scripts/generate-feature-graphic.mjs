/**
 * Generates the 1024x500 Google Play feature graphic.
 * Run: npm run feature-graphic
 *
 * Play requires exactly 1024x500 PNG/JPEG with no alpha channel. Play also
 * overlays its own UI near the edges in some placements, so everything that
 * matters is kept well inside the middle.
 */
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'store-assets')

fs.mkdirSync(outDir, { recursive: true })

const GREEN = '#1D9E75'
const GREEN_DARK = '#157A5A'

// Hebrew is written here right-to-left in *visual* order. SVG rasterizers do not
// apply the bidi algorithm, so logical-order text comes out mirrored. Verified by
// rendering and eyeballing the PNG — see the note in PLAY_STORE.md.
const TAGLINE_HE = 'םינטק םיקסעל תולבק'

const svg = `<svg width="1024" height="500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${GREEN}"/>
      <stop offset="100%" stop-color="${GREEN_DARK}"/>
    </linearGradient>
  </defs>

  <rect width="1024" height="500" fill="url(#bg)"/>

  <!-- decorative rings, clipped by the canvas -->
  <circle cx="905" cy="90" r="190" fill="#ffffff" opacity="0.06"/>
  <circle cx="120" cy="430" r="150" fill="#ffffff" opacity="0.05"/>

  <!-- receipt mark -->
  <g transform="translate(122 132)">
    <rect x="0" y="0" width="150" height="200" rx="16" fill="#ffffff"/>
    <rect x="26" y="40"  width="98" height="12" rx="6" fill="${GREEN}" opacity="0.85"/>
    <rect x="26" y="72"  width="72" height="12" rx="6" fill="#C9D6D1"/>
    <rect x="26" y="104" width="88" height="12" rx="6" fill="#C9D6D1"/>
    <rect x="26" y="146" width="98" height="16" rx="8" fill="${GREEN}"/>
  </g>

  <text x="330" y="238" font-family="DejaVu Sans, Liberation Sans, sans-serif"
        font-size="116" font-weight="bold" fill="#ffffff">Qbli</text>

  <text x="332" y="300" font-family="DejaVu Sans, Liberation Sans, sans-serif"
        font-size="42" fill="#ffffff" opacity="0.95">${TAGLINE_HE}</text>

  <text x="332" y="356" font-family="DejaVu Sans, Liberation Sans, sans-serif"
        font-size="30" fill="#ffffff" opacity="0.72">Receipts for small businesses</text>

  <text x="332" y="404" font-family="DejaVu Sans, Liberation Sans, sans-serif"
        font-size="26" fill="#ffffff" opacity="0.6">Offline &#183; Free &#183; No account</text>
</svg>`

await sharp(Buffer.from(svg))
  .flatten({ background: GREEN }) // Play rejects alpha channels
  .png()
  .toFile(path.join(outDir, 'feature-graphic.png'))

const meta = await sharp(path.join(outDir, 'feature-graphic.png')).metadata()
if (meta.width !== 1024 || meta.height !== 500) {
  console.error(`✗ Wrong size: ${meta.width}x${meta.height} (Play requires exactly 1024x500)`)
  process.exit(1)
}
if (meta.hasAlpha) {
  console.error('✗ Image has an alpha channel; Play requires none.')
  process.exit(1)
}

console.log(`✓ store-assets/feature-graphic.png  ${meta.width}x${meta.height}, no alpha`)
