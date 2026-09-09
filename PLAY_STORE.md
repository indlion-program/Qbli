# Publishing Qbli to Google Play

A step-by-step guide. Steps marked **(you)** need your Google account or a
purchase and can't be automated.

The Android app is a **TWA** — a thin native wrapper that displays the existing
PWA full-screen with no browser bar. There is no second codebase: whatever
GitHub Pages serves is what the app shows, so shipping a web change ships an app
change, with no Play review.

**Realistic timeline: 3–4 weeks**, almost all of it waiting. Play account
verification takes days, and a new personal account must run a 14-day closed test
before it can go public. Start steps 1 and 2 today; everything else can happen
while those run.

---

## Step 1 — Point the domain at GitHub Pages **(you)**

The domain is **q-bil.com**, managed in Cloudflare. The TWA binds permanently to
this exact origin — changing it later means publishing a new app and losing your
installs and reviews.

The project is already wired to it (`public/CNAME`, `twa-manifest.json` and
`assetlinks.json` all carry `q-bil.com`). What's left is DNS.

### Cloudflare DNS

**DNS → Records**, add five records. **Every one must be "DNS only" — click the
orange cloud so it turns grey.**

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `185.199.108.153` | DNS only |
| A | `@` | `185.199.109.153` | DNS only |
| A | `@` | `185.199.110.153` | DNS only |
| A | `@` | `185.199.111.153` | DNS only |
| CNAME | `www` | `indlion-program.github.io` | DNS only |

> **This is the step that goes wrong.** While Cloudflare proxies the domain
> (orange cloud), GitHub cannot issue its TLS certificate, so "Enforce HTTPS"
> stays greyed out — and a TWA requires valid HTTPS. Grey cloud, always.

Two more Cloudflare settings:

- **SSL/TLS → Overview → Full (strict).** On *Flexible*, Cloudflare speaks HTTP to
  GitHub while telling the browser it's HTTPS; combined with GitHub's own HTTPS
  redirect that becomes an infinite redirect loop.
- **Speed → Optimization → Rocket Loader: off.** It rewrites how scripts load and
  can break the service worker that offline mode depends on.

### GitHub Pages

Repo **Settings → Pages → Custom domain** → `q-bil.com` → Save. Wait for the
certificate (minutes, occasionally up to an hour), then tick **Enforce HTTPS**.

This replaces the old `qbil.nhfm.qzz.io` address, which stops working.

`public/CNAME` is committed for a reason: without it, GitHub Pages can silently
drop the custom domain on a redeploy, which would break the app for everyone who
already installed it.

### Verify before moving on

```bash
dig +short q-bil.com     # expect the four 185.199.x.153 addresses
```

If you get Cloudflare addresses (`104.x` / `172.x`), the proxy is still on.

Then, once the site has deployed from `main`:

- `https://q-bil.com` loads the app over HTTPS
- `https://q-bil.com/privacy.html` shows the privacy policy
- `https://q-bil.com/manifest.webmanifest` returns JSON
- `https://q-bil.com/.well-known/assetlinks.json` returns JSON, **not** the app
- `https://www.q-bil.com` redirects to the apex

### Changing the domain later

```bash
npm run set-domain -- <domain> [package-id]
```

Rewrites `public/CNAME`, `twa-manifest.json` and `assetlinks.json` together. It
warns if the package ID would change, since that is permanent after publishing.

---

## Step 2 — Create a Play Console account **(you)**

<https://play.google.com/console> — **$25, one time, forever.**

You'll pick an account type, and this choice has real consequences:

| | Personal | Organization |
|---|---|---|
| Needs | ID document | D-U-N-S number for a registered business |
| Closed test before going public | **12 testers, 14 days** | Not required |
| Setup time | Days | Weeks (D-U-N-S takes time) |

If you have a registered business (עוסק מורשה/פטור) and can get a D-U-N-S number,
the organization account skips the 12-tester requirement entirely. Otherwise take
the personal account and plan for step 7.

Identity verification takes a few days. Nothing else in Play can proceed until
it clears, which is why this goes first.

