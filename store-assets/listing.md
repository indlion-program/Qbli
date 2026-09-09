# Google Play listing copy

Paste these into Play Console → **Grow → Store presence → Main store listing**.

Set **Hebrew (עברית)** as the default language and add English (US) as a second
translation. Character limits are enforced by the Console.

---

## Hebrew — עברית (default)

**App name** (max 30)

```
Qbli — קבלות לעסקים קטנים
```
*25 characters.*

**Short description** (max 80)

```
צרו ושלחו קבלות בעברית תוך שניות. עובד גם בלי אינטרנט, בלי הרשמה, בחינם.
```
*71 characters.*

**Full description** (max 4000)

```
Qbli הוא יישום פשוט ליצירת קבלות לעסקים קטנים, פרילנסרים ובעלי מקצוע בישראל.

בלי הרשמה. בלי חשבון. בלי מנוי. פותחים ומתחילים לעבוד.

■ יצירת קבלה בשניות
בוחרים לקוח, מוסיפים פריטים מתוך קטלוג השירותים שלכם, מוסיפים הנחה אם צריך — והקבלה מוכנה. מספור הקבלות מתקדם אוטומטית.

■ שליחה בוואטסאפ, במייל או כ-PDF
שולחים ללקוח ישירות מהאפליקציה בלחיצה אחת, עם קובץ PDF מעוצב בעברית.

■ ניהול לקוחות
כל הלקוחות במקום אחד, עם סך התשלומים ומספר הקבלות של כל אחד. חיפוש מהיר לפי שם.

■ דוחות הכנסה
מעקב חודשי, שנתי ומצטבר. גרף הכנסות, ממוצע לקבלה, וייצוא לקובץ CSV לרואה החשבון.

■ עובד גם בלי אינטרנט
כל האפליקציה עובדת אופליין. יצרתם קבלה בשטח בלי קליטה? היא נשמרת ונשלחת כשתחזרו לרשת.

■ הנתונים נשארים אצלכם
פרטי העסק, הלקוחות והקבלות נשמרים במכשיר שלכם בלבד — לא בשרת שלנו. אפשר לייצא גיבוי מלא בכל רגע ולשחזר אותו במכשיר אחר.

■ בעברית מלאה
ממשק בעברית עם תמיכה מלאה בכיוון RTL, שקלים, ותאריכים בפורמט ישראלי. אפשר להחליף לאנגלית בהגדרות.

■ מותאם לדרישות בישראל
מספור קבלות רץ ועוקב, כפי שנדרש. באונבורדינג תוכלו להגדיר את מספר הקבלה ההתחלתי שלכם.

חשוב לדעת: Qbli הוא כלי לניהול ותיעוד קבלות. הוא אינו תוכנה מאושרת להפקת חשבוניות מס ואינו מהווה ייעוץ מס. באחריותכם לוודא התאמה לדרישות רשות המסים ולשמור גיבויים.

האפליקציה חינמית לחלוטין, ללא פרסומות וללא רכישות מתוך האפליקציה.
```

---

## English (US)

**App name** (max 30)

```
Qbli — Receipts for Business
```
*28 characters.*

**Short description** (max 80)

```
Create and send professional receipts in seconds. Works offline. No account.
```
*75 characters.*

**Full description** (max 4000)

```
Qbli is a simple receipt app for small businesses, freelancers and independent professionals in Israel.

No sign-up. No account. No subscription. Open it and start working.

■ Create a receipt in seconds
Pick a client, add items from your saved service catalogue, apply a discount if needed — done. Receipt numbers increment automatically.

■ Send by WhatsApp, email or PDF
Send straight to your client in one tap, with a cleanly formatted Hebrew PDF attached.

■ Manage clients
All your clients in one place, each with their total paid and receipt count. Fast search by name.

■ Income reports
Monthly, yearly and all-time views. Income chart, average receipt value, and CSV export for your accountant.

■ Works offline
The whole app works without a connection. Created a receipt on site with no signal? It's saved, and sends when you're back online.

■ Your data stays yours
Your business details, clients and receipts are stored only on your device — not on our servers. Export a full backup any time and restore it on another device.

■ Built for Hebrew
Full right-to-left Hebrew interface, shekel amounts and Israeli date formats. Switch to English in Settings.

■ Sequential numbering
Receipt numbers run in strict sequence, and you can set your starting number during onboarding.

Please note: Qbli is a tool for creating and tracking receipts. It is not certified tax-invoicing software and does not constitute tax advice. You remain responsible for compliance with your tax authority's requirements and for keeping backups.

Completely free — no ads, no in-app purchases.
```

---

## Graphics checklist

| Asset | Requirement | File |
|---|---|---|
| App icon | 512×512 PNG, 32-bit | `public/icons/icon-512.png` |
| Feature graphic | 1024×500 PNG/JPEG, no alpha | `store-assets/feature-graphic.png` |
| Phone screenshots | 2–8, 9:16, 320–3840px per side | `public/screenshots/*.png` (4 at 1080×1920) |

Regenerate with `npm run feature-graphic` and `npm run screenshots`.

## Other listing fields

- **App category:** Business (Finance is also defensible; Business fits better)
- **Tags:** receipts, invoicing, small business, bookkeeping
- **Contact email:** the address used in `public/privacy.html`
- **Privacy policy URL:** `https://q-bil.com/privacy.html`
- **Ads:** No
- **In-app purchases:** No
