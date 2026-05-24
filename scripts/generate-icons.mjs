/**
 * Generates PWA icons from an SVG source.
 * Run: node scripts/generate-icons.mjs
 * Requires: npm install -D sharp
 */
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'public', 'icons')

fs.mkdirSync(outDir, { recursive: true })

// Full-bleed SVG (used for maskable icon — logo fills the entire square)
const svgFull = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#1D9E75"/>
  <text x="256" y="360"
    font-family="Arial, Helvetica, sans-serif"
    font-size="310"
    font-weight="bold"
    fill="white"
    text-anchor="middle">Q</text>
</svg>`

// Safe-zone SVG (logo inside a circle with padding — for standard icons)
const svgSafe = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#F7F7F5"/>
  <circle cx="256" cy="256" r="230" fill="#1D9E75"/>
  <text x="256" y="355"
    font-family="Arial, Helvetica, sans-serif"
    font-size="280"
    font-weight="bold"
    fill="white"
    text-anchor="middle">Q</text>
</svg>`

const svgBuf = Buffer.from(svgSafe)
const svgFullBuf = Buffer.from(svgFull)

async function generate() {
  await sharp(svgBuf).resize(192, 192).png().toFile(path.join(outDir, 'icon-192.png'))
  console.log('✓ icon-192.png')

  await sharp(svgBuf).resize(512, 512).png().toFile(path.join(outDir, 'icon-512.png'))
  console.log('✓ icon-512.png')

  await sharp(svgFullBuf).resize(512, 512).png().toFile(path.join(outDir, 'icon-512-maskable.png'))
  console.log('✓ icon-512-maskable.png')

  // Write SVG copy for browser tab favicon
  fs.writeFileSync(path.join(outDir, 'icon.svg'), svgSafe)
  console.log('✓ icon.svg')

  console.log('\nAll icons generated in public/icons/')
}

generate().catch(err => {
  console.error('Error generating icons:', err.message)
  process.exit(1)
})