---

## Step 3 — Create your signing key **(you)**

This key signs every version of your app. **If you lose it you can never update
your listing again** — you'd have to publish a fresh app and lose all installs
and reviews. Google cannot recover it for you.

Run this once, anywhere with Java installed (`java -version` to check; on macOS
`brew install openjdk`, on Windows install Temurin):

```bash
keytool -genkeypair -v \
  -keystore android.keystore \
  -alias qbli \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Qbli, OU=Qbli, O=Qbli, L=Tel Aviv, C=IL"
```

It asks for a password twice. Use one strong password for both the keystore and
the key — Bubblewrap expects them separately, and keeping them identical avoids a
confusing class of build failure.

### Storing it — do this properly

Get a password manager that holds **file attachments**, not just passwords, since
the keystore is a binary file:

- **1Password** (~$3/month) — recommended. Stores files as Documents on every
  plan and has proper emergency access.
- **Bitwarden Premium** ($10/year) — cheapest solid option, open source. File
  attachments need the paid tier; the free tier can't hold the keystore.
- **Proton Pass Plus** — good if you already pay for Proton.

Create one item containing **all** of this:

- the `android.keystore` file itself
- the keystore password and key password
- the key alias (`qbli`)
- your `packageId` (e.g. `app.qbli.twa`)

Then put a **second copy somewhere offline** — an encrypted USB stick, or a
printed base64 dump in a drawer. Two copies in two places. A single cloud account
you could be locked out of is one copy.

> **GitHub Secrets is not a backup.** Secrets are write-only — you cannot read
> them back out. If that's your only copy, it's already gone.

Never email it to yourself, never put it in plain Drive/Dropbox, never commit it.
`.gitignore` already blocks `*.keystore`, `*.jks` and `*.p12`.

### Add it to GitHub

Turn the keystore into text:

```bash
base64 -w0 android.keystore > keystore.b64   # macOS: base64 -i android.keystore -o keystore.b64
```

In the repo: **Settings → Secrets and variables → Actions → New repository
secret**. Add four:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | contents of `keystore.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | your keystore password |
| `ANDROID_KEY_PASSWORD` | your key password |
| `ANDROID_KEY_ALIAS` | `qbli` |

Then delete `keystore.b64` — but keep `android.keystore` in your password manager.

---

## Step 4 — Build the app bundle

No Android tooling needed on your machine; it builds on GitHub's servers.

**Actions → Build Android App Bundle → Run workflow.** Set the version name
(e.g. `1.0.0`) and version code (`1`). When it finishes, download the
`qbli-1.0.0-1-aab` artifact and unzip it to get `app-release-bundle.aab`.

The version code must **increase** on every upload — `1`, then `2`, then `3`.
Play rejects a repeat.

The build fetches your app icon over the network, so **step 1 must be finished
and the site live** or it will fail.

---

## Step 5 — Create the app in Play Console **(you)**

**All apps → Create app.** App name `Qbli`, default language **Hebrew**, type
**App**, and **Free**.

> Free vs paid can never be changed later. Qbli has no purchases, so: Free.

Then work through **Dashboard → Set up your app**:

**Store listing** — copy from [`store-assets/listing.md`](store-assets/listing.md),
which has Hebrew and English text within the character limits, plus:

- App icon: `public/icons/icon-512.png`
- Feature graphic: `store-assets/feature-graphic.png`
- Phone screenshots: the four PNGs in `public/screenshots/`

**Privacy policy** — `https://q-bil.com/privacy.html`

**Data safety** — answer it to match what the app actually does:

| Question | Answer |
|---|---|
| Does your app collect or share user data? | **Yes** (because of crash reporting) |
| Data types | *Crash logs* and *Diagnostics* under App activity/performance |
| Purpose | Analytics and app functionality |
| Is it encrypted in transit? | Yes |
| Can users request deletion? | Yes — uninstalling deletes everything |
| Is data shared with third parties? | No |

