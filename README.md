# Qbli — קבלות לעסקים קטנים

A Hebrew-first, offline-first receipt manager for small businesses in Israel.
Create a receipt, send it by WhatsApp or email as a PDF, and track income —
without an account, a server, or a connection.

Installable as a PWA, and published to Google Play as a TWA.

## What it does

- **Receipts** — pick a client, add line items from a saved catalogue, apply a
  discount; receipt numbers increment automatically and run in strict sequence
- **Clients** — CRUD with search, per-client totals and receipt counts
- **Reports** — monthly / yearly / all-time income, chart, CSV export
- **Sharing** — generates a styled RTL PDF, shared via the native share sheet,
  WhatsApp, or email
- **Backup** — full JSON export and restore from Settings
- **Bilingual** — Hebrew (default, RTL) and English

All data lives in IndexedDB on the device. There is no account and no server
copy — the only external service is Sentry crash reporting. See
[`public/privacy.html`](public/privacy.html).

## Stack

React 19 · TypeScript · Vite · Tailwind CSS · `idb` · `vite-plugin-pwa`
(Workbox) · jsPDF + html2canvas

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build to dist/
npm run preview
```

| Script | Purpose |
|---|---|
| `npm run lint` | ESLint |
| `npm run generate-icons` | PWA icons from an SVG source |
| `npm run feature-graphic` | 1024×500 Play Store feature graphic |
| `npm run screenshots` | Phone screenshots from the real app (needs `npm i --no-save playwright`) |
| `npm run set-domain -- <domain>` | Wire a production domain into CNAME, TWA manifest and asset links |

## Deployment

Pushing to `main` builds and deploys to GitHub Pages
(`.github/workflows/deploy.yml`). The custom domain is pinned by `public/CNAME`.

Because the Android app is a TWA pointing at the same origin, a web deploy also
updates the installed Android app — no new release, no Play review.

## Publishing to Google Play

See **[PLAY_STORE.md](PLAY_STORE.md)** for the full walkthrough: domain setup,
signing key, the build workflow, Data Safety answers, Digital Asset Links, and
the closed-testing requirement.

Build an app bundle from **Actions → Build Android App Bundle → Run workflow**.

## `worker/`

A Cloudflare Worker for sending receipt emails through Resend. It is **not used
by the shipped app** — the client only calls it when `VITE_WORKER_URL` is set,
which the Pages build deliberately does not set. Without it, email sharing falls
back to the native share sheet. Left in place for future use.
