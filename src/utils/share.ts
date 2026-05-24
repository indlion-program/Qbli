import type { Receipt, AppSettings } from '../types'
import { generateReceiptPDFBlob } from './pdf'

export function buildReceiptText(receipt: Receipt, settings: AppSettings): string {
  return (
    `קבלה מספר ${receipt.id} מ-${settings.bizName}\n` +
    `תאריך: ${receipt.date}\n\n` +
    receipt.items
      .map(i => `• ${i.desc} × ${i.qty}   ₪${(i.qty * i.price).toFixed(2)}`)
      .join('\n') +
    (receipt.discount > 0 ? `\n• הנחה: -₪${receipt.discount.toFixed(2)}` : '') +
    `\n\nסה"כ לתשלום: ₪${receipt.total.toFixed(2)}\n` +
    `${settings.ownerName} · ${settings.bizName}` +
    (settings.phone ? ` · ${settings.phone}` : '')
  )
}

export function buildMailtoLink(receipt: Receipt, settings: AppSettings): string {
  const subject = encodeURIComponent(`קבלה מספר ${receipt.id} - ${settings.bizName}`)
  const body = encodeURIComponent(
    `שלום ${receipt.clientName},\n\n` + buildReceiptText(receipt, settings)
  )
  return `mailto:${receipt.clientEmail}?subject=${subject}&body=${body}`
}

/**
 * Must be called directly from a click handler (user gesture required).
 * Opens the OS mail app with receipt details pre-filled.
 */
export function shareByEmail(receipt: Receipt, settings: AppSettings): void {
  const a = document.createElement('a')
  a.href = buildMailtoLink(receipt, settings)
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * Must be called directly from a click handler.
 * On Android/iOS generates a PDF and opens the native share sheet with the file attached.
 * Falls back to mailto on desktop.
 */
export async function shareByNative(receipt: Receipt, settings: AppSettings): Promise<void> {
  try {
    const blob = await generateReceiptPDFBlob(receipt, settings)
    const file = new File([blob], `receipt-${receipt.id}.pdf`, { type: 'application/pdf' })
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `קבלה מספר ${receipt.id} — ${settings.bizName}`,
        text: buildReceiptText(receipt, settings),
      })
      return
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return
    // PDF generation or share failed — fall through to mailto
  }
  shareByEmail(receipt, settings)
}

/**
 * Must be called directly from a click handler.
 */
export function shareByWhatsApp(receipt: Receipt): void {
  const text = encodeURIComponent(
    `שלום ${receipt.clientName} 👋\n` +
    `קבלה מספר ${receipt.id}\n` +
    `תאריך: ${receipt.date}\n\n` +
    receipt.items
      .map(i => `• ${i.desc} × ${i.qty} — ₪${(i.qty * i.price).toFixed(2)}`)
      .join('\n') +
    (receipt.discount > 0 ? `\n• הנחה: -₪${receipt.discount.toFixed(2)}` : '') +
    `\n\n*סה"כ לתשלום: ₪${receipt.total.toFixed(2)}*`
  )

  let phone = ''
  if (receipt.clientPhone) {
    phone = receipt.clientPhone.replace(/\D/g, '')
    if (phone.startsWith('0')) phone = '972' + phone.slice(1)
  }

  window.open(`https://wa.me/${phone}?text=${text}`, '_blank')
}