Everything else — business details, clients, receipts — is stored **only on the
device**, which in Play's model is not "collected". Do **not** declare financial
data collection: none of it reaches a server.

**Content rating** — fill in the questionnaire honestly. A business utility with
no user content, ads or purchases rates "Everyone" / PEGI 3.

**Target audience** — 18+. Do not tick anything suggesting the app appeals to
children; that triggers the Families policy and a much stricter review.

**Ads** — No. **In-app purchases** — No.

---

## Step 6 — Digital Asset Links (the step that trips everyone up)

This is what removes the browser address bar from the top of your app. Skip it
and the app still installs and works — it just looks broken.

The catch: Play re-signs your app with **its own** key, so the fingerprint that
must be published is **not** your upload key.

1. Upload the AAB once (step 7 creates the release).
2. In Play Console: **Release → Setup → App integrity → App signing key
   certificate**, copy the **SHA-256** fingerprint.
3. Paste it into `public/.well-known/assetlinks.json`, replacing
   `REPLACE_WITH_PLAY_APP_SIGNING_SHA256`.
4. Also replace `REPLACE_WITH_UPLOAD_KEY_SHA256` with the upload-key fingerprint
   printed in the build workflow's summary, so sideloaded test builds verify too.
5. Commit and push, then confirm it's live:

```bash
curl https://q-bil.com/.well-known/assetlinks.json
```

Verification can take a few minutes to propagate after the app installs. If the
address bar is still showing, the fingerprint or the package name is wrong — those
are the only two causes.

---

## Step 7 — Closed testing: 12 testers, 14 days **(you)**

Only for personal accounts. This is the part people underestimate.

**Testing → Closed testing → Create release**, upload
`app-release-bundle.aab`, and add testers by email — either a Google Group or a
list of addresses.

The rules, precisely:

- **12 testers minimum**, each with a real Google account
- Each must **opt in** via your test link and **stay opted in for 14 consecutive
  days**
- Someone who opts out and back in **resets their own clock**
- Installing and actually opening the app is what Google wants to see

So: line up 12 people, send the opt-in link, and ask them not to leave the test.
Friends, family, colleagues all count. After 14 days, **Dashboard → Apply for
production access**.

Expect Google to take another few days to review that application.

---

## Step 8 — Go live **(you)**

Once production access is granted: **Production → Create release**, upload the
same AAB, write release notes, roll out.

First review typically takes a few days. After that you're live.

---

## Shipping updates afterwards

Two different things, and it's worth knowing which is which:

**Changing the app itself** — edit the code, push to `main`. GitHub Pages
redeploys and every user gets it on next launch. **No new AAB, no Play review.**
This covers almost everything.

**A new AAB** is only needed when you change the wrapper — app name, icon,
package, or the domain. Bump the version code, rerun the workflow, upload.

---

## Troubleshooting

**Browser address bar shows at the top of the app**
Asset links aren't verifying. Check `assetlinks.json` is reachable, the SHA-256
is Play's app-signing key (not the upload key), and `package_name` matches
`packageId` in `twa-manifest.json` exactly.

**Workflow fails: "twa-manifest.json still has placeholders"**
Run `npm run set-domain -- <your-domain>` and commit.

**Workflow fails while fetching the icon**
Your domain isn't serving `/icons/icon-512.png` yet. Finish step 1.

**Play rejects the version code**
It must be strictly greater than any code you've uploaded before, even for a
release that was later discarded.

**App shows a blank screen**
Almost always a stale service worker. Confirm the site works in a normal browser
first — the TWA has no separate cache.

---

## Regenerating store assets

```bash
npm run feature-graphic        # store-assets/feature-graphic.png
npm i --no-save playwright     # only needed for screenshots
npm run screenshots            # public/screenshots/*.png
```

Screenshots are captured from the real app with seeded Hebrew demo data
(`scripts/screenshots.mjs`), so they always match the current UI.

> The feature graphic writes its Hebrew tagline in **visual** (pre-reversed)
> order, because SVG rasterizers don't apply the bidi algorithm. If you edit that
> string, render it and check it reads correctly before shipping.
