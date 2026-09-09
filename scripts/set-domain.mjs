#!/usr/bin/env node
/**
 * One-shot domain setup for the Play Store build.
 *
 *   npm run set-domain -- qbli.app
 *
 * Writes public/CNAME, and fills the domain + derived Android packageId into
 * twa-manifest.json and public/.well-known/assetlinks.json.
 *
 * CNAME is deliberately NOT committed with a placeholder: GitHub Pages reads it
 * on every deploy, so a fake value there would take the live site down.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const domain = (process.argv[2] || '').trim().toLowerCase()
if (!domain) {
  console.error('Usage: npm run set-domain -- <your-domain>\nExample: npm run set-domain -- qbli.app')
  process.exit(1)
}
if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
  console.error(`Not a valid bare domain: "${domain}"\nUse the hostname only — no https://, no trailing slash, no path.`)
  process.exit(1)
}
if (domain.startsWith('www.')) {
  console.error('Use the apex domain (qbli.app), not the www subdomain — the TWA binds to exactly one origin.')
  process.exit(1)
}

// qbli.app -> app.qbli.twa   |   qbli.co.il -> il.co.qbli.twa
const packageId = [...domain.split('.').reverse(), 'twa']
  .map(part => (/^[0-9]/.test(part) ? `_${part}` : part).replace(/-/g, '_'))
  .join('.')

// 1. CNAME — what pins the custom domain across GitHub Pages redeploys.
writeFileSync(join(root, 'public/CNAME'), `${domain}\n`)

// 2. twa-manifest.json — host/startUrl/packageId drive the Android build.
const twaPath = join(root, 'twa-manifest.json')
if (existsSync(twaPath)) {
  const twa = JSON.parse(readFileSync(twaPath, 'utf8'))
  const previousPackageId = twa.packageId
  twa.host = domain
  twa.startUrl = '/'
  twa.webManifestUrl = `https://${domain}/manifest.webmanifest`
  twa.fullScopeUrl = `https://${domain}/`
  twa.packageId = packageId
  for (const key of ['iconUrl', 'maskableIconUrl']) {
    if (twa[key]) twa[key] = twa[key].replace(/^https?:\/\/[^/]+(?=\/)/, `https://${domain}`)
  }
  if (Array.isArray(twa.shortcuts)) {
    twa.shortcuts = twa.shortcuts.map(s => ({
      ...s,
      ...(s.chosenIconUrl ? { chosenIconUrl: s.chosenIconUrl.replace(/^https?:\/\/[^/]+/, `https://${domain}`) } : {}),
    }))
  }
  writeFileSync(twaPath, JSON.stringify(twa, null, 2) + '\n')

  if (previousPackageId && !previousPackageId.startsWith('REPLACE_') && previousPackageId !== packageId) {
    console.warn(
      `\n⚠  packageId changed: ${previousPackageId} -> ${packageId}\n` +
      `   If the old ID was ever published to Play, this creates a SEPARATE app\n` +
      `   listing. A published packageId can never be changed.\n`
    )
  }
}

// 3. assetlinks.json — package name now; certificate fingerprints come from Play later.
const alPath = join(root, 'public/.well-known/assetlinks.json')
if (existsSync(alPath)) {
  const al = JSON.parse(readFileSync(alPath, 'utf8'))
  for (const entry of al) {
    if (entry?.target?.namespace === 'android_app') entry.target.package_name = packageId
  }
  writeFileSync(alPath, JSON.stringify(al, null, 2) + '\n')
}

console.log(`
Domain set to:  ${domain}
Package ID:     ${packageId}   <-- permanent once published to Play

Written:
  public/CNAME
  twa-manifest.json
  public/.well-known/assetlinks.json  (package name only)

Still to do:
  1. Point DNS at GitHub Pages, and set the custom domain in repo Settings -> Pages.
     Apex domain: four A records ->  185.199.108.153  185.199.109.153
                                     185.199.110.153  185.199.111.153
  2. Commit and push so Pages serves https://${domain}
  3. After the first AAB upload, paste Play's app-signing SHA-256 into
     public/.well-known/assetlinks.json and push again. See PLAY_STORE.md.
`)
