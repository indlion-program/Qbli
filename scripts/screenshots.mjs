/**
 * Captures Play Store phone screenshots from the real running app.
 *
 *   npm run build && npm run screenshots
 *
 * Playwright is intentionally NOT a dependency in package.json — it would slow
 * every Pages CI build for something that only runs when the UI changes. The
 * generated PNGs are committed instead. To regenerate:
 *
 *   npm i --no-save playwright
 *
 * Output: public/screenshots/*.png (1080x1920, referenced by the web manifest
 * and uploaded to the Play Console listing).
 */
import { chromium } from 'playwright'
import { createServer } from 'vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outDir = path.join(root, 'public', 'screenshots')

const WIDTH = 1080
const HEIGHT = 1920
const DPR = 3 // render at CSS 360x640, output 1080x1920

const now = Date.now()
const DAY = 86_400_000
const iso = ts => new Date(ts).toISOString().slice(0, 10)

const clients = [
  { id: 'c1', name: 'מספרת דנה', email: 'dana@example.co.il', phone: '0521234567', notes: '', createdAt: now - 40 * DAY },
  { id: 'c2', name: 'קפה שקד', email: 'shaked@example.co.il', phone: '0539876543', notes: '', createdAt: now - 32 * DAY },
  { id: 'c3', name: 'סטודיו אורן', email: 'oren@example.co.il', phone: '0547654321', notes: '', createdAt: now - 21 * DAY },
  { id: 'c4', name: 'פרחי מיכל', email: 'michal@example.co.il', phone: '0501112233', notes: '', createdAt: now - 12 * DAY },
]

const mk = (id, c, items, discount, daysAgo) => {
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0)
  const ts = now - daysAgo * DAY
  return {
    id, clientId: c.id, clientName: c.name, clientEmail: c.email, clientPhone: c.phone,
    items, subtotal, discount, total: subtotal - discount,
    notes: '', date: iso(ts), ts,
  }
}

const receipts = [
  mk('1041', clients[0], [{ desc: 'עיצוב לוגו', qty: 1, price: 1200 }], 0, 1),
  mk('1040', clients[1], [{ desc: 'ייעוץ שיווקי', qty: 3, price: 350 }], 50, 3),
  mk('1039', clients[2], [{ desc: 'צילום מוצר', qty: 12, price: 90 }], 0, 6),
  mk('1038', clients[3], [{ desc: 'בניית אתר', qty: 1, price: 2800 }], 200, 9),
  mk('1037', clients[0], [{ desc: 'עריכת וידאו', qty: 2, price: 450 }], 0, 14),
  mk('1036', clients[1], [{ desc: 'ניהול רשתות', qty: 1, price: 900 }], 0, 19),
  mk('1035', clients[2], [{ desc: 'צילום אירוע', qty: 1, price: 1500 }], 100, 24),
]

const products = [
  { id: 'p1', name: 'עיצוב לוגו', price: 1200 },
  { id: 'p2', name: 'ייעוץ שיווקי', price: 350 },
  { id: 'p3', name: 'צילום מוצר', price: 90 },
]

const settings = {
  bizName: 'סטודיו יובל', ownerName: 'יובל כהן', phone: '0521112233',
  email: 'yuval@example.co.il', address: 'הרצל 12, תל אביב',
  nextReceiptNum: 1042, lang: 'he', businessId: 'demo-screenshot-business',
}

// Runs in the page before the app boots, so the app finds a populated DB.
function seed({ clients, receipts, products, settings }) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('qbli-db', 1)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const s of ['receipts', 'clients', 'products']) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'key' })
    }
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction(['receipts', 'clients', 'products', 'settings'], 'readwrite')
      for (const c of clients) tx.objectStore('clients').put(c)
      for (const r of receipts) tx.objectStore('receipts').put(r)
      for (const p of products) tx.objectStore('products').put(p)
      for (const [key, value] of Object.entries(settings)) tx.objectStore('settings').put({ key, value })
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
    }
  })
}

const shots = [
  { name: 'home', path: '/' },
  { name: 'new-receipt', path: '/new-receipt' },
  { name: 'clients', path: '/clients' },
  { name: 'reports', path: '/reports' },
]

fs.mkdirSync(outDir, { recursive: true })

const server = await createServer({ root, server: { port: 5199, strictPort: true } })
await server.listen()
const base = `http://localhost:5199`

// Prefer a preinstalled Chromium when one is present (PLAYWRIGHT_BROWSERS_PATH
// caches may not match the exact build this Playwright version expects).
const preinstalled = process.env.CHROMIUM_PATH
  || (process.env.PLAYWRIGHT_BROWSERS_PATH && path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, 'chromium'))
const browser = await chromium.launch(
  preinstalled && fs.existsSync(preinstalled) ? { executablePath: preinstalled } : {}
)
const context = await browser.newContext({
  viewport: { width: WIDTH / DPR, height: HEIGHT / DPR },
  deviceScaleFactor: DPR,
  locale: 'he-IL',
  isMobile: true,
  hasTouch: true,
})

// Seed once on the origin, before any app code runs.
const seeder = await context.newPage()
await seeder.goto(base)
await seeder.evaluate(seed, { clients, receipts, products, settings })
await seeder.close()

let failed = false
for (const shot of shots) {
  const page = await context.newPage()
  await page.goto(base + shot.path, { waitUntil: 'networkidle' })
  // Onboarding is skipped only if bizName made it into the DB.
  await page.waitForTimeout(1200)

  const onboarding = await page.locator('text=ברוכים').count().catch(() => 0)
  if (onboarding > 0) {
    console.error(`✗ ${shot.name}: app showed onboarding — DB seed did not take`)
    failed = true
  }

  const file = path.join(outDir, `${shot.name}.png`)
  await page.screenshot({ path: file })
  const { width, height } = await (await import('sharp')).default(file).metadata()
  if (width !== WIDTH || height !== HEIGHT) {
    console.error(`✗ ${shot.name}: ${width}x${height}, expected ${WIDTH}x${HEIGHT}`)
    failed = true
  } else {
    console.log(`✓ public/screenshots/${shot.name}.png  ${width}x${height}`)
  }
  await page.close()
}

await browser.close()
await server.close()

if (failed) process.exit(1)
console.log(`\n${shots.length} screenshots in public/screenshots/`)
