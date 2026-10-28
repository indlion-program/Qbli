# Publishing Qbli to Google Play

A step-by-step guide. Steps marked **(you)** need your Google account or a
purchase and can't be automated.

The Android app is a **TWA** — a thin native wrapper that displays the existing
PWA full-screen with no browser bar. There is no second codebase: whatever
GitHub Pages serves is what the app shows, so shipping a web change ships an app
change, with no Play review.

**Realistic timeline: 2–4 weeks**, almost all of it waiting on Google. The long
pole is organization account verification against your D-U-N-S record; because
that route is exempt from closed testing, there is no 14-day tester period on top.
Start step 2 today — everything else can be prepared while it runs.

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

## Step 2 — Create a Play Console **organization** account **(you)**

<https://play.google.com/console> — **$25, one time, forever.**

Choose **Organization**, not Personal. **This choice cannot be changed later.**

The reason it matters: organization accounts verified with a D-U-N-S number are
**exempt from the 12-testers-for-14-days closed test**. You go straight to
production once the listing is complete. Personal accounts created after
13 Nov 2023 are not exempt.

### What you'll need

- Your **D-U-N-S number**
- **Legal business name and address, exactly as they appear on your Dun &
  Bradstreet record**
- A business website — `https://q-bil.com` serves
- Contact email and phone number

> **The single most common rejection cause** is the business name or address not
> matching the D&B record — an abbreviation, a former address, a different
> spelling. Google verifies against that record directly. Look up your own entry
> on the D&B site and copy the name and address from it verbatim rather than
> typing them from memory. Each rejection costs another review cycle.

### Sign up with an address on your own domain

Play Console warns if you register with a personal Gmail, and recommends an
address on the organization's domain to cut down verification steps. It is a
**recommendation, not a requirement** — an organization account needs a verified
email *and* phone plus D-U-N-S verification either way.

Worth doing anyway, and free. It also keeps a personal address off the public
store listing.

**1. Cloudflare Email Routing (free)**

Cloudflare → **q-bil.com** → **Email** → **Email Routing** → *Get started*.

- Accept when it offers to add the DNS records for you (three MX plus a TXT/SPF)
- Create `admin@q-bil.com`, destination: your personal Gmail
- Confirm the destination from the email Cloudflare sends, then enable routing

This does **not** disturb the website. Email Routing adds MX and TXT records; the
A records pointing the domain at GitHub Pages are untouched.

Send a test message to `admin@q-bil.com` and confirm it arrives before continuing
— the next step depends on receiving a code there.

> Email Routing **receives only**. You cannot send *from* that address through it.
> That is enough for Play verification; sending would need an SMTP provider.

**2. Create a Google Account on that address**

<https://accounts.google.com/signup>

- Choose the **personal** option — **not** "for my work or business", which
  forces a paid Google Workspace subscription
- On the address screen choose **"Use your existing email"** (some screens word it
  *"Use my current email address instead"*)
- Enter `admin@q-bil.com`; the verification code arrives via the forwarding above

If the address comes back as already taken, a Google Account exists for it — sign
in and use password recovery rather than creating another.

Then sign in to Play Console **as that account** before registering.

### Timing

Expect **2–4 weeks** for organization verification. Nothing else in Play unlocks
until it clears, so start this first and let it run while everything else is
prepared.

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

**You don't need paid file storage.** `keystore.b64` is plain text, about 3,500
characters, so any free password manager's secure note holds it.

**Bitwarden (free):** new item → **Secure Note** → name it
`Qbli Android signing key` → paste in:

- the entire contents of `keystore.b64`
- the keystore password and key password
- the key alias (`qbli`)
- the package ID (`com.qbil.app`)

To turn that text back into a usable file: `base64 -d keystore.b64 > android.keystore`

(1Password, ~$3/month, stores the `.jks` directly as a Document if you prefer
keeping the binary — but it isn't necessary.)

Then put a **second copy somewhere offline** — an encrypted USB stick, or a
printed base64 dump in a drawer. Two copies in two places. A single cloud account
you could be locked out of is one copy.

> **GitHub Secrets is not a backup.** Secrets are write-only — you cannot read
> them back out. If that's your only copy, it's already gone.

Never email it to yourself, never put it in plain Drive/Dropbox, never commit it.
`.gitignore` already blocks `*.keystore`, `*.jks` and `*.p12`.

### If the keystore artifact already expired

The artifact from **Generate Signing Keystore** only lasts a day. If it's gone and
GitHub Secrets is now your only copy, run **Actions → Export Signing Keystore
(backup)** and type `export`. That hands back the **existing** key, verifies the
stored password actually opens it, and reports the fingerprint.

Do not run *Generate Signing Keystore* again for this — it creates a **different**
key, which cannot update an app published with the old one.

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

## Step 7 — Closed testing **(not required here)**

**This step does not apply to this project.** Organization accounts verified with
a D-U-N-S number are exempt from the 12-testers-for-14-days closed test, so you
can publish straight to production.

Kept here only so the requirement isn't a surprise if the account type ever
changes: a personal account created after 13 Nov 2023 must run a closed test with
**12 testers opted in continuously for 14 days** before it can apply for
production access. Testers opting out and back in reset their own clock.

If you want a trial run before going public anyway, an internal test
(**Testing → Internal testing**) is available with no tester minimum and no
waiting period — useful for checking the installed app behaves, particularly that
it opens with no browser address bar.

---

## Step 8 — Go live **(you)**

Once the organization account is verified and the listing is complete:
**Production → Create release**, upload `app-release-bundle.aab`, write release
notes, roll out.

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
