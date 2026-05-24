import type { Receipt, AppSettings } from '../types'

export function generateReceiptHTML(receipt: Receipt, settings: AppSettings): string {
  const itemRows = receipt.items
    .map(
      item => `
      <tr>
        <td>${item.desc}</td>
        <td class="center">${item.qty}</td>
        <td class="center">₪${item.price.toFixed(2)}</td>
        <td class="ltr">₪${(item.qty * item.price).toFixed(2)}</td>
      </tr>`
    )
    .join('')

  const discountRow =
    receipt.discount > 0
      ? `<tr class="discount-row"><td colspan="3">הנחה</td><td class="ltr">-₪${receipt.discount.toFixed(2)}</td></tr>`
      : ''

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>קבלה מספר ${receipt.id} — ${settings.bizName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, system-ui, sans-serif;
      direction: rtl;
      color: #111;
      background: #fff;
      padding: 32px 24px;
      max-width: 680px;
      margin: 0 auto;
    }
    .header { border-bottom: 1px solid #e0e0e0; padding-bottom: 20px; margin-bottom: 24px; }
    .biz-name { font-size: 26px; font-weight: 700; }
    .biz-sub { font-size: 12px; color: #888; margin-top: 4px; }
    .meta-box {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .meta-label { font-size: 11px; color: #888; margin-bottom: 2px; }
    .meta-value { font-size: 14px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead tr { background: #1a1a1a; color: #fff; }
    thead th { padding: 9px 12px; font-size: 13px; font-weight: 600; text-align: right; }
    thead th.center { text-align: center; }
    thead th.ltr { text-align: left; }
    tbody tr:nth-child(even) { background: #f9f9f9; }
    tbody td { padding: 9px 12px; font-size: 13px; border-bottom: 1px solid #eee; text-align: right; }
    td.center { text-align: center; }
    td.ltr { text-align: left; }
    .discount-row td { color: #b42020; }
    .totals { text-align: left; border-top: 2px solid #222; padding-top: 12px; margin-top: 4px; }
    .total-line { font-size: 20px; font-weight: 700; }
    .subtotal-line { font-size: 13px; color: #555; margin-bottom: 6px; }
    .notes { margin-top: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 12px; }
    .footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 12px; text-align: center; font-size: 11px; color: #aaa; }

    /* Screen-only elements */
    .no-print {
      text-align: center;
      padding: 16px 0 28px;
    }
    .hint {
      font-size: 13px;
      color: #666;
      font-family: Arial, sans-serif;
      margin-bottom: 10px;
    }
    .print-btn {
      display: inline-block;
      padding: 12px 32px;
      background: #1D9E75;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      font-family: Arial, sans-serif;
    }
    .print-btn:hover { background: #178a65; }

    @media print {
      .no-print { display: none !important; }
      body { padding: 0; margin: 0; }
      @page {
        size: A4;
        margin: 15mm 20mm;
      }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <p class="hint">בחר "שמור כ-PDF" בחלון ההדפסה, ואז חזור לאפליקציה לשליחה</p>
    <button class="print-btn" onclick="window.print()">שמור / הדפס כ-PDF ⬇️</button>
  </div>

  <div class="header">
    <div class="biz-name">${settings.bizName}</div>
    <div class="biz-sub">${settings.ownerName} · עוסק פטור</div>
    ${settings.phone ? `<div class="biz-sub">${settings.phone}</div>` : ''}
    ${settings.email ? `<div class="biz-sub">${settings.email}</div>` : ''}
    ${settings.address ? `<div class="biz-sub">${settings.address}</div>` : ''}
  </div>

  <div class="meta-box">
    <div>
      <div class="meta-label">לקוח</div>
      <div class="meta-value">${receipt.clientName || '—'}</div>
      ${receipt.clientEmail ? `<div class="biz-sub" style="margin-top:4px">${receipt.clientEmail}</div>` : ''}
      ${receipt.clientPhone ? `<div class="biz-sub">${receipt.clientPhone}</div>` : ''}
    </div>
    <div style="text-align:left; min-width:120px">
      <div class="meta-label">קבלה מספר</div>
      <div class="meta-value">${receipt.id}</div>
      <div class="meta-label" style="margin-top:6px">תאריך</div>
      <div class="meta-value">${receipt.date}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>תיאור</th>
        <th class="center">כמות</th>
        <th class="center">מחיר יחידה</th>
        <th class="ltr">סה״כ</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      ${discountRow}
    </tbody>
  </table>

  <div class="totals">
    ${receipt.discount > 0 ? `<div class="subtotal-line">סכום ביניים: ₪${receipt.subtotal.toFixed(2)}</div>` : ''}
    <div class="total-line">סה״כ לתשלום: ₪${receipt.total.toFixed(2)}</div>
  </div>

  ${receipt.notes ? `<div class="notes"><strong>הערות:</strong> ${receipt.notes}</div>` : ''}

  <div class="footer">קבלה זו הופקה על ידי ${settings.bizName}</div>

  <script>
    window.onload = function () {
      setTimeout(function () { window.print() }, 500)
    }
  </script>
</body>
</html>`
}

export function openReceiptWindow(receipt: Receipt, settings: AppSettings): void {
  const html = generateReceiptHTML(receipt, settings)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (!win) {
    alert('אנא אפשר חלונות קופצים כדי לפתוח את הקבלה')
  }
}
